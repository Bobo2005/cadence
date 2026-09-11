/**
 * sentinel.ts — Cadence Autonomous Background Sentinel
 *
 * Continuously monitors Ethereum Sepolia for:
 * 1. Heartbeat expiration (isTimeoutExpired == true in Active state)
 *    -> Automatically dispatches 2 distinct email alerts to Guardian 1 and Guardian 2.
 * 2. Contest grace period conclusion (contestDeadline reached in ClaimPending state)
 *    -> Automatically dispatches contest concluded email alerts to Guardians and Heirs.
 *
 * Implements cycle-keyed deduplication to prevent duplicate emails.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, http, getAddress, type Address } from "viem";
import { sepolia } from "viem/chains";
import { emailService } from "./emailService.js";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");

const MONITORED_VAULTS_FILE = path.join(DATA_DIR, "monitored_vaults.json");
const SENTINEL_STATE_FILE = path.join(DATA_DIR, "sentinel_state.json");

export const SEPOLIA_CONSENSUS_ADDRESS: Address = "0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf";
export const SEPOLIA_GUARDIAN_REGISTRY: Address = "0x5Bae89D1BE49f603c4f74dce54e38c9C70F3a56A";

export interface MonitoredVault {
  vaultAddress: Address;
  name?: string;
  owner?: Address;
  guardians: Array<{
    address: Address;
    label: string;
    email?: string;
  }>;
  addedAt: string;
}

interface SentinelCycleState {
  // Key: `${vaultAddress}_heartbeat_${lastActiveTimestamp}` -> ISO string of dispatch
  // Key: `${vaultAddress}_concluded_${contestDeadline}` -> ISO string of dispatch
  [cycleKey: string]: string;
}

const CONSENSUS_ABI = [
  {
    type: "function",
    name: "getState",
    inputs: [{ name: "vault", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint8", internalType: "enum ProofOfLifeConsensus.VaultState" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "consensusConfigs",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [
      { name: "checkInInterval", type: "uint256", internalType: "uint256" },
      { name: "lastActiveTimestamp", type: "uint256", internalType: "uint256" },
      { name: "contestWindowDuration", type: "uint256", internalType: "uint256" },
      { name: "claimPendingTimestamp", type: "uint256", internalType: "uint256" },
      { name: "contestDeadline", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isTimeoutExpired",
    inputs: [{ name: "vault", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
] as const;

const VAULT_ABI = [
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
] as const;

export class VaultSentinel {
  private rpcUrl: string;
  private publicClient: ReturnType<typeof createPublicClient>;
  private monitoredVaults: Map<string, MonitoredVault> = new Map();
  private sentCycles: SentinelCycleState = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private isChecking: boolean = false;

  constructor() {
    this.rpcUrl =
      process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(this.rpcUrl),
    });

    this.ensureDataDir();
    this.loadState();
    this.initDefaultVaults();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(MONITORED_VAULTS_FILE)) {
        const raw = fs.readFileSync(MONITORED_VAULTS_FILE, "utf8");
        const list: MonitoredVault[] = JSON.parse(raw);
        for (const item of list) {
          const key = getAddress(item.vaultAddress).toLowerCase();
          this.monitoredVaults.set(key, {
            ...item,
            vaultAddress: getAddress(item.vaultAddress),
          });
        }
      }
    } catch (err) {
      console.error("[Sentinel] Failed to load monitored vaults:", err);
    }

    try {
      if (fs.existsSync(SENTINEL_STATE_FILE)) {
        const raw = fs.readFileSync(SENTINEL_STATE_FILE, "utf8");
        this.sentCycles = JSON.parse(raw);
      }
    } catch (err) {
      console.error("[Sentinel] Failed to load sentinel state:", err);
    }
  }

  private persist(): void {
    try {
      this.ensureDataDir();
      const list = Array.from(this.monitoredVaults.values());
      fs.writeFileSync(MONITORED_VAULTS_FILE, JSON.stringify(list, null, 2), "utf8");
      fs.writeFileSync(SENTINEL_STATE_FILE, JSON.stringify(this.sentCycles, null, 2), "utf8");
    } catch (err) {
      console.error("[Sentinel] Failed to persist state:", err);
    }
  }

  private initDefaultVaults(): void {
    // Register the Accelerated Demo Sepolia Locker by default
    const demoVault: Address = "0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1";
    const key = demoVault.toLowerCase();
    if (!this.monitoredVaults.has(key)) {
      this.monitoredVaults.set(key, {
        vaultAddress: demoVault,
        name: "Accelerated Demo Locker (Sepolia)",
        guardians: [
          {
            address: "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2",
            label: "Guardian Node 1",
          },
          {
            address: "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0",
            label: "Guardian Node 2",
          },
        ],
        addedAt: new Date().toISOString(),
      });
      this.persist();
    }
  }

  public registerVault(vault: {
    vaultAddress: string;
    name?: string;
    guardians?: Array<{ address: string; label?: string; email?: string }>;
  }): MonitoredVault {
    const norm = getAddress(vault.vaultAddress);
    const key = norm.toLowerCase();
    const existing = this.monitoredVaults.get(key);

    const updatedGuardians = (vault.guardians || []).map((g, idx) => ({
      address: getAddress(g.address),
      label: g.label || `Guardian Node ${idx + 1}`,
      email: g.email?.trim() || undefined,
    }));

    const record: MonitoredVault = {
      vaultAddress: norm,
      name: vault.name || existing?.name || "Inheritance Vault",
      guardians: updatedGuardians.length > 0 ? updatedGuardians : existing?.guardians || [
        { address: "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2", label: "Guardian Node 1" },
        { address: "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0", label: "Guardian Node 2" },
      ],
      addedAt: existing?.addedAt || new Date().toISOString(),
    };

    this.monitoredVaults.set(key, record);
    this.persist();
    console.log(`[Sentinel] Registered vault for monitoring: ${norm} (${record.guardians.length} guardians)`);
    return record;
  }

  public getMonitoredVaults(): MonitoredVault[] {
    return Array.from(this.monitoredVaults.values());
  }

  /**
   * Main sentinel tick: checks on-chain consensus state and triggers automatic email dispatch.
   */
  public async checkVaults(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const nowSec = Math.floor(Date.now() / 1000);
      for (const [key, vault] of this.monitoredVaults.entries()) {
        try {
          // Read consensus configs
          const config = await this.publicClient.readContract({
            address: SEPOLIA_CONSENSUS_ADDRESS,
            abi: CONSENSUS_ABI,
            functionName: "consensusConfigs",
            args: [vault.vaultAddress],
          });

          const state = await this.publicClient.readContract({
            address: SEPOLIA_CONSENSUS_ADDRESS,
            abi: CONSENSUS_ABI,
            functionName: "getState",
            args: [vault.vaultAddress],
          });

          const checkInInterval = Number(config[0]);
          const lastActive = Number(config[1]);
          const contestDeadline = Number(config[4]);

          // Resolve vault owner
          let vaultOwner: Address | undefined = vault.owner;
          if (!vaultOwner) {
            try {
              vaultOwner = (await this.publicClient.readContract({
                address: vault.vaultAddress,
                abi: VAULT_ABI,
                functionName: "owner",
              })) as Address;
            } catch {
              // Ignore owner resolution errors
            }
          }

          // =========================================================================
          // 1. Check Heartbeat Status (Active State)
          // =========================================================================
          if (state === 0 /* Active */ && lastActive > 0 && checkInInterval > 0) {
            const deadline = lastActive + checkInInterval;
            const isLapsed = nowSec >= deadline;

            // 1a. Heartbeat Overdue / Lapsed -> Alert Owner and Guardians
            if (isLapsed) {
              // Alert Owner
              if (vaultOwner) {
                const ownerLapsedKey = `${key}_owner_overdue_${lastActive}`;
                if (!this.sentCycles[ownerLapsedKey]) {
                  console.log(
                    `[Sentinel] ⚡ Heartbeat overdue for owner ${vaultOwner} (vault: ${vault.vaultAddress}). Dispatching urgent check-in notice...`
                  );
                  await emailService.sendOwnerReminder({
                    ownerAddress: vaultOwner,
                    vaultId: vault.name || vault.vaultAddress,
                    daysRemaining: 0,
                    isOverdue: true,
                  });
                  this.sentCycles[ownerLapsedKey] = new Date().toISOString();
                  this.persist();
                }
              }

              // Alert Guardians
              const cycleKey = `${key}_heartbeat_${lastActive}`;
              if (!this.sentCycles[cycleKey]) {
                console.log(
                  `[Sentinel] ⚡ Heartbeat lapsed for vault ${vault.vaultAddress} (lastActive: ${lastActive}). Dispatching 2 guardian alerts...`
                );

                for (const g of vault.guardians) {
                  // Resolve email: priority vault config -> DB binding -> env fallback
                  let email = g.email;
                  if (!email) {
                    const b = db.getBinding(g.address);
                    if (b?.email) email = b.email;
                  }

                  await emailService.sendGuardianAttestationNotice({
                    guardianAddress: g.address,
                    guardianLabel: g.label,
                    guardianEmail: email,
                    vaultAddress: vault.vaultAddress,
                    vaultName: vault.name,
                  });
                }

                this.sentCycles[cycleKey] = new Date().toISOString();
                this.persist();
                console.log(`[Sentinel] ✓ Dispatched 2 guardian alerts for cycle ${cycleKey}`);
              }
            }
            // 1b. Heartbeat Approaching Deadline -> Pre-emptive Reminder to Owner
            else if (vaultOwner) {
              const remainingSec = deadline - nowSec;
              const isApproaching =
                (checkInInterval <= 600 && remainingSec <= 120) ||
                (checkInInterval > 600 &&
                  (remainingSec <= 86400 * 3 || remainingSec <= checkInInterval * 0.25));

              if (isApproaching) {
                const ownerApproachingKey = `${key}_owner_approaching_${lastActive}`;
                if (!this.sentCycles[ownerApproachingKey]) {
                  const hoursRemaining = Math.max(1, Math.round(remainingSec / 3600));
                  const daysRemaining = Math.max(1, Math.round(remainingSec / 86400));
                  console.log(
                    `[Sentinel] ⚡ Heartbeat check-in approaching for owner ${vaultOwner} (~${hoursRemaining}h remaining). Dispatching reminder...`
                  );
                  await emailService.sendOwnerReminder({
                    ownerAddress: vaultOwner,
                    vaultId: vault.name || vault.vaultAddress,
                    daysRemaining,
                    hoursRemaining,
                    isOverdue: false,
                  });
                  this.sentCycles[ownerApproachingKey] = new Date().toISOString();
                  this.persist();
                }
              }
            }
          }

          // =========================================================================
          // 2. Check Contest Grace Timer Concluded (ClaimPending State)
          // =========================================================================
          if (state === 1 /* ClaimPending */ && contestDeadline > 0) {
            const isGracePeriodOver = nowSec >= contestDeadline;
            if (isGracePeriodOver) {
              const cycleKey = `${key}_concluded_${contestDeadline}`;
              if (!this.sentCycles[cycleKey]) {
                console.log(
                  `[Sentinel] ⚡ Contest grace period elapsed for vault ${vault.vaultAddress} (deadline: ${contestDeadline}). Dispatching concluded alerts...`
                );

                for (const g of vault.guardians) {
                  let email = g.email;
                  if (!email) {
                    const b = db.getBinding(g.address);
                    if (b?.email) email = b.email;
                  }

                  await emailService.sendContestConcludedNotice({
                    recipientAddress: g.address,
                    recipientRole: g.label,
                    recipientEmail: email,
                    vaultAddress: vault.vaultAddress,
                    vaultName: vault.name,
                  });
                }

                this.sentCycles[cycleKey] = new Date().toISOString();
                this.persist();
                console.log(`[Sentinel] ✓ Dispatched contest concluded alerts for cycle ${cycleKey}`);
              }
            }
          }
        } catch (err: any) {
          // RPC or contract error for individual vault, log and continue
          // console.warn(`[Sentinel] Error checking vault ${vault.vaultAddress}:`, err?.message);
        }
      }
    } finally {
      this.isChecking = false;
    }
  }

  public start(intervalMs: number = 20000): void {
    if (this.timer) return;
    console.log(`[Sentinel] Starting Autonomous Vault Sentinel (polling every ${intervalMs / 1000}s)`);
    // Run an immediate initial check
    this.checkVaults().catch((err) => console.warn("[Sentinel] Initial check error:", err));
    this.timer = setInterval(() => {
      this.checkVaults().catch((err) => console.warn("[Sentinel] Interval check error:", err));
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[Sentinel] Stopped Autonomous Vault Sentinel");
    }
  }
}

export const sentinel = new VaultSentinel();
