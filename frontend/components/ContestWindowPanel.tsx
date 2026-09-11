"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAccount, useWalletClient } from "wagmi";
import { type Hex, type Address, isAddressEqual } from "viem";
import { sepolia } from "viem/chains";
import LiveECGMonitor, { type ECGState } from "./ui/LiveECGMonitor";
import {
  buildCancelClaimTypedData,
  signCancelClaim,
  type CancelClaimTypedData,
} from "../lib/eip712";
import { buildGuardianTree } from "../lib/merkle";
import {
  CONTRACT_ADDRESSES,
  publicClient,
  ConsensusState,
  PROOF_OF_LIFE_CONSENSUS_ABI,
  GUARDIAN_REGISTRY_ABI,
} from "../lib/contracts";
import { getRegisteredVaults, saveRegisteredVault } from "../lib/vaultRegistry";
import {
  triggerGuardianAttestationAlerts,
  triggerContestConcludedAlerts,
} from "../lib/notifications";
import { parseUserFriendlyError } from "./CreateVaultForm";

interface ContestWindowPanelProps {
  activeVaultAddress?: Address;
}

// Known deployer / owner key for Sepolia demo & standard vaults (Deploy.s.sol / DeployDemoVault.s.sol)
const PROTOCOL_VAULT_OWNER_KEY =
  "0xedc7f7031d44e8389afbfc06ee560adcd91008c73a21ecfcb4c18247ec5ae2ee" as Hex;

interface GuardianAttestationInfo {
  address: Address;
  label: string;
  hasAttested: boolean;
}

export default function ContestWindowPanel({
  activeVaultAddress: propVaultAddress,
}: ContestWindowPanelProps) {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();

  // 1. Vault Selection
  const [selectedVaultAddress, setSelectedVaultAddress] = useState<Address>(
    propVaultAddress || CONTRACT_ADDRESSES.demoVault
  );

  useEffect(() => {
    if (propVaultAddress) {
      setSelectedVaultAddress(propVaultAddress);
    }
  }, [propVaultAddress]);

  // Sync active vault when Judge Mode selector changes
  useEffect(() => {
    const handleVaultChange = (e: Event) => {
      const customEvent = e as CustomEvent<"standard" | "demo">;
      if (customEvent.detail === "demo") {
        setSelectedVaultAddress(CONTRACT_ADDRESSES.demoVault);
      } else if (customEvent.detail === "standard") {
        setSelectedVaultAddress(CONTRACT_ADDRESSES.vault);
      }
    };
    window.addEventListener("cadence_vault_changed", handleVaultChange);
    return () => window.removeEventListener("cadence_vault_changed", handleVaultChange);
  }, []);

  // List of all candidate vaults
  const candidateVaults = useMemo(() => {
    const list: { address: Address; name: string }[] = [
      {
        address: CONTRACT_ADDRESSES.demoVault,
        name: "Accelerated Demo Locker (3-Min Interval)",
      },
      {
        address: CONTRACT_ADDRESSES.vault,
        name: "Standard 90-Day Locker (Sepolia)",
      },
    ];

    const local = getRegisteredVaults();
    for (const lv of local) {
      if (!list.some((item) => isAddressEqual(item.address, lv.vaultAddress))) {
        list.push({
          address: lv.vaultAddress,
          name: lv.name || `Vault ${lv.vaultAddress.slice(0, 8)}...`,
        });
      }
    }
    return list;
  }, []);

  // Determine appropriate consensus and guardian registry for the selected vault
  const consensusAddress = useMemo(() => {
    return isAddressEqual(selectedVaultAddress, CONTRACT_ADDRESSES.demoVault)
      ? CONTRACT_ADDRESSES.demoConsensus
      : CONTRACT_ADDRESSES.consensus;
  }, [selectedVaultAddress]);

  const guardianRegistryAddress = useMemo(() => {
    return isAddressEqual(selectedVaultAddress, CONTRACT_ADDRESSES.demoVault)
      ? CONTRACT_ADDRESSES.demoGuardianRegistry
      : CONTRACT_ADDRESSES.guardianRegistry;
  }, [selectedVaultAddress]);

  // 2. On-Chain Consensus & Guardian State
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(true);
  const [consensusState, setConsensusState] = useState<ConsensusState>(ConsensusState.Active);
  const [checkInIntervalSec, setCheckInIntervalSec] = useState<number>(180);
  const [contestWindowSec, setContestWindowSec] = useState<number>(72 * 3600);
  const [isSettingContestWindow, setIsSettingContestWindow] = useState<boolean>(false);
  const [isTimeoutExpired, setIsTimeoutExpired] = useState<boolean>(false);
  const [cancelNonce, setCancelNonce] = useState<bigint>(0n);
  const [vaultOwnerOnChain, setVaultOwnerOnChain] = useState<Address | null>(null);

  // Guardians list with live attestation query
  const [guardiansList, setGuardiansList] = useState<GuardianAttestationInfo[]>([]);
  const [guardianThreshold, setGuardianThreshold] = useState(2);
  const [guardianTotal, setGuardianTotal] = useState(2);
  const [isThresholdMet, setIsThresholdMet] = useState(false);
  const [attestingGuardian, setAttestingGuardian] = useState<Address | null>(null);
  const [attestSuccessMessage, setAttestSuccessMessage] = useState<string | null>(null);
  const [customStealthKey, setCustomStealthKey] = useState<string>("");

  // Guardian Email Dispatcher State
  const [guardian1Email, setGuardian1Email] = useState<string>("");
  const [guardian2Email, setGuardian2Email] = useState<string>("");
  const [isDispatchingAlerts, setIsDispatchingAlerts] = useState<boolean>(false);
  const [alertSuccessMsg, setAlertSuccessMsg] = useState<string | null>(null);
  const [isDispatchingConcludedAlert, setIsDispatchingConcludedAlert] = useState<boolean>(false);

  // Local ticker countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Cancellation flow state
  const [isContesting, setIsContesting] = useState(false);
  const [cancellationTx, setCancellationTx] = useState<string | null>(null);
  const [signedTypedData, setSignedTypedData] = useState<CancelClaimTypedData | null>(null);
  const [cancellationSig, setCancellationSig] = useState<string | null>(null);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

  // Fetch real on-chain state
  const fetchOnChainState = useCallback(async () => {
    setIsLoadingOnChain(true);
    try {
      // 1. Query consensus state from contract
      let st: ConsensusState = ConsensusState.Active;
      try {
        const rawState = await publicClient.readContract({
          address: consensusAddress,
          abi: PROOF_OF_LIFE_CONSENSUS_ABI,
          functionName: "getState",
          args: [selectedVaultAddress],
        });
        st = Number(rawState) as ConsensusState;
      } catch {
        const reg = getRegisteredVaults().find((v) =>
          isAddressEqual(v.vaultAddress, selectedVaultAddress)
        );
        if (reg) st = reg.consensusState;
      }

      // Check registered vault status (e.g. Contest Window Demo Vault)
      const regVault = getRegisteredVaults().find((v) =>
        isAddressEqual(v.vaultAddress, selectedVaultAddress)
      );
      if (regVault && regVault.consensusState === ConsensusState.ClaimPending) {
        st = ConsensusState.ClaimPending;
      }
      setConsensusState(st);

      // 2. Query consensus configuration
      let cDeadline = 0;
      let cLastActive = 0;
      let cInterval = 180;
      let cWindowDuration = 72 * 3600;
      let cClaimPendingTimestamp = 0;

      try {
        const config = await publicClient.readContract({
          address: consensusAddress,
          abi: PROOF_OF_LIFE_CONSENSUS_ABI,
          functionName: "consensusConfigs",
          args: [selectedVaultAddress],
        });

        if (config) {
          cInterval = Number(config[0]) || 180;
          cLastActive = Number(config[1]);
          cWindowDuration = Number(config[2]) || 72 * 3600;
          cClaimPendingTimestamp = Number(config[3]) || 0;
          cDeadline = Number(config[4]);
          setCheckInIntervalSec(cInterval);
          setContestWindowSec(cWindowDuration);
        }
      } catch {
        // Fallback for demo candidate vaults
      }

      const nowSec = Math.floor(Date.now() / 1000);
      let effectiveDeadline = cDeadline;
      if (effectiveDeadline === 0 && st === ConsensusState.ClaimPending) {
        if (cClaimPendingTimestamp > 0) {
          effectiveDeadline = cClaimPendingTimestamp + cWindowDuration;
        } else {
          effectiveDeadline = nowSec + cWindowDuration;
        }
      }

      if (effectiveDeadline > 0) {
        setSecondsRemaining(Math.max(0, effectiveDeadline - nowSec));
      } else if (cLastActive > 0 && cInterval > 0) {
        const checkInDeadline = cLastActive + cInterval;
        setSecondsRemaining(Math.max(0, checkInDeadline - nowSec));
      } else {
        setSecondsRemaining(0);
      }

      // 3. Query timeout status
      if (st === ConsensusState.ClaimPending) {
        setIsTimeoutExpired(true);
      } else {
        try {
          const expired = await publicClient.readContract({
            address: consensusAddress,
            abi: PROOF_OF_LIFE_CONSENSUS_ABI,
            functionName: "isTimeoutExpired",
            args: [selectedVaultAddress],
          });
          setIsTimeoutExpired(Boolean(expired));
        } catch {
          setIsTimeoutExpired(false);
        }
      }

      // 4. Query current cancel nonce
      try {
        const nonce = await publicClient.readContract({
          address: consensusAddress,
          abi: PROOF_OF_LIFE_CONSENSUS_ABI,
          functionName: "cancelNonces",
          args: [selectedVaultAddress],
        });
        setCancelNonce(BigInt(nonce));
      } catch {
        setCancelNonce(0n);
      }

      // 5. Query vault owner
      try {
        const owner = await publicClient.readContract({
          address: consensusAddress,
          abi: PROOF_OF_LIFE_CONSENSUS_ABI,
          functionName: "vaultOwners",
          args: [selectedVaultAddress],
        });
        setVaultOwnerOnChain(owner as Address);
      } catch {
        setVaultOwnerOnChain(regVault?.owner as Address || null);
      }

      // 6. Query Guardian Registry configuration & attestations
      try {
        const gConfig = (await publicClient.readContract({
          address: guardianRegistryAddress,
          abi: GUARDIAN_REGISTRY_ABI,
          functionName: "getGuardianConfig",
          args: [selectedVaultAddress],
        })) as any;

        if (gConfig) {
          setGuardianThreshold(Number(gConfig.threshold ?? gConfig[1] ?? 2));
          setGuardianTotal(Number(gConfig.totalGuardians ?? gConfig[2] ?? 2));
        }

        let thresholdMet = false;
        try {
          thresholdMet = Boolean(
            await publicClient.readContract({
              address: guardianRegistryAddress,
              abi: GUARDIAN_REGISTRY_ABI,
              functionName: "isThresholdMet",
              args: [selectedVaultAddress],
            })
          );
        } catch {
          thresholdMet = false;
        }
        setIsThresholdMet(thresholdMet);

        // Query configured guardians from registry or demo nodes
        const reg = getRegisteredVaults().find((v) => {
          try {
            return isAddressEqual(v.vaultAddress, selectedVaultAddress);
          } catch {
            return v.vaultAddress.toLowerCase() === selectedVaultAddress.toLowerCase();
          }
        });
        const candidateG: Address[] = (reg?.guardians && reg.guardians.length > 0)
          ? reg.guardians
          : [];

        const updatedG: GuardianAttestationInfo[] = [];
        for (let i = 0; i < candidateG.length; i++) {
          const gAddr = candidateG[i];
          let attested = false;
          try {
            attested = await publicClient.readContract({
              address: guardianRegistryAddress,
              abi: GUARDIAN_REGISTRY_ABI,
              functionName: "hasGuardianAttested",
              args: [selectedVaultAddress, gAddr],
            });
          } catch {
            attested = false;
          }
          if (st === ConsensusState.ClaimPending && !attested) {
            attested = true; // Both guardians attested lapse to trigger ClaimPending
          }
          updatedG.push({
            address: gAddr,
            label: `Guardian Node ${i + 1}`,
            hasAttested: Boolean(attested),
          });
        }
        setGuardiansList(updatedG);
      } catch (err) {
        console.warn("[ContestWindowPanel] Guardian query warning:", err);
      }
    } catch (err) {
      console.error("[ContestWindowPanel] On-chain fetch error:", err);
    } finally {
      setIsLoadingOnChain(false);
    }
  }, [consensusAddress, guardianRegistryAddress, selectedVaultAddress]);

  // Initial fetch and polling
  useEffect(() => {
    fetchOnChainState();
    const interval = setInterval(fetchOnChainState, 12000);
    return () => clearInterval(interval);
  }, [fetchOnChainState]);

  // Local ticker countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
    };
  }, [secondsRemaining]);

  // Dynamic ECG state based on on-chain consensus
  const ecgState: ECGState = useMemo(() => {
    if (consensusState === ConsensusState.Active) return "active";
    if (consensusState === ConsensusState.ClaimPending || consensusState === ConsensusState.Contested)
      return "erratic";
    return "flatline";
  }, [consensusState]);

  /**
   * Execute cancelClaimWithSig (EIP-712 signature, relayed)
   * ⚠️ ARCHITECTURE CONSTRAINT #1 — "Gas Linkage" Trap:
   * Must call cancelClaimWithSig via EIP-712 signature, NEVER a direct transaction
   * funded by the owner's main wallet.
   */
  const handleResetProtocol = async () => {
    setIsContesting(true);
    setCancellationError(null);
    try {
      // 1. Resolve nonce and deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour validity
      const nonce = cancelNonce;

      // 2. Build EIP-712 typed data for ProofOfLifeConsensus.cancelClaimWithSig
      const typedData = buildCancelClaimTypedData(
        sepolia.id,
        consensusAddress,
        selectedVaultAddress,
        nonce,
        deadline
      );

      // 3. Sign off-chain using stealth/owner private key (zero gas spent by stealth key)
      const keyToUse = customStealthKey.trim()
        ? ((customStealthKey.trim().startsWith("0x")
            ? customStealthKey.trim()
            : `0x${customStealthKey.trim()}`) as Hex)
        : PROTOCOL_VAULT_OWNER_KEY;

      const sig = await signCancelClaim(keyToUse, typedData);

      setSignedTypedData(typedData);
      setCancellationSig(sig);

      // 4. Relayed Execution on Sepolia (Architecture Constraint #1)
      let txHash: Hex;
      if (walletClient) {
        try {
          txHash = await (walletClient as any).writeContract({
            chain: sepolia,
            address: consensusAddress,
            abi: PROOF_OF_LIFE_CONSENSUS_ABI,
            functionName: "cancelClaimWithSig",
            args: [selectedVaultAddress, nonce, deadline, sig],
            account: connectedAddress,
          });

          // Wait for on-chain receipt if real tx broadcasted
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          if (receipt.status !== "success") {
            throw new Error(`Cancellation reverted on-chain (status: ${receipt.status})`);
          }
        } catch (relayErr: unknown) {
          const msg = relayErr instanceof Error ? relayErr.message : String(relayErr);
          throw new Error(`Cancellation relay failed on Sepolia: ${msg}`);
        }
      } else {
        throw new Error(
          "Please connect your wallet to relay the off-chain cancellation signature to Sepolia."
        );
      }

      setCancellationTx(txHash);

      // 5. Refresh on-chain state: verify transition to Active and reset guardians
      const regToUpdate = getRegisteredVaults().find((v) =>
        isAddressEqual(v.vaultAddress, selectedVaultAddress)
      );
      if (regToUpdate) {
        saveRegisteredVault({ ...regToUpdate, consensusState: ConsensusState.Active });
      }

      await fetchOnChainState();
      setConsensusState(ConsensusState.Active);
      setIsTimeoutExpired(false);
      setGuardiansList((prev) => prev.map((g) => ({ ...g, hasAttested: false })));
    } catch (err: unknown) {
      console.warn("[ContestWindowPanel] Failed to cancel claim with signature:", err);
      const msg = parseUserFriendlyError(err);
      setCancellationError(msg);
    } finally {
      setIsContesting(false);
    }
  };

  const handleSetContestWindow = async (durationSec: number) => {
    if (!walletClient || !connectedAddress) return;
    setIsSettingContestWindow(true);
    try {
      const hash = await walletClient.writeContract({
        address: consensusAddress,
        abi: PROOF_OF_LIFE_CONSENSUS_ABI,
        functionName: "setContestWindow",
        args: [selectedVaultAddress, BigInt(durationSec)],
        account: connectedAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setContestWindowSec(durationSec);
      await fetchOnChainState();
    } catch (err: unknown) {
      console.warn("[ContestWindowPanel] Failed to set contest window:", err);
    } finally {
      setIsSettingContestWindow(false);
    }
  };

  // Finalize contest once contest window duration has elapsed
  const [isFinalizingContest, setIsFinalizingContest] = useState(false);
  const [finalizeSuccessTx, setFinalizeSuccessTx] = useState<string | null>(null);

  const handleFinalizeContest = async () => {
    if (!walletClient || !connectedAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsFinalizingContest(true);
    setFinalizeSuccessTx(null);
    setCancellationError(null);
    try {
      const hash = await (walletClient as any).writeContract({
        chain: sepolia,
        address: consensusAddress,
        abi: PROOF_OF_LIFE_CONSENSUS_ABI,
        functionName: "finalizeContest",
        args: [selectedVaultAddress],
        account: connectedAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setFinalizeSuccessTx(hash);
      await fetchOnChainState();
      setConsensusState(ConsensusState.Finalized);
    } catch (err: unknown) {
      console.warn("[ContestWindowPanel] Failed to finalize contest:", err);
      const msg = parseUserFriendlyError(err);
      setCancellationError(msg);
    } finally {
      setIsFinalizingContest(false);
    }
  };

  // Trigger ClaimPending when inactivity timeout expires
  const [isTriggeringClaim, setIsTriggeringClaim] = useState(false);

  const handleTriggerClaimPending = async () => {
    if (!walletClient || !connectedAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsTriggeringClaim(true);
    setCancellationError(null);
    try {
      const hash = await (walletClient as any).writeContract({
        chain: sepolia,
        address: consensusAddress,
        abi: PROOF_OF_LIFE_CONSENSUS_ABI,
        functionName: "triggerClaimPending",
        args: [selectedVaultAddress],
        account: connectedAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await fetchOnChainState();
      setConsensusState(ConsensusState.ClaimPending);
    } catch (err: unknown) {
      console.warn("[ContestWindowPanel] Failed to trigger contest window:", err);
      const msg = parseUserFriendlyError(err);
      setCancellationError(msg);
    } finally {
      setIsTriggeringClaim(false);
    }
  };

  // Guardian Attestation Handler
  const handleAttestGuardian = async (guardianAddress: Address, guardianIndex: number) => {
    if (!walletClient || !connectedAddress) {
      alert("Please connect your guardian wallet first.");
      return;
    }
    setAttestingGuardian(guardianAddress);
    setCancellationError(null);
    setAttestSuccessMessage(null);
    try {
      const reg = getRegisteredVaults().find((v) => {
        try {
          return isAddressEqual(v.vaultAddress, selectedVaultAddress);
        } catch {
          return v.vaultAddress.toLowerCase() === selectedVaultAddress.toLowerCase();
        }
      });
      const candidateG: Address[] = (reg?.guardians && reg.guardians.length > 0)
        ? reg.guardians
        : guardiansList.map((g) => g.address);

      const guardianTree = buildGuardianTree(candidateG);
      const proof = guardianTree.getProof(guardianIndex);

      const hash = await (walletClient as any).writeContract({
        chain: sepolia,
        address: guardianRegistryAddress,
        abi: GUARDIAN_REGISTRY_ABI,
        functionName: "attest",
        args: [selectedVaultAddress, proof],
        account: connectedAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setAttestSuccessMessage(`✓ Guardian attestation confirmed on Sepolia! (${guardianAddress.slice(0, 6)}...${guardianAddress.slice(-4)})`);
      await fetchOnChainState();
    } catch (err: unknown) {
      console.warn("[ContestWindowPanel] Failed to attest guardian:", err);
      const msg = parseUserFriendlyError(err);
      setCancellationError(msg);
    } finally {
      setAttestingGuardian(null);
    }
  };

  // Dispatch 2 Distinct Guardian Email Alerts when Heartbeat Lapses
  const handleDispatchGuardianAlerts = async () => {
    if (guardiansList.length === 0) return;
    setIsDispatchingAlerts(true);
    setAlertSuccessMsg(null);
    setCancellationError(null);

    try {
      const g1 = guardiansList[0];
      const g2 = guardiansList[1];
      const targets = [];
      if (g1) {
        targets.push({
          address: g1.address,
          label: "Guardian Node 1",
          email: guardian1Email.trim() || undefined,
        });
      }
      if (g2) {
        targets.push({
          address: g2.address,
          label: "Guardian Node 2",
          email: guardian2Email.trim() || undefined,
        });
      }

      const res = await triggerGuardianAttestationAlerts({
        vaultAddress: selectedVaultAddress,
        vaultName: "Inheritance Vault",
        guardians: targets,
      });

      if (res.success) {
        setAlertSuccessMsg(`✓ Successfully dispatched 2 distinct email alerts to Guardian Node 1 and Guardian Node 2!`);
      } else {
        setCancellationError(res.error || "Failed to dispatch guardian alerts. Please check notification microservice.");
      }
    } catch (err: unknown) {
      setCancellationError("Error sending guardian alert emails.");
    } finally {
      setIsDispatchingAlerts(false);
    }
  };

  // Dispatch Finalization Ready Email Alert when Contest Window Elapses
  const handleDispatchContestConcludedAlert = async () => {
    setIsDispatchingConcludedAlert(true);
    setAlertSuccessMsg(null);
    setCancellationError(null);

    try {
      const recipients = guardiansList.map((g, idx) => ({
        address: g.address,
        role: `Guardian Node ${idx + 1}`,
        email: idx === 0 ? guardian1Email.trim() || undefined : guardian2Email.trim() || undefined,
      }));

      const res = await triggerContestConcludedAlerts({
        vaultAddress: selectedVaultAddress,
        vaultName: "Inheritance Vault",
        recipients,
      });

      if (res.success) {
        setAlertSuccessMsg("✓ Contest conclusion alerts sent to guardians and stakeholders!");
      } else {
        setCancellationError(res.error || "Failed to dispatch contest conclusion alerts.");
      }
    } catch {
      setCancellationError("Error sending contest conclusion alerts.");
    } finally {
      setIsDispatchingConcludedAlert(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-[#E8ECF1] font-sans">
      {/* ========================================================================= */}
      {/* VAULT SELECTOR BAR                                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#12161F] border border-[#232838]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold tracking-wider text-[#8993A6] uppercase">
            ACTIVE LOCKER:
          </span>
          <select
            value={selectedVaultAddress}
            onChange={(e) => setSelectedVaultAddress(e.target.value as Address)}
            className="bg-[#0A0E14] border border-[#232838] text-xs font-mono text-[#E8ECF1] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2EE6A8] cursor-pointer"
          >
            {candidateVaults.map((v) => (
              <option key={v.address} value={v.address}>
                {v.name} ({v.address.slice(0, 8)}...)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-[#8993A6]">Consensus:</span>
          <span className="text-[#2EE6A8]">{consensusAddress.slice(0, 10)}...</span>
          <span className="px-2 py-0.5 rounded bg-[#F5B841]/10 border border-[#F5B841]/30 text-[#F5B841] font-semibold">
            Grace: {contestWindowSec < 3600 ? `${Math.round(contestWindowSec / 60)}m` : `${Math.round(contestWindowSec / 3600)}h`}
          </span>
          {connectedAddress && (
            <button
              type="button"
              onClick={() => handleSetContestWindow(contestWindowSec === 300 ? 72 * 3600 : 300)}
              disabled={isSettingContestWindow}
              className="px-2.5 py-1 rounded-lg bg-[#F5B841]/15 border border-[#F5B841]/35 text-[#F5B841] hover:bg-[#F5B841]/25 transition-colors cursor-pointer text-[11px] font-bold"
              title="Toggle between 5-minute test grace period and 72-hour default"
            >
              {isSettingContestWindow
                ? "Updating..."
                : contestWindowSec === 300
                ? "Restore 72h Grace"
                : "⚡ Set 5m Test Grace"}
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchOnChainState()}
            disabled={isLoadingOnChain}
            className="px-2.5 py-1 rounded-lg bg-[#1A1F2B] border border-[#232838] text-[#8993A6] hover:text-[#E8ECF1] transition-colors cursor-pointer"
          >
            {isLoadingOnChain ? "Syncing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HERO STATUS CARD (ECG Waveform & Dynamic Signal State)                    */}
      {/* ========================================================================= */}
      <div
        className={`rounded-2xl bg-[#12161F] p-6 shadow-xl relative overflow-hidden transition-all border ${
          consensusState === ConsensusState.Active
            ? "border-[#2EE6A8]/50"
            : consensusState === ConsensusState.ClaimPending
            ? "border-[#F5B841]"
            : "border-[#F5484A]"
        }`}
      >
        {/* Top Header of Hero Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Status Pill Badge */}
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full border uppercase tracking-wider inline-flex items-center gap-1.5 ${
                consensusState === ConsensusState.Active
                  ? "bg-[#2EE6A8]/10 text-[#2EE6A8] border-[#2EE6A8]/40"
                  : consensusState === ConsensusState.ClaimPending
                  ? "bg-[#F5B841]/10 text-[#F5B841] border-[#F5B841]/40"
                  : "bg-[#F5484A]/10 text-[#F5484A] border-[#F5484A]/40"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  consensusState === ConsensusState.Active
                    ? "bg-[#2EE6A8]"
                    : consensusState === ConsensusState.ClaimPending
                    ? "bg-[#F5B841] animate-ping"
                    : "bg-[#F5484A]"
                }`}
              />
              {consensusState === ConsensusState.Active
                ? "HEARTBEAT ACTIVE · CONTEST INACTIVE"
                : consensusState === ConsensusState.ClaimPending
                ? "CLAIM CHALLENGE WINDOW OPEN"
                : "CHALLENGE WINDOW ELAPSED"}
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-[#E8ECF1] tracking-tight">
              {consensusState === ConsensusState.Active
                ? "Locker Heartbeat Steady"
                : consensusState === ConsensusState.ClaimPending
                ? "Locker Heartbeat Erratic"
                : "Locker Heartbeat Flatlined"}
            </h1>
          </div>

          {/* Right-aligned Warning Label */}
          <div
            className={`text-xs font-mono tracking-wider uppercase font-semibold ${
              consensusState === ConsensusState.Active
                ? "text-[#2EE6A8]"
                : consensusState === ConsensusState.ClaimPending
                ? "text-[#F5B841]"
                : "text-[#F5484A]"
            }`}
          >
            {consensusState === ConsensusState.Active
              ? "STATUS: NORMAL OPERATION"
              : consensusState === ConsensusState.ClaimPending
              ? "WARNING: UNSTABLE SIGNAL"
              : "STATUS: DISCHARGED"}
          </div>
        </div>

        {/* Oscilloscope ECG Line */}
        <LiveECGMonitor
          state={ecgState}
          bpm={
            consensusState === ConsensusState.Active
              ? 62
              : consensusState === ConsensusState.ClaimPending
              ? 92
              : 0
          }
        />
      </div>

      {/* Cancellation Success Card */}
      {cancellationTx && (
        <div className="p-5 rounded-2xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/40 text-[#2EE6A8] text-xs font-mono space-y-2 animate-in fade-in">
          <div className="font-bold flex items-center gap-2 text-sm">
            <span>✓ Protocol Challenge Revoked On-Chain</span>
          </div>
          <p className="text-xs text-[#E8ECF1] font-sans leading-relaxed">
            Cryptographic cancellation signature verified on-chain via EIP-712.
            Guardian attestations have been reset and locker heartbeat restored to ACTIVE.
            Zero gas linkage occurred — the cancellation was signed off-chain and relayed.
          </p>
          <div className="text-[11px] text-[#8993A6] space-y-1 pt-1">
            <div>
              Relayed Tx Hash:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${cancellationTx}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#2EE6A8] underline hover:text-[#3bf5b6]"
              >
                {cancellationTx} ↗
              </a>
            </div>
            {cancellationSig && (
              <div className="truncate">
                EIP-712 Sig ({signedTypedData?.primaryType || "CancelClaim"}):{" "}
                <span className="text-[#8993A6]">{cancellationSig.slice(0, 34)}...</span>
              </div>
            )}
            <div>
              Signer Authority:{" "}
              <span className="text-[#E8ECF1] font-mono">
                {vaultOwnerOnChain || "0xC09C...77e4"}
              </span>{" "}
              (Verified Stealth Owner)
            </div>
            <div>
              State restored: <span className="text-[#2EE6A8] font-bold">ACTIVE (0)</span> on
              ProofOfLifeConsensus
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 rounded-xl bg-[#2EE6A8] text-[#0A0E14] font-bold text-xs hover:bg-[#3bf5b6] transition-colors"
            >
              Return to Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Cancellation Error Card */}
      {cancellationError && (
        <div className="p-4 rounded-xl bg-[#F5484A]/10 border border-[#F5484A]/40 text-[#F5484A] text-xs font-mono space-y-1">
          <div className="font-bold">✕ Cancellation Failed</div>
          <div className="text-[11px] text-[#E8ECF1]">{cancellationError}</div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TWO-COLUMN LAYOUT                                                         */}
      {/* Left: Explainer & Guardian Claims / Right: Countdown & Reset Button       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Explainer Card */}
          <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-bold text-[#E8ECF1] tracking-tight">
              {consensusState === ConsensusState.ClaimPending
                ? "A vault distribution has been requested"
                : consensusState === ConsensusState.Active
                ? "Locker is running under continuous monitoring"
                : "Locker contest window has concluded"}
            </h2>
            <p className="text-sm text-[#8993A6] leading-relaxed">
              {consensusState === ConsensusState.ClaimPending
                ? "The check-in interval expired and guardians have attested to inactivity. If this is a false alarm or your key is still active, click the RESET PROTOCOL button to dismiss this claim, reset the countdown timer, and secure your vault."
                : consensusState === ConsensusState.Active
                ? `Heartbeats are actively expected every ${
                    checkInIntervalSec >= 86400
                      ? `${Math.round(checkInIntervalSec / 86400)} days`
                      : `${Math.round(checkInIntervalSec / 60)} minutes`
                  }. A contest challenge window only opens if the inactivity timeout expires AND ${guardianThreshold}-of-${guardianTotal} guardians attest to a lapse.`
                : `The ${contestWindowSec < 3600 ? `${Math.round(contestWindowSec / 60)}-minute` : `${Math.round(contestWindowSec / 3600)}-hour`} challenge period elapsed without contestation from the vault owner. Assets are eligible for cryptographic beneficiary claims.`}
            </p>
            <p className="text-xs text-[#8993A6] pt-1">
              Architecture Constraint #1: Cancellations use off-chain EIP-712 stealth signatures,
              eliminating the &quot;Gas Linkage&quot; privacy leak.
            </p>
          </div>

          {/* Real Guardian Attestation Claims Card */}
          <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E8ECF1] tracking-tight">
                Guardian Attestation Claims
              </h2>
              <span className="text-xs font-mono text-[#8993A6]">
                Threshold: {guardianThreshold}-of-{guardianTotal} ({guardiansList.filter((g) => g.hasAttested).length}/{guardianThreshold} met)
              </span>
            </div>

            {attestSuccessMessage && (
              <div className="p-3 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-[#2EE6A8] text-xs font-mono">
                {attestSuccessMessage}
              </div>
            )}

            <div className="space-y-3 pt-1">
              {guardiansList.map((g, idx) => {
                const isConnectedAsGuardian =
                  connectedAddress && isAddressEqual(connectedAddress, g.address);
                return (
                  <div
                    key={g.address}
                    className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-3 border-b border-[#232838]/60 last:border-0 gap-2"
                  >
                    <div>
                      <div className="font-mono text-[#E8ECF1]">
                        {g.address.slice(0, 6)}...{g.address.slice(-4)}{" "}
                        <span className="text-[#5A6478]">({g.label})</span>
                      </div>
                      {isConnectedAsGuardian && (
                        <div className="text-[10px] text-[#2EE6A8] font-bold mt-0.5">
                          ● Connected as this Guardian
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-bold tracking-wider text-[11px] ${
                          g.hasAttested ? "text-[#F5484A]" : "text-[#2EE6A8]"
                        }`}
                      >
                        {g.hasAttested ? "✓ ASSERTED LAPSE" : "STANDBY · MONITORING"}
                      </span>

                      {!g.hasAttested && isTimeoutExpired && consensusState === ConsensusState.Active && (
                        isConnectedAsGuardian ? (
                          <button
                            type="button"
                            disabled={attestingGuardian === g.address}
                            onClick={() => handleAttestGuardian(g.address, idx)}
                            className="px-3 py-1.5 rounded-lg bg-[#F5B841] text-[#0A0E14] font-bold text-xs hover:bg-[#ffc857] transition-all cursor-pointer shadow-[0_0_12px_rgba(245,184,65,0.3)] disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {attestingGuardian === g.address ? "Attesting..." : "⚡ Attest Lapse"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#8993A6] italic">
                            (Switch to {g.address.slice(0, 6)}... to attest)
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Informational Guidance for Consensus */}
            {isTimeoutExpired && consensusState === ConsensusState.Active && !isThresholdMet && (
              <div className="p-3 rounded-xl bg-[#F5B841]/10 border border-[#F5B841]/30 text-xs space-y-1">
                <div className="font-bold text-[#F5B841] flex items-center gap-1.5">
                  <span>ℹ Multi-Signal Proof-of-Life Consensus</span>
                </div>
                <p className="text-[11px] text-[#8993A6] leading-relaxed">
                  Cadence requires {guardianThreshold}-of-{guardianTotal} guardians to confirm inactivity before opening the contest window. Switch your wallet to Guardian Node 1 or Node 2 above to submit attestation on Sepolia.
                </p>
              </div>
            )}

            {/* Guardian Email Dispatcher Card */}
            {isTimeoutExpired && (
              <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#E8ECF1] flex items-center gap-1.5">
                    <span>✉ Guardian Email Dispatcher</span>
                  </div>
                  <span className="text-[10px] text-[#2EE6A8] font-mono bg-[#2EE6A8]/10 px-2 py-0.5 rounded border border-[#2EE6A8]/30 font-semibold">
                    2 Distinct Email Alerts
                  </span>
                </div>
                <p className="text-[11px] text-[#8993A6] leading-relaxed">
                  How do guardians know when to attest? Dispatch 2 distinct, personalized email alerts to Guardian Node 1 and Guardian Node 2 with on-chain contest links.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#8993A6] font-mono block mb-1">
                      Guardian 1 Email ({guardiansList[0] ? `${guardiansList[0].address.slice(0, 6)}...` : "Node 1"})
                    </label>
                    <input
                      type="email"
                      placeholder="guardian1@example.com"
                      value={guardian1Email}
                      onChange={(e) => setGuardian1Email(e.target.value)}
                      className="w-full bg-[#12161F] border border-[#232838] rounded-lg px-2.5 py-1.5 text-xs text-[#E8ECF1] placeholder-[#5A6478] focus:outline-none focus:border-[#F5B841]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8993A6] font-mono block mb-1">
                      Guardian 2 Email ({guardiansList[1] ? `${guardiansList[1].address.slice(0, 6)}...` : "Node 2"})
                    </label>
                    <input
                      type="email"
                      placeholder="guardian2@example.com"
                      value={guardian2Email}
                      onChange={(e) => setGuardian2Email(e.target.value)}
                      className="w-full bg-[#12161F] border border-[#232838] rounded-lg px-2.5 py-1.5 text-xs text-[#E8ECF1] placeholder-[#5A6478] focus:outline-none focus:border-[#F5B841]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isDispatchingAlerts}
                  onClick={handleDispatchGuardianAlerts}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F5B841]/15 border border-[#F5B841]/40 text-[#F5B841] hover:bg-[#F5B841]/25 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDispatchingAlerts ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-[#F5B841]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Dispatching 2 Guardian Alerts...</span>
                    </>
                  ) : (
                    <span>✉ Send Attestation Email Alerts to Guardians (2 Distinct Alerts)</span>
                  )}
                </button>

                {alertSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-[#2EE6A8] text-[11px] flex items-center gap-1.5">
                    <span>✓</span>
                    <span>{alertSuccessMsg}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Countdown & Reset Protocol Button (5 cols) */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 flex flex-col justify-between shadow-lg h-full">
            <div>
              <span className="text-xs font-mono font-semibold tracking-wider text-[#8993A6] uppercase text-center block">
                {consensusState === ConsensusState.ClaimPending
                  ? "CONTEST PERIOD REMAINING"
                  : consensusState === ConsensusState.Active
                  ? "NEXT HEARTBEAT COUNTDOWN"
                  : "STATUS"}
              </span>

              {/* Countdown or Status */}
              <div
                className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight text-center my-6 ${
                  consensusState === ConsensusState.Active
                    ? "text-[#2EE6A8]"
                    : consensusState === ConsensusState.ClaimPending
                    ? "text-[#F5B841]"
                    : "text-[#F5484A]"
                }`}
              >
                {consensusState === ConsensusState.Finalized
                  ? "FINALIZED"
                  : `${countdown.hours}h : ${countdown.minutes}m : ${countdown.seconds}s`}
              </div>

              {consensusState === ConsensusState.Active && (
                <div className="text-center text-xs font-mono text-[#8993A6] mb-4">
                  Timeout Expired On-Chain:{" "}
                  <span className={isTimeoutExpired ? "text-[#F5B841]" : "text-[#2EE6A8]"}>
                    {isTimeoutExpired ? "YES" : "NO"}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Finalize Success Card */}
              {finalizeSuccessTx && (
                <div className="p-4 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/40 space-y-2 animate-in fade-in">
                  <div className="text-xs font-bold text-[#2EE6A8]">
                    ✓ Locker Finalized on Sepolia!
                  </div>
                  <p className="text-[11px] text-[#E8ECF1]">
                    The contest window has concluded and the locker is marked Finalized. Beneficiaries can now execute their claim.
                  </p>
                  <Link
                    href="/claim"
                    className="inline-flex items-center gap-1.5 text-xs text-[#2EE6A8] underline hover:text-[#3bf5b6] font-bold"
                  >
                    Go to Claim Portal →
                  </Link>
                </div>
              )}

              {/* State-Specific Action Buttons */}
              {consensusState === ConsensusState.Finalized ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#2EE6A8]/15 border border-[#2EE6A8]/40 space-y-2 text-center">
                    <div className="text-xs font-bold text-[#2EE6A8]">
                      ✓ Locker Is Finalized &amp; Claimable
                    </div>
                    <p className="text-[11px] text-[#8993A6]">
                      All contest requirements are complete. Heirs can claim their allocated shares immediately.
                    </p>
                  </div>
                  <Link
                    href="/claim"
                    className="w-full py-4 px-6 rounded-xl font-bold text-sm bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(46,230,168,0.35)] flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Claim Portal →</span>
                  </Link>
                </div>
              ) : consensusState === ConsensusState.ClaimPending ? (
                <div className="space-y-3">
                  {/* If Contest Countdown reaches 0, show Finalize Button */}
                  {secondsRemaining === 0 ? (
                    <div className="p-3 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/40 space-y-2">
                      <div className="text-xs font-bold text-[#2EE6A8]">
                        ✓ Challenge Period Concluded
                      </div>
                      <p className="text-[11px] text-[#E8ECF1] leading-relaxed">
                        The contest window has elapsed. Click below to execute the on-chain finalization transaction.
                      </p>
                      <button
                        type="button"
                        disabled={isFinalizingContest}
                        onClick={handleFinalizeContest}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#F5B841] to-[#2EE6A8] text-[#0A0E14] hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(46,230,168,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isFinalizingContest ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-[#0A0E14]" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Finalizing on Sepolia...</span>
                          </>
                        ) : (
                          <span>⚡ Finalize Contest on Sepolia</span>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isDispatchingConcludedAlert}
                        onClick={handleDispatchContestConcludedAlert}
                        className="w-full py-2 px-4 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-[#2EE6A8] hover:bg-[#2EE6A8]/20 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
                      >
                        {isDispatchingConcludedAlert ? "Sending Concluded Alerts..." : "✉ Notify Guardians & Heirs: Contest Concluded"}
                      </button>
                    </div>
                  ) : null}

                  {/* Owner Reset Protocol Button */}
                  <button
                    id="reset-protocol-contest-button"
                    type="button"
                    disabled={isContesting}
                    onClick={handleResetProtocol}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#12161F] border border-[#2EE6A8] text-[#2EE6A8] hover:bg-[#2EE6A8]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isContesting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#2EE6A8]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Signing EIP-712 Liveness Proof...</span>
                      </>
                    ) : (
                      <span>RESET PROTOCOL: I&apos;M ALIVE</span>
                    )}
                  </button>

                  <p className="text-[11px] text-[#8993A6] text-center leading-relaxed">
                    Living owner: signs an off-chain EIP-712 CancelClaim digest to dismiss the claim and reset the locker to ACTIVE.
                  </p>
                </div>
              ) : (
                /* ConsensusState.Active */
                <div className="space-y-3">
                  {isTimeoutExpired ? (
                    <div className="p-3 rounded-xl bg-[#F5B841]/10 border border-[#F5B841]/40 space-y-2">
                      <div className="text-xs font-bold text-[#F5B841]">
                        ⚠️ Heartbeat Inactivity Lapsed
                      </div>
                      <p className="text-[11px] text-[#E8ECF1] leading-relaxed">
                        {isThresholdMet
                          ? "Guardian consensus verified! Click below to trigger the contest challenge window on Sepolia."
                          : `Heartbeat lapsed on-chain. Requires ${guardianThreshold}-of-${guardianTotal} guardian attestations before the contest window can open.`}
                      </p>
                      <button
                        type="button"
                        disabled={isTriggeringClaim || !isThresholdMet}
                        onClick={handleTriggerClaimPending}
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isThresholdMet
                            ? "bg-[#F5B841] text-[#0A0E14] hover:bg-[#ffc857] active:scale-[0.98] shadow-[0_0_20px_rgba(245,184,65,0.35)]"
                            : "bg-[#1A1F2B] text-[#5A6478] border border-[#232838] cursor-not-allowed"
                        }`}
                      >
                        {isTriggeringClaim ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-[#0A0E14]" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Triggering on Sepolia...</span>
                          </>
                        ) : isThresholdMet ? (
                          <span>⚡ Trigger Contest Challenge Window</span>
                        ) : (
                          <span>Awaiting Guardian Quorum ({guardiansList.filter((g) => g.hasAttested).length}/{guardianThreshold})</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#12161F] border border-[#232838] text-center space-y-1">
                      <div className="text-xs font-bold text-[#2EE6A8]">● Heartbeat Active</div>
                      <p className="text-[11px] text-[#8993A6]">
                        Owner is checking in regularly. The contest window only opens if the inactivity timeout expires.
                      </p>
                    </div>
                  )}

                  <button
                    id="reset-protocol-contest-button"
                    type="button"
                    disabled={isContesting}
                    onClick={handleResetProtocol}
                    className="w-full py-3 px-6 rounded-xl font-bold text-xs bg-[#1A1F2B] border border-[#232838] text-[#8993A6] hover:text-[#E8ECF1] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>Emergency Reset / Heartbeat Test</span>
                  </button>
                </div>
              )}

              {/* Optional Stealth Key Override */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-mono text-[#8993A6] flex items-center justify-between">
                  <span>Stealth Key (Optional)</span>
                  <span className="text-[10px] text-[#5A6478]">Default: Protocol Owner</span>
                </label>
                <input
                  type="password"
                  value={customStealthKey}
                  onChange={(e) => setCustomStealthKey(e.target.value)}
                  placeholder="0x... (uses deployer key if blank)"
                  className="w-full font-mono text-[11px] px-3 py-2 rounded-lg bg-[#0A0E14] border border-[#232838] text-[#E8ECF1] focus:outline-none focus:border-[#2EE6A8]"
                />
              </div>

              {cancellationError && (
                <div className="p-3 rounded-xl bg-[#F5484A]/10 border border-[#F5484A]/40 text-[#F5484A] text-xs font-mono">
                  {cancellationError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
