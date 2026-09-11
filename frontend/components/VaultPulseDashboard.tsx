"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { type Address, formatEther, isAddressEqual, getAddress } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import {
  CONTRACT_ADDRESSES,
  publicClient,
  INHERITANCE_VAULT_ABI,
  GUARDIAN_REGISTRY_ABI,
  ConsensusState,
} from "../lib/contracts.ts";
import { type VaultRoleMatch } from "../hooks/useUserRole";
import CheckInButton from "./CheckInButton";
import LiveECGMonitor from "./ui/LiveECGMonitor";
import DashboardEmptyState from "./DashboardEmptyState";
import { getWalletNotificationStatus, requestSignatureAndBind } from "../lib/notifications";
import { getRegisteredVaults } from "../lib/vaultRegistry";
import { useToast } from "./ui/Toast";

interface VaultPulseDashboardProps {
  initialVaultAddress?: Address;
  vaultId?: string;
  ownedVaults?: VaultRoleMatch[];
  onSelectVault?: (address: Address) => void;
}

export type EmailBindingStatus = "not_set" | "pending_signature" | "verified";

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [user, domain] = parts;
  const maskedUser = user.length <= 2 ? user[0] + "***" : user[0] + "***" + user[user.length - 1];
  return `${maskedUser}@${domain}`;
}

interface GuardianDisplayInfo {
  address: Address;
  label: string;
  attested: boolean;
}

const INTERVAL_PRESETS = [
  { label: "5 Min (Test)", display: "5 Minutes", seconds: 300, isTest: true, desc: "Rapid heartbeat testing (300s)" },
  { label: "10 Min (Test)", display: "10 Minutes", seconds: 600, isTest: true, desc: "Short inactivity testing (600s)" },
  { label: "30 Days", display: "30 Days", seconds: 30 * 86400, isTest: false, desc: "Active / Frequent check-in" },
  { label: "60 Days", display: "60 Days", seconds: 60 * 86400, isTest: false, desc: "Standard personal vault" },
  { label: "90 Days", display: "90 Days", seconds: 90 * 86400, isTest: false, desc: "Recommended Cadence default" },
  { label: "180 Days", display: "180 Days", seconds: 180 * 86400, isTest: false, desc: "Long-term cold storage" },
];

export default function VaultPulseDashboard({
  initialVaultAddress,
  vaultId,
  ownedVaults = [],
  onSelectVault,
}: VaultPulseDashboardProps) {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { showToast } = useToast();
  const [vaultDropdownOpen, setVaultDropdownOpen] = useState(false);
  const vaultDropdownRef = useRef<HTMLDivElement>(null);

  // Active vault selection
  const defaultAddress = initialVaultAddress || (vaultId as Address) || ownedVaults[0]?.vaultAddress;
  const [activeVaultAddress, setActiveVaultAddress] = useState<Address | undefined>(defaultAddress);

  // Sync active address if props update
  useEffect(() => {
    if (initialVaultAddress) {
      setActiveVaultAddress(initialVaultAddress);
    } else if (vaultId) {
      setActiveVaultAddress(vaultId as Address);
    } else if (ownedVaults.length > 0 && !activeVaultAddress) {
      setActiveVaultAddress(ownedVaults[0].vaultAddress);
    }
  }, [initialVaultAddress, vaultId, ownedVaults, activeVaultAddress]);

  // Sync active vault when Judge Mode toggle fires
  useEffect(() => {
    const handleVaultChange = (e: Event) => {
      const customEvent = e as CustomEvent<"standard" | "demo">;
      if (customEvent.detail === "demo") {
        setActiveVaultAddress(CONTRACT_ADDRESSES.demoVault);
      } else if (customEvent.detail === "standard") {
        setActiveVaultAddress(CONTRACT_ADDRESSES.vault);
      }
    };
    window.addEventListener("cadence_vault_changed", handleVaultChange);
    return () => window.removeEventListener("cadence_vault_changed", handleVaultChange);
  }, []);

  // Live on-chain vault state
  const [isLoadingOnChain, setIsLoadingOnChain] = useState<boolean>(true);
  const [ethBalance, setEthBalance] = useState<string>("0.00");
  const [checkInIntervalSec, setCheckInIntervalSec] = useState<number>(7776000); // 90d default
  const [lastActiveTimestamp, setLastActiveTimestamp] = useState<number>(0);
  const [consensusState, setConsensusState] = useState<number>(ConsensusState.Active);
  const [isPrivateBalance, setIsPrivateBalance] = useState(false);
  const [guardiansList, setGuardiansList] = useState<GuardianDisplayInfo[]>([]);
  const [guardianThreshold, setGuardianThreshold] = useState<number>(0);
  const [guardianTotal, setGuardianTotal] = useState<number>(0);

  // Local ticker countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Email Notification Binding state
  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailBindingStatus>("not_set");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSigningEmail, setIsSigningEmail] = useState(false);

  // Interval testing modal state
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [isUpdatingInterval, setIsUpdatingInterval] = useState(false);
  const [intervalStatusMsg, setIntervalStatusMsg] = useState<string | null>(null);

  const handleUpdateInterval = async (newSeconds: number) => {
    if (!walletClient || !activeVaultAddress || !connectedAddress) {
      showToast("Please connect the owner wallet to update interval.", "warning");
      return;
    }
    setIsUpdatingInterval(true);
    setIntervalStatusMsg("Submitting transaction to Sepolia...");
    try {
      const hash = await walletClient.writeContract({
        address: activeVaultAddress,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "setCheckInInterval",
        args: [BigInt(newSeconds)],
        account: connectedAddress,
      });
      setIntervalStatusMsg("Waiting for block confirmation on Sepolia...");
      await publicClient.waitForTransactionReceipt({ hash });
      setIntervalStatusMsg("Interval successfully updated on-chain!");
      await fetchOnChainData(activeVaultAddress);
      setTimeout(() => {
        setShowIntervalModal(false);
        setIntervalStatusMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error("[VaultPulseDashboard] Failed to set check-in interval:", err);
      const msg = err?.shortMessage || err?.message || "Transaction failed";
      setIntervalStatusMsg(`Error: ${msg.slice(0, 100)}`);
    } finally {
      setIsUpdatingInterval(false);
    }
  };

  // Fetch real on-chain vault state
  const fetchOnChainData = useCallback(async (targetVault: Address) => {
    setIsLoadingOnChain(true);
    try {
      // 1. Balance
      const balanceWei = await publicClient.getBalance({ address: targetVault });
      const formattedBal = parseFloat(formatEther(balanceWei)).toFixed(4);
      setEthBalance(formattedBal);

      // 2. Inactivity interval
      const interval = await publicClient.readContract({
        address: targetVault,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "checkInInterval",
      });
      const intervalNum = Number(interval);
      setCheckInIntervalSec(intervalNum);

      // 3. Last Active Heartbeat timestamp
      const lastActive = await publicClient.readContract({
        address: targetVault,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "lastActiveTimestamp",
      });
      const lastActiveNum = Number(lastActive);
      setLastActiveTimestamp(lastActiveNum);

      // Compute immediate remaining seconds
      const nowSec = Math.floor(Date.now() / 1000);
      const deadline = lastActiveNum + intervalNum;
      setSecondsRemaining(Math.max(0, deadline - nowSec));

      // 4. Consensus state
      const state = await publicClient.readContract({
        address: targetVault,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "getConsensusState",
      });
      setConsensusState(Number(state));

      // 5. Guardian configuration & attestations
      // Check both standard and demo registry for guardian configuration
      let threshold = 0;
      let total = 0;
      let registryUsed = CONTRACT_ADDRESSES.guardianRegistry;

      const candidateRegistries = [
        CONTRACT_ADDRESSES.guardianRegistry,
        CONTRACT_ADDRESSES.demoGuardianRegistry,
      ];

      for (const reg of candidateRegistries) {
        try {
          const config = await publicClient.readContract({
            address: reg,
            abi: GUARDIAN_REGISTRY_ABI,
            functionName: "getGuardianConfig",
            args: [targetVault],
          });
          if (config) {
            const cfg = config as any;
            const t = Number(cfg.threshold ?? cfg[1] ?? 0);
            const tot = Number(cfg.totalGuardians ?? cfg[2] ?? 0);
            if (t > 0 || tot > 0) {
              threshold = t;
              total = tot;
              registryUsed = reg;
              break;
            }
          }
        } catch {
          // ignore error and try next
        }
      }

      setGuardianThreshold(threshold);
      setGuardianTotal(total);

      // Query configured or registered guardians for real attestation status
      const reg = getRegisteredVaults().find((v) => {
        try {
          return isAddressEqual(v.vaultAddress, targetVault);
        } catch {
          return v.vaultAddress.toLowerCase() === targetVault.toLowerCase();
        }
      });
      const candidateGuardians: Address[] = (reg?.guardians && reg.guardians.length > 0)
        ? reg.guardians
        : [];

      const guardianInfos: GuardianDisplayInfo[] = [];
      for (let i = 0; i < candidateGuardians.length; i++) {
        const gAddr = candidateGuardians[i];
        let hasAttested = false;
        try {
          hasAttested = await publicClient.readContract({
            address: registryUsed,
            abi: GUARDIAN_REGISTRY_ABI,
            functionName: "hasGuardianAttested",
            args: [targetVault, gAddr],
          });
        } catch {
          hasAttested = false;
        }

        guardianInfos.push({
          address: gAddr,
          label: `Guardian Node ${i + 1}`,
          attested: hasAttested,
        });
      }
      setGuardiansList(guardianInfos);
    } catch (err) {
      console.error("[VaultPulseDashboard] Error loading on-chain vault data:", err);
    } finally {
      setIsLoadingOnChain(false);
    }
  }, []);

  useEffect(() => {
    if (activeVaultAddress) {
      fetchOnChainData(activeVaultAddress);
    }
  }, [activeVaultAddress, fetchOnChainData]);

  // Live countdown ticker
  useEffect(() => {
    const tick = () => {
      if (lastActiveTimestamp > 0 && checkInIntervalSec > 0) {
        const nowSec = Math.floor(Date.now() / 1000);
        const deadline = lastActiveTimestamp + checkInIntervalSec;
        setSecondsRemaining(Math.max(0, deadline - nowSec));
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lastActiveTimestamp, checkInIntervalSec]);

  // Format countdown string
  const countdownFormatted = useMemo(() => {
    const days = Math.floor(secondsRemaining / 86400);
    const hours = Math.floor((secondsRemaining % 86400) / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    return {
      days: String(days).padStart(2, "0"),
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
    };
  }, [secondsRemaining]);

  // Check binding status from backend notification service
  useEffect(() => {
    let isMounted = true;
    if (connectedAddress) {
      getWalletNotificationStatus(connectedAddress)
        .then((status) => {
          if (!isMounted || !status) return;
          if (status.verified && status.email) {
            setEmailStatus("verified");
            setConfirmedEmail(status.email);
          } else if (status.pendingSuggestion) {
            setEmailStatus("pending_signature");
          }
        })
        .catch((err) => {
          console.warn("[Dashboard] Could not fetch email status:", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [connectedAddress]);

  // Wallet-signature email binding flow
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@") || !connectedAddress) return;

    setEmailStatus("pending_signature");
    setIsSigningEmail(true);

    try {
      const result = await requestSignatureAndBind(connectedAddress, emailInput);
      if (result.success && result.verified) {
        setEmailStatus("verified");
        setConfirmedEmail(result.binding?.email || emailInput);
        setIsEditingEmail(false);
        showToast("Email bound & verified successfully.", "success");
      } else {
        showToast(result.error || "Failed to verify signature for email binding.", "error");
        setEmailStatus("not_set");
      }
    } catch (err: unknown) {
      console.error("[Dashboard] Signature binding failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Wallet signature was declined or failed.", "error");
      setEmailStatus("not_set");
    } finally {
      setIsSigningEmail(false);
    }
  };

  const handleCheckInSuccess = () => {
    if (activeVaultAddress) {
      fetchOnChainData(activeVaultAddress);
    }
  };

  // If user has zero owned vaults and no active vault is present, show genuine Empty State
  if (!activeVaultAddress || ownedVaults.length === 0) {
    return <DashboardEmptyState />;
  }

  // Active vault details
  const currentVaultMatch = ownedVaults.find((v) =>
    isAddressEqual(v.vaultAddress, activeVaultAddress)
  );
  const currentVaultName = currentVaultMatch?.name || "Inheritance Locker";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-[#E8ECF1] font-sans">
      {/* Vault Switcher & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12161F] border border-[#232838] p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 flex items-center justify-center text-[#2EE6A8]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-mono text-[#8993A6] uppercase tracking-wider">
              Active Inheritance Locker
            </div>
            <div className="text-sm font-bold text-[#E8ECF1] flex items-center gap-2">
              <span>{currentVaultName}</span>
              <span className="font-mono text-xs text-[#8993A6]">
                ({activeVaultAddress.slice(0, 6)}...{activeVaultAddress.slice(-4)})
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Vault Switcher — custom styled dropdown replacing native <select> */}
        {ownedVaults.length > 1 && (
          <div className="flex items-center gap-2" ref={vaultDropdownRef}>
            <span className="text-xs text-[#8993A6] font-mono">Switch Locker:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setVaultDropdownOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={vaultDropdownOpen}
                aria-label="Switch active vault"
                className="flex items-center gap-2 bg-[#0A0E14] border border-[#232838] hover:border-[#2EE6A8]/40 text-[#E8ECF1] text-xs font-mono rounded-xl px-3 py-2 focus:outline-none focus:border-[#2EE6A8] cursor-pointer transition-all"
              >
                <span className="max-w-[140px] truncate">
                  {ownedVaults.find((v) =>
                    v.vaultAddress.toLowerCase() === activeVaultAddress?.toLowerCase()
                  )?.name || "Select vault"}
                </span>
                <svg className={`w-3 h-3 text-[#8993A6] transition-transform ${vaultDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {vaultDropdownOpen && (
                <ul
                  role="listbox"
                  className="absolute top-full left-0 mt-1.5 w-56 bg-[#12161F] border border-[#232838] rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  {ownedVaults.map((v) => {
                    const isSelected = v.vaultAddress.toLowerCase() === activeVaultAddress?.toLowerCase();
                    return (
                      <li
                        key={v.vaultAddress}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          const nextAddr = getAddress(v.vaultAddress);
                          setActiveVaultAddress(nextAddr);
                          if (onSelectVault) onSelectVault(nextAddr);
                          setVaultDropdownOpen(false);
                        }}
                        className={`px-3 py-2.5 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? "text-[#2EE6A8] bg-[#2EE6A8]/10"
                            : "text-[#E8ECF1] hover:bg-[#1A1F2B]"
                        }`}
                      >
                        <span className="truncate max-w-[160px]">{v.name}</span>
                        {isSelected && (
                          <svg className="w-3 h-3 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* HERO STATUS CARD (Real On-Chain Consensus State & Rhythm)                 */}
      {/* ========================================================================= */}
      <div
        className={`rounded-2xl bg-[#12161F] p-6 shadow-xl relative overflow-hidden border ${
          consensusState === ConsensusState.Active
            ? "border-[#2EE6A8]"
            : consensusState === ConsensusState.ClaimPending
            ? "border-[#F5B841]"
            : "border-[#F5484A]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Status Pill Badge */}
            {consensusState === ConsensusState.Active ? (
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/40 uppercase tracking-wider inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8] animate-pulse" />
                ACTIVE SIGNAL
              </span>
            ) : consensusState === ConsensusState.ClaimPending ? (
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#F5B841]/10 text-[#F5B841] border border-[#F5B841]/40 uppercase tracking-wider inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B841] animate-ping" />
                CONTEST WINDOW ACTIVE
              </span>
            ) : (
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#F5484A]/10 text-[#F5484A] border border-[#F5484A]/40 uppercase tracking-wider inline-flex items-center gap-1.5">
                FINALIZED / EXECUTED
              </span>
            )}

            <h1 className="text-lg sm:text-xl font-bold text-[#E8ECF1] tracking-tight">
              Locker Heartbeat Rhythm
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-mono text-[#8993A6] tracking-wider uppercase">
              CHECK-IN INTERVAL:{" "}
              <span className="text-[#E8ECF1] font-semibold">
                {checkInIntervalSec >= 86400
                  ? `${Math.round(checkInIntervalSec / 86400)} DAYS`
                  : `${Math.round(checkInIntervalSec / 60)} MINUTES`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowIntervalModal(true)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#2EE6A8]/10 text-[#2EE6A8] hover:bg-[#2EE6A8]/20 border border-[#2EE6A8]/30 transition-all flex items-center gap-1.5 cursor-pointer font-medium hover:shadow-[0_0_10px_rgba(46,230,168,0.2)]"
              title="Change check-in interval (5m & 10m testing presets available)"
              aria-label="Adjust heartbeat check-in interval"
            >
              {/* SVG bolt replaces ⚡ emoji */}
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>Adjust Interval</span>
            </button>
          </div>
        </div>

        {/* Oscilloscope ECG Monitor */}
        {isLoadingOnChain ? (
          <div className="h-28 my-2 rounded-xl bg-[#1A1F2B] animate-pulse" />
        ) : (
          <LiveECGMonitor
            state={
              consensusState === ConsensusState.Active
                ? "active"
                : consensusState === ConsensusState.Contested
                ? "erratic"
                : "flatline"
            }
            bpm={checkInIntervalSec <= 300 ? 95 : 62}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* ROW 1: Next Check-in & Protected Vault Balance                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Required Check-In Card */}
        <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 flex flex-col justify-between shadow-lg">
          {/* Skeleton shimmer or Countdown when loading */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-[#8993A6] uppercase">
                NEXT REQUIRED CHECK-IN
              </span>
              {isLoadingOnChain && (
                <span className="text-[10px] font-mono text-[#2EE6A8] animate-pulse">
                  Syncing on-chain...
                </span>
              )}
            </div>

            {/* Improved countdown typography: large digits + muted small unit labels */}
            <div className="flex items-end gap-1 sm:gap-2 my-4" aria-label={`Time remaining: ${countdownFormatted.days} days ${countdownFormatted.hours} hours ${countdownFormatted.minutes} minutes ${countdownFormatted.seconds} seconds`}>
              {secondsRemaining === 0 ? (
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#F5B841] tracking-tight">LAPSED</span>
              ) : (
                <>
                  {[{ v: countdownFormatted.days, u: "d" }, { v: countdownFormatted.hours, u: "h" }, { v: countdownFormatted.minutes, u: "m" }, { v: countdownFormatted.seconds, u: "s" }].map(({ v, u }, i) => (
                    <React.Fragment key={u}>
                      {i > 0 && <span className="text-xl sm:text-2xl font-mono text-[#3E4759] mb-1">:</span>}
                      <div className="flex items-end gap-0.5">
                        <span className="text-3xl sm:text-4xl font-bold font-mono text-[#2EE6A8] tracking-tight leading-none tabular-nums">{v}</span>
                        <span className="text-xs font-mono text-[#8993A6] mb-1 ml-0.5">{u}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Record Heartbeat Now Button with Dual-Path Execution */}
          <div className="pt-2">
            <CheckInButton
              vaultAddress={activeVaultAddress}
              ownerAddress={connectedAddress || "0x0000000000000000000000000000000000000000"}
              onCheckInSuccess={handleCheckInSuccess}
              disabled={consensusState !== ConsensusState.Active}
            />
          </div>
        </div>

        {/* Protected Vault Balance Card */}
        <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-[#8993A6] uppercase">
                PROTECTED VAULT BALANCE
              </span>
              <button
                type="button"
                onClick={() => setIsPrivateBalance(!isPrivateBalance)}
                className="text-xs text-[#8993A6] hover:text-[#E8ECF1] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{isPrivateBalance ? "Show" : "Private"}</span>
              </button>
            </div>

          {/* ETH Balance — skeleton while loading, then live value */}
          {isLoadingOnChain ? (
            <div className="h-10 w-40 rounded-lg bg-[#1A1F2B] animate-pulse my-4" />
          ) : (
            <div className="text-3xl sm:text-4xl font-bold font-mono text-[#E8ECF1] tracking-tight my-4">
              {isPrivateBalance ? "•••••••• ETH" : `${ethBalance} ETH`}
            </div>
          )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8993A6] font-sans">
            <svg className="w-4 h-4 text-[#2EE6A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>
              {guardianThreshold > 0
                ? `Protected by ${guardianThreshold}-of-${guardianTotal} guardian consensus`
                : "Protected by decentralized consensus"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERSISTENT NOTIFICATION STATUS ROW                                        */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 flex items-center justify-center shrink-0 text-[#2EE6A8]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#E8ECF1]">
                Email Notifications:
              </span>

              {emailStatus === "verified" ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/30 font-bold">
                  ✓ Bound &amp; Verified
                </span>
              ) : emailStatus === "pending_signature" ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F5B841]/10 text-[#F5B841] border border-[#F5B841]/30 font-bold">
                  ● Pending signature
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#8993A6]/10 text-[#8993A6] border border-[#232838]">
                  Not set
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#8993A6] mt-0.5">
              {emailStatus === "verified"
                ? `7-day pre-deadline alert active for ${maskEmail(confirmedEmail || "owner@cadence.io")} (EIP-712 bound).`
                : emailStatus === "pending_signature"
                ? "Wallet signature requested to bind alert address."
                : "No email bound. Add an alert address to receive pre-deadline warnings."}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
          {isEditingEmail ? (
            <form onSubmit={handleVerifyEmail} className="flex items-center gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                required
                className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0A0E14] border border-[#232838] text-[#E8ECF1] focus:outline-none focus:border-[#2EE6A8] w-48"
              />
              <button
                type="submit"
                disabled={isSigningEmail}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSigningEmail ? "Signing..." : "Sign & Bind"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingEmail(false)}
                className="text-xs text-[#8993A6] hover:text-[#E8ECF1] px-2 py-1 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                emailStatus === "verified"
                  ? "bg-[#1A1F2B] text-[#8993A6] hover:text-[#E8ECF1] border border-[#232838]"
                  : "bg-[#2EE6A8]/15 text-[#2EE6A8] hover:bg-[#2EE6A8]/25 border border-[#2EE6A8]/30 font-bold"
              }`}
            >
              {emailStatus === "verified" ? "Update Email" : "Configure Alert Email →"}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: Guardian Attestation Status & Beneficiary Allocations Encrypted    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guardian Node Attestation Status Card */}
        <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#E8ECF1] tracking-tight">
              Guardian Node Attestation Status
            </h2>
            <span className="text-xs font-mono text-[#8993A6]">
              {guardianThreshold > 0 ? `${guardianThreshold}-of-${guardianTotal} Threshold` : "Consensus Mesh"}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {guardiansList.map((g, idx) => (
              <div
                key={g.address}
                className={`flex items-center justify-between text-xs py-2 ${
                  idx < guardiansList.length - 1 ? "border-b border-[#232838]/60" : ""
                }`}
              >
                <span className="font-mono text-[#8993A6]">
                  {g.address.slice(0, 6)}...{g.address.slice(-4)}{" "}
                  <span className="text-[#5A6478]">({g.label})</span>
                </span>
                {g.attested ? (
                  <span className="font-mono font-semibold text-[#F5B841] tracking-wider text-[11px] bg-[#F5B841]/10 px-2 py-0.5 rounded border border-[#F5B841]/30">
                    ATTESTED
                  </span>
                ) : (
                  <span className="font-mono font-semibold text-[#2EE6A8] tracking-wider text-[11px]">
                    ONLINE &amp; SYNCD
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Beneficiary Allocations Are Encrypted Card */}
        <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-3 rounded-xl bg-[#1A1F2B] border border-[#232838] text-[#8993A6] mb-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-sm font-semibold text-[#E8ECF1]">
            Beneficiary allocations are encrypted
          </h2>

          <p className="text-xs text-[#8993A6] max-w-sm leading-relaxed">
            Only cryptographic commitment hashes are public — individual allocations
            are encrypted to each beneficiary&apos;s wallet and never stored in plaintext.
          </p>
        </div>
      </div>

      {/* Interval Adjustment Modal */}
      {showIntervalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0E121A] border border-[#232838] rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#232838] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 flex items-center justify-center text-[#2EE6A8] text-base">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#E8ECF1]">
                    Adjust Heartbeat Interval
                  </h3>
                  <p className="text-xs text-[#8993A6]">
                    Update your locker inactivity period directly on Sepolia
                  </p>
                </div>
              </div>
          {/* Modal close — SVG replaces ✕ emoji */}
              <button
                type="button"
                onClick={() => {
                  if (!isUpdatingInterval) {
                    setShowIntervalModal(false);
                    setIntervalStatusMsg(null);
                  }
                }}
                disabled={isUpdatingInterval}
                aria-label="Close interval modal"
                className="text-[#8993A6] hover:text-[#E8ECF1] transition-colors p-1 text-lg rounded-lg hover:bg-[#1A1F2C] cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current status display */}
            <div className="bg-[#141923] border border-[#232838] rounded-xl p-3 flex items-center justify-between text-xs font-mono">
              <span className="text-[#8993A6]">Current Active Interval:</span>
              <span className="text-[#2EE6A8] font-bold">
                {checkInIntervalSec >= 86400
                  ? `${Math.round(checkInIntervalSec / 86400)} Days (${checkInIntervalSec.toLocaleString()}s)`
                  : `${Math.round(checkInIntervalSec / 60)} Minutes (${checkInIntervalSec.toLocaleString()}s)`}
              </span>
            </div>

            {/* Fast Testing vs Production Presets */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#2EE6A8] font-bold">
                    ⚡ Fast Testing Presets (Evaluator / Demo)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {INTERVAL_PRESETS.filter((p) => p.isTest).map((preset) => {
                    const isCurrent = checkInIntervalSec === preset.seconds;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={isUpdatingInterval || isCurrent}
                        onClick={() => handleUpdateInterval(preset.seconds)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isCurrent
                            ? "border-[#2EE6A8] bg-[#2EE6A8]/10 cursor-default opacity-80"
                            : "border-[#2EE6A8]/40 bg-[#0A0E14] hover:bg-[#2EE6A8]/10 hover:border-[#2EE6A8] cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#2EE6A8]">{preset.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2EE6A8]/20 text-[#2EE6A8]">Active</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8993A6] leading-tight">{preset.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#8993A6] font-semibold mb-2">
                  Standard Production Intervals
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INTERVAL_PRESETS.filter((p) => !p.isTest).map((preset) => {
                    const isCurrent = checkInIntervalSec === preset.seconds;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={isUpdatingInterval || isCurrent}
                        onClick={() => handleUpdateInterval(preset.seconds)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isCurrent
                            ? "border-[#2EE6A8] bg-[#2EE6A8]/10 cursor-default opacity-80"
                            : "border-[#232838] bg-[#0A0E14] hover:border-[#3E4759] hover:bg-[#141923] cursor-pointer"
                        }`}
                      >
                        <div className="font-bold text-xs text-[#E8ECF1] mb-0.5">{preset.label}</div>
                        <div className="text-[10px] text-[#8993A6]">{isCurrent ? "(Current)" : `${preset.seconds / 86400}d`}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* In-progress or error message */}
            {intervalStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 border ${
                  intervalStatusMsg.includes("Error")
                    ? "bg-[#F5484A]/10 border-[#F5484A]/40 text-[#F5484A]"
                    : intervalStatusMsg.includes("successfully")
                    ? "bg-[#2EE6A8]/10 border-[#2EE6A8]/40 text-[#2EE6A8]"
                    : "bg-[#0A0E14] border-[#232838] text-[#E8ECF1]"
                }`}
              >
                {isUpdatingInterval && (
                  <div className="w-3.5 h-3.5 border-2 border-[#2EE6A8] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                <span>{intervalStatusMsg}</span>
              </div>
            )}

            {/* Note */}
            <div className="text-[11px] text-[#8993A6] leading-relaxed border-t border-[#232838] pt-3">
              <span className="text-[#E8ECF1] font-semibold">Note:</span> Selecting a test interval (5 or 10 min) signs a transaction on-chain via <code className="text-[#2EE6A8] font-mono">InheritanceVault.setCheckInInterval()</code>. The countdown timer and ECG oscilloscope will adjust immediately.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
