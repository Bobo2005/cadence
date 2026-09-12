"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAccount, useWalletClient } from "wagmi";
import {
  type Hex,
  type Address,
  type Account,
  isAddressEqual,
  getAddress,
  formatEther,
  createWalletClient,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cadenceSepolia, sepoliaTransports } from "../lib/wagmi";
import LiveECGMonitor from "./ui/LiveECGMonitor";
import {
  publicClient,
  INHERITANCE_VAULT_ABI,
  PROOF_OF_LIFE_CONSENSUS_ABI,
  ConsensusState,
} from "../lib/contracts";
import {
  getRegisteredVaults,
  generateProofFromLeaves,
  verifyProof,
} from "../lib/vaultRegistry";
import { decryptAllocation, type AllocationData } from "../lib/encryption";
import { computeAllocationLeaf } from "../lib/merkle";
import {
  getWalletNotificationStatus,
  requestSignatureAndBind,
  requestWalletReminder,
} from "../lib/notifications";
import { parseUserFriendlyError } from "./CreateVaultForm";

// Headless test keys for automated CLI test scripts (retained for headless testing only per Phase 3.1)
const KNOWN_HEADLESS_KEYS: Record<string, Hex> = {
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8":
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc":
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
};

export interface ClaimableVaultItem {
  id: string;
  name: string;
  vaultNumber: string;
  decryptedShareEth: string;
  shareBps: number;
  originAddress: string;
  vaultContractAddress: Address;
  consensusAddress: Address;
  consensusState: ConsensusState;
  allocationRoot: Hex;
  salt: Hex;
  merkleProof: Hex[];
  isClaimed: boolean;
  isProofValid: boolean;
  decryptedBeneficiary?: string;
  timeUntilFinalizedSec?: number;
  isTimeoutExpired?: boolean;
}

export default function ClaimPortal() {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Loading & state
  const [isLoading, setIsLoading] = useState(true);
  const [vaults, setVaults] = useState<ClaimableVaultItem[]>([]);
  const [claimingVaultId, setClaimingVaultId] = useState<string | null>(null);
  const [claimReceipt, setClaimReceipt] = useState<{
    vaultNumber: string;
    txHash: string;
    amount: string;
  } | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isFinalizingVaultId, setIsFinalizingVaultId] = useState<string | null>(null);

  // Phase 3.1: Secure In-Memory ECIES Decryption Key State (Zero raw private key UI inputs)
  const [derivedDecryptionKey, setDerivedDecryptionKey] = useState<Hex | null>(null);
  const [isDerivingKey, setIsDerivingKey] = useState(false);
  const [hasEncryptedAllocations, setHasEncryptedAllocations] = useState(false);

  // Email Notification Binding banner state (DESIGN-SYSTEM.md item 4)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isConfirmedEmail, setIsConfirmedEmail] = useState(false);
  const [isSigningEmail, setIsSigningEmail] = useState(false);
  const [beneficiaryEmailInput, setBeneficiaryEmailInput] = useState("");
  const [isCustomEmailMode, setIsCustomEmailMode] = useState(false);
  const [suggestedEmail, setSuggestedEmail] = useState("alice@cadence.io");

  // Wrong-wallet recovery state (Zero-claims empty state)
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderSuccessMessage, setReminderSuccessMessage] = useState<string | null>(null);
  const [reminderErrorMessage, setReminderErrorMessage] = useState<string | null>(null);

  // Query notification status on mount (Constraint #6)
  useEffect(() => {
    let isMounted = true;
    if (!connectedAddress) return;
    getWalletNotificationStatus(connectedAddress)
      .then((status) => {
        if (!isMounted || !status) return;
        if (status.verified) {
          setIsConfirmedEmail(true);
        }
        if (status.email) {
          setSuggestedEmail(status.email);
        }
      })
      .catch((err) => {
        console.warn("[ClaimPortal] Status fetch error:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [connectedAddress]);

  // Phase 3.1: Secure in-memory key derivation via Web3 wallet personal_sign
  const handleDeriveDecryptionKey = useCallback(async () => {
    if (!connectedAddress) return;
    setIsDerivingKey(true);

    try {
      const normalized = getAddress(connectedAddress);
      const derivationMessage = `Cadence Inheritance Decryption Key\nWallet: ${normalized}\nSalt: cadence-ecies-v1\nSign this message to securely derive your local inheritance decryption key in-memory. This signature is never sent to any server.`;

      let sig: Hex | null = null;

      if (walletClient) {
        sig = await walletClient.signMessage({
          account: normalized,
          message: derivationMessage,
        });
      } else if (typeof window !== "undefined" && (window as unknown as { ethereum?: Parameters<typeof createWalletClient>[0]["transport"] }).ethereum) {
        const { custom } = await import("viem");
        const { sepolia } = await import("viem/chains");
        const injectedProvider = (window as unknown as { ethereum: Parameters<typeof custom>[0] }).ethereum;
        const client = createWalletClient({
          chain: sepolia,
          transport: custom(injectedProvider),
        });
        const [account] = await client.requestAddresses();
        sig = await client.signMessage({
          account: account || normalized,
          message: derivationMessage,
        });
      } else {
        // Headless test environment fallback
        const headlessKey = KNOWN_HEADLESS_KEYS[normalized.toLowerCase()];
        if (headlessKey) {
          const account = privateKeyToAccount(headlessKey);
          sig = await account.signMessage({ message: derivationMessage });
        } else {
          throw new Error("No Web3 wallet available to sign key derivation message.");
        }
      }

      if (sig) {
        const derivedKey = keccak256(sig);
        setDerivedDecryptionKey(derivedKey);
      }
    } catch (err) {
      console.warn("[ClaimPortal] User declined or error in key derivation signature:", err);
    } finally {
      setIsDerivingKey(false);
    }
  }, [connectedAddress, walletClient]);

  // Discover eligible vaults and decrypt allocations locally
  const loadEligibleVaults = useCallback(async () => {
    if (!connectedAddress) {
      setVaults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setClaimError(null);

    try {
      const normalizedAddress = getAddress(connectedAddress);
      const allVaults = getRegisteredVaults();

      // Phase 3.1: Derive key from in-memory wallet signature or headless fallback
      const keyToUse =
        derivedDecryptionKey ||
        KNOWN_HEADLESS_KEYS[normalizedAddress.toLowerCase()];

      const discovered: ClaimableVaultItem[] = [];
      let foundEncrypted = false;

      for (const v of allVaults) {
        // Check if connected address is in this vault's allocations
        const allocRecord = v.encryptedAllocations.find((a) => {
          try {
            return isAddressEqual(a.beneficiary, normalizedAddress);
          } catch {
            return a.beneficiary.toLowerCase() === normalizedAddress.toLowerCase();
          }
        });

        if (!allocRecord) continue;

        // 1. Read live on-chain consensus state
        let onChainState = v.consensusState;
        try {
          const rawState = await publicClient.readContract({
            address: v.vaultAddress,
            abi: INHERITANCE_VAULT_ABI,
            functionName: "getConsensusState",
          });
          onChainState = Number(rawState) as ConsensusState;
        } catch {
          // fallback to registered state
        }

        // 2. Read live on-chain allocation root
        let onChainRoot = v.allocationRoot;
        try {
          const root = await publicClient.readContract({
            address: v.vaultAddress,
            abi: INHERITANCE_VAULT_ABI,
            functionName: "allocationRoot",
          });
          if (root && root !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            onChainRoot = root as Hex;
          }
        } catch {
          // fallback to registered root
        }

        // 3. Read live on-chain hasClaimed status
        let isAlreadyClaimed = false;
        try {
          const claimed = await publicClient.readContract({
            address: v.vaultAddress,
            abi: INHERITANCE_VAULT_ABI,
            functionName: "hasClaimed",
            args: [normalizedAddress],
          });
          isAlreadyClaimed = Boolean(claimed);
        } catch {
          isAlreadyClaimed = (v.claimedAddresses || []).some((a) =>
            isAddressEqual(a, normalizedAddress)
          );
        }

        // 4. Perform client-side ECIES Decryption (Constraint #3)
        let shareBps = 0;
        let salt: Hex = "0x0000000000000000000000000000000000000000000000000000000000000000";
        let isProofValid = false;
        let merkleProof: Hex[] = [];

        if (allocRecord.ciphertext) {
          if (!allocRecord.ciphertext.startsWith("{")) {
            foundEncrypted = true;
          }

          try {
            if (allocRecord.ciphertext.startsWith("{")) {
              const parsed = JSON.parse(allocRecord.ciphertext);
              shareBps = Number(parsed.shareBps);
              const rawSalt = String(parsed.salt || "");
              salt = (rawSalt.startsWith("0x") ? rawSalt : `0x${rawSalt}`) as Hex;
            } else if (keyToUse) {
              const decrypted: AllocationData = await decryptAllocation(
                keyToUse,
                allocRecord.ciphertext
              );
              shareBps = Number(decrypted.shareBps);
              const rawSalt = String(decrypted.salt || "");
              salt = (rawSalt.startsWith("0x") ? rawSalt : `0x${rawSalt}`) as Hex;
            }
          } catch {
            // Headless fallback if keyToUse was not able to decrypt
            const headlessKey = KNOWN_HEADLESS_KEYS[normalizedAddress.toLowerCase()];
            if (headlessKey && headlessKey !== keyToUse) {
              try {
                const decrypted: AllocationData = await decryptAllocation(
                  headlessKey,
                  allocRecord.ciphertext
                );
                shareBps = Number(decrypted.shareBps);
                const rawSalt = String(decrypted.salt || "");
                salt = (rawSalt.startsWith("0x") ? rawSalt : `0x${rawSalt}`) as Hex;
              } catch {}
            }
          }

          // Generate cryptographic Merkle leaf & proof
          if (shareBps > 0) {
            try {
              const leaf = computeAllocationLeaf(normalizedAddress, shareBps, salt);
              if (v.leaves && v.leaves.length > 0) {
                try {
                  merkleProof = generateProofFromLeaves(v.leaves, leaf);
                  isProofValid = verifyProof(merkleProof, onChainRoot, leaf);
                } catch {
                  // Fallback for single-leaf tree or direct root match
                  if (leaf.toLowerCase() === onChainRoot.toLowerCase()) {
                    merkleProof = [];
                    isProofValid = true;
                  }
                }
              } else if (leaf.toLowerCase() === onChainRoot.toLowerCase()) {
                merkleProof = [];
                isProofValid = true;
              }
            } catch (leafErr) {
              console.warn("[ClaimPortal] Merkle leaf calculation error:", leafErr);
            }
          }
        }

        // Compute pro-rata share amount in ETH via live on-chain balance / snapshot
        let totalEstateWei = 0n;
        try {
          // Check if distribution snapshot was taken on-chain
          const snapshotEth = await publicClient.readContract({
            address: v.vaultAddress,
            abi: INHERITANCE_VAULT_ABI,
            functionName: "distributionSnapshot",
            args: ["0x0000000000000000000000000000000000000000"],
          });
          if (snapshotEth && (snapshotEth as bigint) > 0n) {
            totalEstateWei = snapshotEth as bigint;
          } else {
            const deposited = await publicClient.readContract({
              address: v.vaultAddress,
              abi: INHERITANCE_VAULT_ABI,
              functionName: "totalDeposited",
              args: ["0x0000000000000000000000000000000000000000"],
            });
            if (deposited && (deposited as bigint) > 0n) {
              totalEstateWei = deposited as bigint;
            } else {
              totalEstateWei = await publicClient.getBalance({ address: v.vaultAddress });
            }
          }
        } catch {
          totalEstateWei = v.ethBalanceWei || 0n;
        }
        if (totalEstateWei === 0n && v.ethBalanceWei) {
          totalEstateWei = v.ethBalanceWei;
        }

        const calculatedEthWei = shareBps > 0
          ? (totalEstateWei * BigInt(shareBps)) / 10000n
          : totalEstateWei;
        const calculatedEth = `${parseFloat(formatEther(calculatedEthWei)).toFixed(4)} ETH`;

        const vaultNum = v.id.replace("vault-", "#").slice(0, 5).toUpperCase();

        // Query live timeUntilFinalized and isTimeoutExpired from consensus contract
        let timeUntilFinalizedSec = 0;
        let isTimeoutExpiredOnChain = false;
        try {
          const tFinal = await publicClient.readContract({
            address: v.consensusAddress,
            abi: PROOF_OF_LIFE_CONSENSUS_ABI,
            functionName: "timeUntilFinalized",
            args: [v.vaultAddress],
          });
          timeUntilFinalizedSec = Number(tFinal);
        } catch {}

        try {
          const tExpired = await publicClient.readContract({
            address: v.consensusAddress,
            abi: PROOF_OF_LIFE_CONSENSUS_ABI,
            functionName: "isTimeoutExpired",
            args: [v.vaultAddress],
          });
          isTimeoutExpiredOnChain = Boolean(tExpired);
        } catch {}

        discovered.push({
          id: v.id,
          name: v.name,
          vaultNumber: vaultNum,
          decryptedShareEth: calculatedEth,
          shareBps,
          originAddress: `${v.owner.slice(0, 6)}...${v.owner.slice(-4)}`,
          vaultContractAddress: v.vaultAddress,
          consensusAddress: v.consensusAddress,
          consensusState: onChainState,
          allocationRoot: onChainRoot,
          salt,
          merkleProof,
          isClaimed: isAlreadyClaimed,
          isProofValid,
          decryptedBeneficiary: normalizedAddress,
          timeUntilFinalizedSec,
          isTimeoutExpired: isTimeoutExpiredOnChain,
        });
      }

      setVaults(discovered);
      setHasEncryptedAllocations(foundEncrypted);
    } catch (err) {
      console.error("[ClaimPortal] Failed to load eligible vaults:", err);
    } finally {
      setIsLoading(false);
    }
  }, [connectedAddress, derivedDecryptionKey]);

  useEffect(() => {
    loadEligibleVaults();
  }, [loadEligibleVaults]);

  const handleConfirmEmail = async () => {
    if (!connectedAddress) return;
    const targetEmail = isCustomEmailMode ? beneficiaryEmailInput : suggestedEmail;
    if (!targetEmail || !targetEmail.includes("@")) return;

    setIsSigningEmail(true);
    try {
      const result = await requestSignatureAndBind(connectedAddress, targetEmail);
      if (result.success && result.verified) {
        setIsConfirmedEmail(true);
        setIsCustomEmailMode(false);
      } else {
        alert(result.error || "Signature verification failed.");
      }
    } catch (err: unknown) {
      console.warn("[ClaimPortal] Email binding declined/error:", err);
      const msg = parseUserFriendlyError(err);
      alert(msg);
    } finally {
      setIsSigningEmail(false);
    }
  };

  const handleRemindWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail || !recoveryEmail.includes("@")) {
      setReminderErrorMessage("Please enter a valid email address.");
      setReminderSuccessMessage(null);
      return;
    }
    setIsSendingReminder(true);
    setReminderErrorMessage(null);
    setReminderSuccessMessage(null);
    try {
      const res = await requestWalletReminder(recoveryEmail.trim().toLowerCase());
      if (res.success) {
        setReminderSuccessMessage(
          res.message ||
            "If an account exists with that verified email, a reminder has been sent to your inbox."
        );
        setRecoveryEmail("");
      } else {
        setReminderErrorMessage(res.error || "Failed to submit reminder request.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReminderErrorMessage(msg || "Failed to submit reminder request.");
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleFinalizeContest = async (vault: ClaimableVaultItem) => {
    if (!connectedAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsFinalizingVaultId(vault.id);
    setClaimError(null);
    try {
      let client = walletClient;
      if (!client && connectedAddress) {
        const headlessKey = KNOWN_HEADLESS_KEYS[connectedAddress.toLowerCase()];
        if (headlessKey) {
          const localAccount = privateKeyToAccount(headlessKey);
          client = createWalletClient({
            account: localAccount,
            chain: cadenceSepolia,
            transport: sepoliaTransports,
          }) as unknown as typeof walletClient;
        }
      }
      if (!client) {
        throw new Error("No connected wallet client found. Please connect your wallet.");
      }
      const hash = await client.writeContract({
        chain: cadenceSepolia,
        address: vault.consensusAddress,
        abi: PROOF_OF_LIFE_CONSENSUS_ABI,
        functionName: "finalizeContest",
        args: [vault.vaultContractAddress],
        account: client.account || connectedAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await loadEligibleVaults();
    } catch (err: unknown) {
      console.warn("[ClaimPortal] Finalize contest error:", err);
      const msg = parseUserFriendlyError(err);
      setClaimError(msg);
    } finally {
      setIsFinalizingVaultId(null);
    }
  };

  const handleExecuteClaim = async (vault: ClaimableVaultItem) => {
    if (!connectedAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    if (vault.consensusState !== ConsensusState.Finalized) {
      alert(
        `Locker is currently in ${
          vault.consensusState === ConsensusState.Active
            ? "ACTIVE"
            : "CLAIM PENDING (Contest Window)"
        } state. Claims can only execute once the contest window concludes and the vault reaches FINALIZED status.`
      );
      return;
    }

    if (!vault.isProofValid) {
      if (!derivedDecryptionKey && hasEncryptedAllocations) {
        alert(
          "Your inheritance allocation is encrypted. Please authorize with your wallet in the next prompt to derive your claim key in-memory."
        );
        await handleDeriveDecryptionKey();
        return;
      }
      alert(
        "Cryptographic Merkle proof is not validated against the on-chain allocation root. Ensure your allocation is decrypted properly."
      );
      return;
    }

    setClaimingVaultId(vault.id);
    setClaimError(null);

    try {
      // 1. Verify target vault is deployed on Sepolia
      const bytecode = await publicClient.getBytecode({ address: vault.vaultContractAddress });
      if (!bytecode || bytecode === "0x") {
        throw new Error(
          `Vault contract ${vault.vaultContractAddress} is not deployed on Sepolia. Please select a valid deployed locker.`
        );
      }

      // 2. Resolve signer (connected wallet or headless test account fallback)
      let effectiveClient = walletClient;
      let effectiveAccount: Account | Address = walletClient?.account || connectedAddress;

      if (!effectiveClient && connectedAddress) {
        const headlessKey = KNOWN_HEADLESS_KEYS[connectedAddress.toLowerCase()];
        if (headlessKey) {
          const localAccount = privateKeyToAccount(headlessKey);
          effectiveClient = createWalletClient({
            account: localAccount,
            chain: cadenceSepolia,
            transport: sepoliaTransports,
          }) as unknown as typeof walletClient;
          effectiveAccount = localAccount;
        }
      }

      if (!effectiveClient) {
        throw new Error("No connected wallet client found. Please connect your wallet.");
      }

      // 4. Execute on-chain claim(shareBps, salt, proof)
      let txHash: Hex;
      try {
        txHash = await effectiveClient.writeContract({
          chain: cadenceSepolia,
          address: vault.vaultContractAddress,
          abi: INHERITANCE_VAULT_ABI,
          functionName: "claim",
          args: [BigInt(vault.shareBps), vault.salt, vault.merkleProof],
          account: effectiveAccount,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        if (receipt.status !== "success") {
          throw new Error(`Claim transaction reverted on-chain (status: ${receipt.status})`);
        }
      } catch (claimErr: unknown) {
        const msg = claimErr instanceof Error ? claimErr.message : String(claimErr);
        throw new Error(`Claim transaction failed on Sepolia: ${msg}`);
      }

      // Mark locally as claimed
      setVaults((prev) =>
        prev.map((v) => (v.id === vault.id ? { ...v, isClaimed: true } : v))
      );

      setClaimReceipt({
        vaultNumber: vault.vaultNumber,
        txHash,
        amount: vault.decryptedShareEth,
      });
    } catch (err: unknown) {
      console.warn("[ClaimPortal] Claim execution paused/declined:", err);
      const msg = parseUserFriendlyError(err);
      setClaimError(msg);
    } finally {
      setClaimingVaultId(null);
    }
  };

  const finalizedCount = vaults.filter(
    (v) => v.consensusState === ConsensusState.Finalized && !v.isClaimed
  ).length;

  const primaryState = useMemo(() => {
    if (vaults.length === 0) return ConsensusState.Finalized;
    if (vaults.some((v) => v.consensusState === ConsensusState.Finalized)) {
      return ConsensusState.Finalized;
    }
    if (vaults.some((v) => v.consensusState === ConsensusState.ClaimPending)) {
      return ConsensusState.ClaimPending;
    }
    return ConsensusState.Active;
  }, [vaults]);

  const activeSuggester = vaults[0]?.originAddress || "the vault owner";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-[#E8ECF1] font-sans">
      {/* ========================================================================= */}
      {/* HERO STATUS CARD (Dynamically reflects primary locker state)               */}
      {/* ========================================================================= */}
      <div
        className={`rounded-2xl bg-[#12161F] p-6 shadow-xl relative overflow-hidden transition-all ${
          primaryState === ConsensusState.Finalized
            ? "border border-[#F5484A]"
            : primaryState === ConsensusState.ClaimPending
            ? "border border-[#F5B841]"
            : "border border-[#2EE6A8]"
        }`}
      >
        {/* Top Header of Hero Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Status Pill Badge */}
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 ${
                primaryState === ConsensusState.Finalized
                  ? "bg-[#F5484A]/10 text-[#F5484A] border border-[#F5484A]/40"
                  : primaryState === ConsensusState.ClaimPending
                  ? "bg-[#F5B841]/10 text-[#F5B841] border border-[#F5B841]/40"
                  : "bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/40"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  primaryState === ConsensusState.Finalized
                    ? "bg-[#F5484A]"
                    : primaryState === ConsensusState.ClaimPending
                    ? "bg-[#F5B841]"
                    : "bg-[#2EE6A8]"
                }`}
              />
              {primaryState === ConsensusState.Finalized
                ? "HEARTBEAT EXPIRED"
                : primaryState === ConsensusState.ClaimPending
                ? "CLAIM CHALLENGE WINDOW OPEN"
                : "ACTIVE SIGNAL"}
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-[#E8ECF1] tracking-tight">
              {primaryState === ConsensusState.Finalized
                ? "Locker Heartbeat Flatlined"
                : primaryState === ConsensusState.ClaimPending
                ? "Locker Heartbeat Erratic"
                : "Locker Heartbeat Rhythm"}
            </h1>
          </div>

          {/* Right-aligned Status Label */}
          <div
            className={`text-xs font-mono tracking-wider uppercase font-semibold ${
              primaryState === ConsensusState.Finalized
                ? "text-[#F5484A]"
                : primaryState === ConsensusState.ClaimPending
                ? "text-[#F5B841]"
                : "text-[#2EE6A8]"
            }`}
          >
            {primaryState === ConsensusState.Finalized
              ? "STATUS: DISCHARGED"
              : primaryState === ConsensusState.ClaimPending
              ? "STATUS: CONTEST WINDOW"
              : "STATUS: ACTIVE MONITORING"}
          </div>
        </div>

        {/* Live Real-Time ECG Line reacting dynamically to state */}
        <LiveECGMonitor
          state={
            primaryState === ConsensusState.Finalized
              ? "flatline"
              : primaryState === ConsensusState.ClaimPending
              ? "erratic"
              : "active"
          }
          bpm={
            primaryState === ConsensusState.Finalized
              ? 0
              : primaryState === ConsensusState.ClaimPending
              ? 92
              : 62
          }
        />
      </div>

      {/* ========================================================================= */}
      {/* EMAIL NOTIFICATION BINDING BANNER (DESIGN-SYSTEM.md item 4)               */}
      {/* ========================================================================= */}
      {!isBannerDismissed && connectedAddress && (
        <div className="rounded-2xl bg-[#12161F] border border-[#F5B841]/40 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#F5B841]/10 text-[#F5B841] shrink-0 mt-0.5 border border-[#F5B841]/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                    isConfirmedEmail
                      ? "bg-[#2EE6A8]/15 text-[#2EE6A8] border border-[#2EE6A8]/30"
                      : "bg-[#F5B841]/15 text-[#F5B841] border border-[#F5B841]/30"
                  }`}
                >
                  {isConfirmedEmail ? "✓ Bound & Verified" : "● Pending signature"}
                </span>
                <span className="text-xs text-[#8993A6]">Beneficiary Notification Email</span>
              </div>

              {isCustomEmailMode ? (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1 w-full">
                  <input
                    type="email"
                    value={beneficiaryEmailInput}
                    onChange={(e) => setBeneficiaryEmailInput(e.target.value)}
                    placeholder="beneficiary@example.com"
                    className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0A0E14] border border-[#232838] text-[#E8ECF1] focus:outline-none focus:border-[#2EE6A8] w-full sm:w-56"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmEmail}
                      disabled={isSigningEmail || !beneficiaryEmailInput.includes("@")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {isSigningEmail ? "Signing..." : "Sign & Bind"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomEmailMode(false)}
                      className="text-xs text-[#8993A6] hover:text-[#E8ECF1] px-1 cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#E8ECF1] font-sans leading-relaxed">
                  An email (<span className="font-mono text-[#F5B841]">{suggestedEmail}</span>) was suggested for this wallet by <span className="font-mono text-[#2EE6A8]">{activeSuggester}</span> — confirm it to receive future claim notices.
                </p>
              )}

              <p className="text-[11px] text-[#8993A6]">
                {isConfirmedEmail
                  ? "✓ Verified via wallet signature (EIP-712). Alerts will be dispatched if another vault finalizes."
                  : "Requires your personal wallet signature to verify ownership before notifications are enabled."}
              </p>
            </div>
          </div>

          {!isCustomEmailMode && (
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleConfirmEmail}
                disabled={isSigningEmail || isConfirmedEmail}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isConfirmedEmail
                    ? "bg-[#2EE6A8]/15 text-[#2EE6A8] border border-[#2EE6A8]/40"
                    : "bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] shadow-[0_0_16px_rgba(46,230,168,0.25)]"
                }`}
              >
                {isConfirmedEmail ? "✓ Confirmed" : isSigningEmail ? "Signing..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setIsCustomEmailMode(true)}
                className="text-xs text-[#8993A6] hover:text-[#E8ECF1] px-2 py-1 cursor-pointer"
              >
                Use Different Email
              </button>
              <button
                type="button"
                onClick={() => setIsBannerDismissed(true)}
                className="text-xs text-[#8993A6] hover:text-[#E8ECF1] px-1 py-1 cursor-pointer"
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Claim Receipt Confirmation */}
      {claimReceipt && (
        <div className="p-5 rounded-2xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/40 text-[#2EE6A8] text-xs font-mono space-y-1.5 animate-in fade-in">
          <div className="font-bold flex items-center gap-2 text-sm">
            <span>✓ Claim Successfully Executed for Vault {claimReceipt.vaultNumber}</span>
          </div>
          <p className="text-xs text-[#E8ECF1] font-sans">
            Transferred <span className="font-mono font-bold text-[#2EE6A8]">{claimReceipt.amount}</span> directly to your connected wallet on Sepolia.
          </p>
          <div className="text-[11px] text-[#8993A6] space-y-0.5 pt-1">
            <div>
              Tx Hash:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${claimReceipt.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#2EE6A8] underline hover:text-[#3bf5b6]"
              >
                {claimReceipt.txHash} ↗
              </a>
            </div>
            <div>Allocation Leaf Verified: <span className="text-[#2EE6A8]">Keccak-256 Merkle Proof validated on-chain</span></div>
          </div>
        </div>
      )}

      {/* Claim Error Card */}
      {claimError && (
        <div className="p-4 rounded-xl bg-[#F5484A]/10 border border-[#F5484A]/40 text-[#F5484A] text-xs font-mono space-y-1">
          <div className="font-bold">✕ Claim Execution Failed</div>
          <div className="text-[11px] text-[#E8ECF1]">{claimError}</div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: YOUR ELIGIBLE INHERITANCE CLAIMS                                */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#E8ECF1] tracking-tight">
            Your Eligible Inheritance Claims
          </h2>
          {vaults.length > 0 && (
            <span className="text-xs font-mono text-[#F5484A] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5484A]" />
              Listed on {vaults.length} vaults ({finalizedCount} finalized)
            </span>
          )}
        </div>

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 h-64 animate-pulse" />
            <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 h-64 animate-pulse" />
          </div>
        )}

        {/* Genuine Empty State (Constraint #3: No Dummy Cards) */}
        {!isLoading && vaults.length === 0 && (
          <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-8 sm:p-12 text-center shadow-xl space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#1A1F2B] border border-[#232838] flex items-center justify-center text-[#8993A6]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-[#E8ECF1]">
                No Inheritance Allocations Found
              </h3>
              <p className="text-xs text-[#8993A6] leading-relaxed">
                {connectedAddress ? (
                  <>
                    Connected wallet <span className="font-mono text-[#E8ECF1]">{connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}</span> is not listed as an heir on any registered lockers, or no encrypted allocations match this address.
                  </>
                ) : (
                  "Please connect your wallet to scan for encrypted inheritance allocations."
                )}
              </p>
            </div>

            {/* Wrong-Wallet Recovery Section */}
            <div className="p-5 rounded-2xl bg-[#0A0E14] border border-[#232838] max-w-md mx-auto text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center text-xs">
                  🔍
                </div>
                <h4 className="text-xs font-semibold text-[#E8ECF1] uppercase tracking-wider">
                  Think this might be the wrong wallet?
                </h4>
              </div>
              <p className="text-xs text-[#8993A6] leading-relaxed">
                Enter the email you expect notifications at, and we&apos;ll send you a reminder of which wallet to check.
              </p>

              <form onSubmit={handleRemindWallet} className="space-y-2.5 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Enter your notification email"
                    disabled={isSendingReminder}
                    className="flex-1 bg-[#12161F] border border-[#232838] rounded-xl px-3.5 py-2 text-xs text-[#E8ECF1] placeholder-[#5A6478] focus:outline-none focus:border-[#00E5FF] transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReminder || !recoveryEmail.trim()}
                    className="bg-[#00E5FF] hover:bg-[#00cce6] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0E14] font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    {isSendingReminder ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-[#0A0E14]" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Checking...</span>
                      </>
                    ) : (
                      "Send Reminder"
                    )}
                  </button>
                </div>

                {reminderSuccessMessage && (
                  <div className="p-3 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-[#2EE6A8] text-xs flex items-start gap-2">
                    <span className="text-sm leading-none">✓</span>
                    <span className="leading-snug">{reminderSuccessMessage}</span>
                  </div>
                )}

                {reminderErrorMessage && (
                  <div className="p-3 rounded-xl bg-[#F5484A]/10 border border-[#F5484A]/30 text-[#F5484A] text-xs flex items-start gap-2">
                    <span className="text-sm leading-none">⚠</span>
                    <span className="leading-snug">{reminderErrorMessage}</span>
                  </div>
                )}

                <p className="text-[11px] text-[#5A6478] leading-tight">
                  🔒 Privacy invariant: For security, registered addresses are never revealed in the browser. The reminder is delivered strictly to the verified inbox.
                </p>
              </form>
            </div>
          </div>
        )}

        {/* Phase 3.1: Secure In-Memory Decryption Unlock Bar */}
        {hasEncryptedAllocations && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#00E5FF]/10 to-[#2EE6A8]/10 border border-[#00E5FF]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/20 text-[#00E5FF] flex items-center justify-center text-lg">
                🔒
              </div>
              <div>
                <div className="text-xs font-bold text-[#E8ECF1]">
                  {derivedDecryptionKey ? "✓ ECIES Decryption Key Derived In-Memory" : "Encrypted Allocations Detected (ECIES)"}
                </div>
                <div className="text-[11px] text-[#8993A6]">
                  {derivedDecryptionKey
                    ? "Your allocation share was decrypted locally without exposing any raw private key."
                    : "Sign a deterministic authorization with your Web3 wallet to derive your decryption key in-memory. Zero private key input required."}
                </div>
              </div>
            </div>
            {!derivedDecryptionKey && (
              <button
                type="button"
                disabled={isDerivingKey}
                onClick={handleDeriveDecryptionKey}
                className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-[#0A0E14] text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {isDerivingKey ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-[#0A0E14]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing with Wallet...</span>
                  </>
                ) : (
                  <>
                    <span>🔑 Unlock & Decrypt Share</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Eligible Vault Cards Grid */}
        {!isLoading && vaults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                className={`rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg flex flex-col justify-between transition-all ${
                  vault.isClaimed ? "opacity-60" : "hover:border-[#3E4759]"
                }`}
              >
                <div className="space-y-4">
                  {/* Card Top Row: VAULT ID & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-[#8993A6] tracking-wider uppercase font-semibold">
                        VAULT: {vault.vaultNumber}
                      </span>
                      <div className="text-xs text-[#E8ECF1] font-semibold">{vault.name}</div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border tracking-wide ${
                        vault.isClaimed
                          ? "bg-[#2EE6A8]/10 text-[#2EE6A8] border-[#2EE6A8]/30"
                          : vault.consensusState === ConsensusState.Finalized
                          ? "bg-[#F5484A]/10 text-[#F5484A] border-[#F5484A]/30"
                          : "bg-[#F5B841]/10 text-[#F5B841] border-[#F5B841]/30"
                      }`}
                    >
                      {vault.isClaimed
                        ? "CLAIMED"
                        : vault.consensusState === ConsensusState.Finalized
                        ? "FINALIZED"
                        : vault.consensusState === ConsensusState.Active
                        ? "ACTIVE · MONITORING"
                        : "CONTEST WINDOW"}
                    </span>
                  </div>

                  {/* Inheritor Decrypted Share */}
                  <div>
                    <div className="text-xs text-[#8993A6] font-sans mb-1 flex items-center justify-between">
                      <span>Inheritor Decrypted Share</span>
                      <span className="font-mono text-[#2EE6A8] text-[11px]">
                        {(vault.shareBps / 100).toFixed(2)}% Allocation
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-[#E8ECF1] tracking-tight truncate">
                      {vault.decryptedShareEth}
                    </div>
                  </div>

                  {/* Cryptographic Verification Status */}
                  <div className="p-3 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8993A6]">ECIES Decryption:</span>
                      <span className={vault.shareBps > 0 ? "text-[#2EE6A8]" : "text-[#F5B841]"}>
                        {vault.shareBps > 0 ? "✓ Verified Locally" : "Pending Unlock"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8993A6]">Merkle Leaf Proof:</span>
                      <span className={vault.isProofValid ? "text-[#2EE6A8]" : "text-[#F5B841]"}>
                        {vault.isProofValid ? "✓ Root Membership Valid" : "Pending Key"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8993A6]">Locker Contract:</span>
                      <span className="text-[#E8ECF1]">
                        {vault.vaultContractAddress.slice(0, 6)}...{vault.vaultContractAddress.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button Section */}
                <div className="pt-6">
                  {vault.isClaimed ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#1A1F2B] text-[#5A6478] border border-[#232838] cursor-not-allowed"
                    >
                      ✓ Claim Already Executed
                    </button>
                  ) : vault.consensusState === ConsensusState.Finalized ? (
                    !vault.isProofValid && hasEncryptedAllocations && !derivedDecryptionKey ? (
                      <button
                        type="button"
                        disabled={isDerivingKey}
                        onClick={handleDeriveDecryptionKey}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00E5FF] to-[#2EE6A8] text-[#0A0E14] hover:opacity-95 active:scale-[0.98] shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isDerivingKey ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-[#0A0E14]" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Authorizing Decryption...</span>
                          </>
                        ) : (
                          <span>🔑 Unlock Allocation to Claim</span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={claimingVaultId === vault.id || !vault.isProofValid}
                        onClick={() => handleExecuteClaim(vault)}
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          vault.isProofValid
                            ? "bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] active:scale-[0.98] shadow-[0_0_20px_rgba(46,230,168,0.3)] cursor-pointer"
                            : "bg-[#1A1F2B] text-[#5A6478] border border-[#232838] cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {claimingVaultId === vault.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-[#0A0E14]" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Submitting Claim to Sepolia...</span>
                          </>
                        ) : (
                          <span>{vault.isProofValid ? "Execute Inheritance Claim" : "Proof Invalid for This Address"}</span>
                        )}
                      </button>
                    )
                  ) : vault.consensusState === ConsensusState.ClaimPending ? (
                    vault.timeUntilFinalizedSec === 0 ? (
                      <div className="space-y-2.5">
                        <div className="p-3 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-xs text-[#2EE6A8]">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>✓ Challenge Grace Period Elapsed</span>
                          </div>
                          <p className="text-[11px] text-[#E8ECF1] font-sans pt-0.5">
                            The contest window has elapsed without owner cancellation. Finalize the locker on Sepolia to unlock your claim.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isFinalizingVaultId === vault.id}
                          onClick={() => handleFinalizeContest(vault)}
                          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#F5B841] to-[#2EE6A8] text-[#0A0E14] hover:opacity-90 active:scale-[0.98] shadow-[0_0_20px_rgba(46,230,168,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isFinalizingVaultId === vault.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-[#0A0E14]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Finalizing on Sepolia...</span>
                            </>
                          ) : (
                            <span>⚡ Finalize Contest &amp; Unlock Claim</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-[#F5B841]/10 border border-[#F5B841]/30 text-xs text-[#F5B841] text-center font-mono">
                          ⏳ Contest Window Active ({Math.ceil((vault.timeUntilFinalizedSec || 0) / 60)}m remaining)
                        </div>
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 px-6 rounded-xl font-bold text-xs bg-[#1A1F2B] text-[#8993A6] border border-[#232838] cursor-not-allowed text-center"
                        >
                          Awaiting Challenge Expiration
                        </button>
                      </div>
                    )
                  ) : (
                    /* ConsensusState.Active */
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-[#F5B841]/10 border border-[#F5B841]/30 text-xs text-[#F5B841]">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>● Locker In Active Monitoring</span>
                        </div>
                        <p className="text-[11px] text-[#E8ECF1] font-sans pt-0.5">
                          {vault.isTimeoutExpired
                            ? "Heartbeat check-in has elapsed! Advance the locker through the Contest Window to finalize."
                            : "Owner heartbeat is still active. Payouts require an elapsed heartbeat and completed contest window."}
                        </p>
                      </div>
                      <Link
                        href="/contest"
                        className="w-full py-3 px-5 rounded-xl font-bold text-xs bg-[#F5B841] text-[#0A0E14] hover:bg-[#ffc857] transition-all flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(245,184,65,0.25)]"
                      >
                        <span>⚡ Advance in Contest Window Portal →</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
