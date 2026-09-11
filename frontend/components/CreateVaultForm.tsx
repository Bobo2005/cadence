"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount, useWalletClient, useSwitchChain } from "wagmi";
import { useToast } from "./ui/Toast";
import {
  type Address,
  type Hex,
  parseEther,
  getAddress,
  isAddress,
  createWalletClient,
  custom,
} from "viem";
import { sepolia } from "viem/chains";
import BeneficiarySetupForm, { type BeneficiaryItem } from "./BeneficiarySetupForm";
import {
  buildAllocationTree,
  buildGuardianTree,
  type BeneficiaryAllocation,
  type MerkleTreeResult,
} from "../lib/merkle";
import { encryptAllocation } from "../lib/encryption";
import {
  suggestBeneficiaryEmail,
  requestSignatureAndBind,
} from "../lib/notifications";
import {
  CONTRACT_ADDRESSES,
  publicClient,
  ONE_CLICK_VAULT_ABI,
  ONE_CLICK_VAULT_BYTECODE,
  ConsensusState,
} from "../lib/contracts.ts";
import {
  saveRegisteredVault,
  getProvisioningState,
  clearProvisioningState,
  type ProvisioningState,
} from "../lib/vaultRegistry.ts";

export const GRACE_PERIOD_OPTIONS = [
  { label: "5 Min (Test)", display: "5 Minutes (Testing)", seconds: 300 },
  { label: "15 Min (Test)", display: "15 Minutes (Testing)", seconds: 900 },
  { label: "24 Hours", display: "24 Hours", seconds: 86400 },
  { label: "72 Hours", display: "72 Hours (Default)", seconds: 259200 },
];

export const CHECKIN_INTERVALS = [
  { label: "5 Min (Test)", seconds: 300 },
  { label: "10 Min (Test)", seconds: 600 },
  { label: "30 Days", seconds: 86400 * 30 },
  { label: "60 Days", seconds: 86400 * 60 },
  { label: "90 Days", seconds: 86400 * 90 },
  { label: "180 Days", seconds: 86400 * 180 },
];

const SUPPORTED_TOKENS = [
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "USDT", name: "Tether USD" },
  { symbol: "WBTC", name: "Wrapped Bitcoin" },
];

export function parseUserFriendlyError(err: unknown): string {
  if (!err) return "An unexpected error occurred.";
  const errorObj = err as {
    message?: string;
    details?: string;
    shortMessage?: string;
    name?: string;
    code?: number;
  };

  const message = String(errorObj?.message || "");
  const details = String(errorObj?.details || "");
  const shortMsg = String(errorObj?.shortMessage || "");
  const name = String(errorObj?.name || "");

  // Detect user rejection in wallet (MetaMask error code 4001, UserRejectedRequestError, etc.)
  if (
    name === "UserRejectedRequestError" ||
    errorObj?.code === 4001 ||
    message.toLowerCase().includes("user rejected") ||
    details.toLowerCase().includes("user rejected") ||
    shortMsg.toLowerCase().includes("user rejected") ||
    message.toLowerCase().includes("rejected the request") ||
    details.toLowerCase().includes("rejected the request")
  ) {
    return "Transaction was cancelled or rejected in your wallet. Click 'Retry Step' whenever you are ready to proceed.";
  }

  // Detect insufficient funds
  if (
    message.toLowerCase().includes("insufficient funds") ||
    shortMsg.toLowerCase().includes("insufficient funds") ||
    details.toLowerCase().includes("insufficient funds")
  ) {
    return "Insufficient Sepolia ETH in your connected wallet to cover gas and deposit fees.";
  }

  // Return clean short message if available (avoids huge hex bytecode dumps)
  if (shortMsg && shortMsg.length < 200) {
    return shortMsg;
  }

  // Fallback to first line of error message
  const firstLine = message.split("\n")[0] || String(err);
  return firstLine.length > 180 ? firstLine.slice(0, 180) + "..." : firstLine;
}

interface CreateVaultFormProps {
  onDeploySuccess?: (result: MerkleTreeResult) => void;
}

export default function CreateVaultForm({ onDeploySuccess }: CreateVaultFormProps) {
  const { address: connectedAddress, chain } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const { showToast } = useToast();

  const getEffectiveWalletClient = useCallback(async () => {
    if (wagmiWalletClient) return wagmiWalletClient;
    if (typeof window !== "undefined" && connectedAddress) {
      const eth = (window as unknown as { ethereum?: Parameters<typeof custom>[0] }).ethereum;
      if (eth) {
        try {
          const client = createWalletClient({
            account: connectedAddress,
            chain: sepolia,
            transport: custom(eth),
          });
          return client;
        } catch (err) {
          console.warn("[CreateVaultForm] Fallback wallet client error:", err);
        }
      }
    }
    return null;
  }, [wagmiWalletClient, connectedAddress]);

  // Step 1: Deposit Capital state
  const [depositAmount, setDepositAmount] = useState<string>("0.05");
  const [selectedToken, setSelectedToken] = useState<string>("ETH");

  // Step 2: Beneficiary Allocation state
  const [isBeneficiaryValid, setIsBeneficiaryValid] = useState(true);
  const [currentTotalBps, setCurrentTotalBps] = useState(10000);
  const [allocationsList, setAllocationsList] = useState<BeneficiaryAllocation[]>([]);
  const [beneficiaryItems, setBeneficiaryItems] = useState<BeneficiaryItem[]>([]);
  const [validationError, setValidationError] = useState<string | undefined>();

  // Step 3: Heartbeat & Guardians state
  const [selectedInterval, setSelectedInterval] = useState(CHECKIN_INTERVALS[4]); // 90 Days default
  const [selectedGracePeriod, setSelectedGracePeriod] = useState(GRACE_PERIOD_OPTIONS[0]); // 5 Min (Test) default for quick testing
  const [guardian1, setGuardian1] = useState("");
  const [guardian2, setGuardian2] = useState("");

  // Optional owner notification email binding
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isOwnerEmailVerified, setIsOwnerEmailVerified] = useState(false);
  const [isSigningOwnerEmail, setIsSigningOwnerEmail] = useState(false);

  // In-progress provisioning state (Partial-failure recovery & Resume mechanism)
  const [savedProvisioning, setSavedProvisioning] = useState<ProvisioningState | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepStatus, setStepStatus] = useState<"idle" | "in_progress" | "success" | "error">("idle");
  const [activeStepDescription, setActiveStepDescription] = useState<string>("");
  const [stepError, setStepError] = useState<string | null>(null);

  // Deployed artifacts during multi-step provisioning
  const [provisionedVaultAddress, setProvisionedVaultAddress] = useState<Address | null>(null);
  const [txHashes, setTxHashes] = useState<{
    deploy?: Hex;
    deposit?: Hex;
    allocationRoot?: Hex;
    guardianRoot?: Hex;
  }>({});
  const [isCompleted, setIsCompleted] = useState(false);

  // Check localStorage for in-progress provisioning on mount / address change
  useEffect(() => {
    if (connectedAddress) {
      const state = getProvisioningState(connectedAddress);
      if (state && state.step < 5) {
        setSavedProvisioning(state);
        if (state.vaultAddress) {
          setProvisionedVaultAddress(state.vaultAddress);
        }
        if (state.txHashes) {
          setTxHashes(state.txHashes);
        }
      } else {
        setSavedProvisioning(null);
      }
    }
  }, [connectedAddress]);

  const handleBeneficiaryChange = useCallback(
    (data: {
      beneficiaries: BeneficiaryItem[];
      totalBps: number;
      isValid: boolean;
      allocations: BeneficiaryAllocation[];
      errorMessage?: string;
    }) => {
      setIsBeneficiaryValid(data.isValid);
      setCurrentTotalBps(data.totalBps);
      setAllocationsList(data.allocations);
      setBeneficiaryItems(data.beneficiaries);
      setValidationError(data.errorMessage);
    },
    []
  );

  const handleVerifyOwnerEmail = async () => {
    if (!ownerEmail || !ownerEmail.includes("@") || !connectedAddress) return;
    setIsSigningOwnerEmail(true);
    try {
      const result = await requestSignatureAndBind(connectedAddress, ownerEmail);
      if (result.success && result.verified) {
        setIsOwnerEmailVerified(true);
        showToast("Email bound & verified.", "success");
      } else {
        showToast(result.error || "Failed to verify signature for email binding.", "error");
      }
    } catch (err: unknown) {
      console.warn("[CreateVault] Owner email binding failed/declined:", err);
      const msg = parseUserFriendlyError(err);
      showToast(msg, "error");
    } finally {
      setIsSigningOwnerEmail(false);
    }
  };

  // Discard saved provisioning session
  const handleDiscardSavedProvisioning = () => {
    if (window.confirm("Are you sure you want to discard the previous in-progress vault setup?")) {
      if (connectedAddress) {
        clearProvisioningState(connectedAddress);
      }
      setSavedProvisioning(null);
      setProvisionedVaultAddress(null);
      setTxHashes({});
      setCurrentStep(1);
    }
  };

  // Resume provisioning from saved point
  const handleResumeSavedProvisioning = () => {
    if (!savedProvisioning) return;
    setCurrentStep(savedProvisioning.step);
    if (savedProvisioning.vaultAddress) {
      setProvisionedVaultAddress(savedProvisioning.vaultAddress);
    }
    if (savedProvisioning.txHashes) {
      setTxHashes(savedProvisioning.txHashes);
    }
    setIsModalOpen(true);
    setStepStatus("idle");
    setStepError(null);
  };

  // Start fresh provisioning
  const handleStartProvisioning = async () => {
    if (!connectedAddress) {
      showToast("Please connect your wallet to deploy a vault.", "warning");
      return;
    }

    // Auto-switch to Sepolia if on another network (Mainnet, Polygon, Base, etc.)
    if (chain && chain.id !== 11155111) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: 11155111 });
        } else if (typeof window !== "undefined") {
          const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
          if (eth) {
            await eth.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0xaa36a7" }],
            });
          }
        }
      } catch {
        showToast(
          "Your wallet is on " +
            (chain.name || "another network") +
            ". Please switch to Ethereum Sepolia (Chain ID 11155111).",
          "warning"
        );
        return;
      }
    }

    const client = await getEffectiveWalletClient();
    if (!client) {
      showToast("Unable to access wallet signer. Please ensure your wallet is unlocked and on Sepolia.", "error");
      return;
    }

    if (!isBeneficiaryValid || currentTotalBps !== 10000) {
      setValidationError("Beneficiary shares must sum to exactly 10,000 bps (100%) before deploying.");
      return;
    }

    // Auto-fill demo guardians if left empty to prevent user drop-off
    let effectiveG1 = guardian1.trim();
    let effectiveG2 = guardian2.trim();
    if (!effectiveG1 || !effectiveG2) {
      effectiveG1 = effectiveG1 || "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2";
      effectiveG2 = effectiveG2 || "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0";
      setGuardian1(effectiveG1);
      setGuardian2(effectiveG2);
    }

    if (!isAddress(effectiveG1) || !isAddress(effectiveG2)) {
      showToast("Please specify two valid guardian Ethereum addresses.", "warning");
      return;
    }

    setCurrentStep(1);
    setIsModalOpen(true);
    setStepStatus("idle");
    setStepError(null);
    executeStep();
  };

  // 1-Click Unified Provisioning Orchestrator (Single Signature & Single Transaction)
  const executeStep = async () => {
    const client = await getEffectiveWalletClient();
    if (!connectedAddress || !client) {
      setStepError("Wallet signer not connected or not on Sepolia. Please verify your wallet connection.");
      setStepStatus("error");
      return;
    }

    setStepStatus("in_progress");
    setStepError(null);
    setCurrentStep(1);

    try {
      // 1-Click deployment
      setActiveStepDescription("Requesting 1-Click Vault deployment authorization in wallet...");

      const effectiveG1 = guardian1.trim() || "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2";
      const effectiveG2 = guardian2.trim() || "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0";

      // Compute cryptographic Merkle tree commitments client-side
      const guardianTree = buildGuardianTree([getAddress(effectiveG1), getAddress(effectiveG2)]);
      const allocTree = buildAllocationTree(allocationsList);

      const depositWei = parseEther(depositAmount || "0");
      const checkInSec = BigInt(selectedInterval.seconds);
      const contestSec = BigInt(selectedGracePeriod.seconds);

      // Deploy OneClickInheritanceVault
      const deployHash = await client.deployContract({
        abi: ONE_CLICK_VAULT_ABI,
        bytecode: ONE_CLICK_VAULT_BYTECODE,
        account: client.account || connectedAddress,
        value: depositWei,
        args: [
          (client.account?.address || connectedAddress) as Address,
          checkInSec,
          contestSec,
          allocTree.root,
          CONTRACT_ADDRESSES.guardianRegistry,
          guardianTree.root,
          2n,
          2n,
          CONTRACT_ADDRESSES.consensus,
        ],
      });

      const singleTxHashes = {
        deploy: deployHash,
        deposit: deployHash,
        allocationRoot: deployHash,
        guardianRoot: deployHash,
      };
      setTxHashes(singleTxHashes);
      setActiveStepDescription("Mining 1-click deployment transaction on Sepolia block...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
      if (!receipt.contractAddress) {
        throw new Error("Contract deployment succeeded but contractAddress was not returned in receipt.");
      }
      const deployedAddress = receipt.contractAddress;
      setProvisionedVaultAddress(deployedAddress);

      // Build encrypted allocations for beneficiaries
      const encryptedAllocationsList = await Promise.all(
        allocationsList.map(async (a, idx) => {
          const pubKey = (beneficiaryItems[idx] as BeneficiaryItem & { publicKey?: string })?.publicKey;
          let ciphertext = "";
          if (pubKey) {
            try {
              ciphertext = await encryptAllocation(pubKey, {
                beneficiary: a.address,
                shareBps: Number(a.shareBps),
                salt: a.salt,
              });
            } catch {
              ciphertext = JSON.stringify({ shareBps: Number(a.shareBps), salt: a.salt });
            }
          } else {
            ciphertext = JSON.stringify({ shareBps: Number(a.shareBps), salt: a.salt, beneficiary: a.address });
          }

          return {
            beneficiary: a.address,
            ciphertext,
            label: beneficiaryItems[idx]?.name || `Beneficiary ${idx + 1}`,
          };
        })
      );

      // Register in local vault registry
      saveRegisteredVault({
        id: `vault-${Date.now()}`,
        vaultAddress: deployedAddress,
        owner: connectedAddress,
        consensusAddress: CONTRACT_ADDRESSES.consensus,
        name: "Inheritance Vault",
        createdAt: Date.now(),
        consensusState: ConsensusState.Active,
        ethBalance: depositAmount || "0",
        ethBalanceWei: depositWei,
        tokenBalances: [{ symbol: selectedToken, amount: depositAmount || "0" }],
        leaves: allocTree.leaves,
        encryptedAllocations: encryptedAllocationsList,
        guardians: [getAddress(effectiveG1), getAddress(effectiveG2)],
        allocationRoot: allocTree.root,
      });

      // Suggest unverified beneficiary emails (Constraint #6)
      for (const item of beneficiaryItems) {
        if (item.suggestedEmail && item.address) {
          suggestBeneficiaryEmail(item.address, item.suggestedEmail, connectedAddress).catch((e) => {
            console.warn("[CreateVault] Beneficiary suggestion notification skipped:", e);
          });
        }
      }

      clearProvisioningState(connectedAddress);
      setSavedProvisioning(null);
      setIsCompleted(true);
      setStepStatus("success");
      setActiveStepDescription("Locker successfully created and funded in 1 single transaction!");
      showToast("Vault deployed, funded & configured with 1 single signature!", "success");

      if (onDeploySuccess) {
        onDeploySuccess(allocTree);
      }
    } catch (err: unknown) {
      console.warn("[CreateVaultForm] 1-Click execution paused/declined:", err);
      const friendlyMsg = parseUserFriendlyError(err);
      setStepError(friendlyMsg);
      setStepStatus("error");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-[#E8ECF1] font-sans">
      {/* ========================================================================= */}
      {/* IN-PROGRESS PROVISIONING RESUME BANNER (Architecture Constraint)          */}
      {/* ========================================================================= */}
      {savedProvisioning && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F5B841]/10 border border-[#F5B841]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#F5B841]/20 text-[#F5B841] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-[#E8ECF1] flex items-center gap-2">
                <span>Incomplete Vault Provisioning Detected</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5B841]/20 text-[#F5B841] border border-[#F5B841]/30">
                  Step {savedProvisioning.step} of 4 Pending
                </span>
              </div>
              <p className="text-xs text-[#8993A6]">
                Vault Instance: <span className="font-mono text-[#E8ECF1]">{savedProvisioning.vaultAddress?.slice(0, 10)}...{savedProvisioning.vaultAddress?.slice(-6)}</span>. You can resume setup without re-deploying.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              onClick={handleDiscardSavedProvisioning}
              className="px-3 py-2 rounded-xl text-xs font-medium text-[#8993A6] hover:text-[#E8ECF1] hover:bg-[#1A1F2B] transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleResumeSavedProvisioning}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F5B841] hover:bg-[#e5aa33] text-[#0A0E14] transition-all shadow-[0_0_15px_rgba(245,184,65,0.3)] cursor-pointer"
            >
              Resume Setup →
            </button>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#E8ECF1]">
          Provision Inheritance Vault
        </h1>
        <p className="text-sm text-[#8993A6]">
          Deploy a privacy-preserving vault protected by decentralized guardian consensus.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* STEP PROGRESS INDICATOR                                                    */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-0 rounded-2xl bg-[#12161F] border border-[#232838] p-4 overflow-x-auto" aria-label="Form steps">
        {[
          { n: 1, label: "Deposit Capital" },
          { n: 2, label: "Beneficiaries" },
          { n: 3, label: "Heartbeat & Guardians" },
        ].map(({ n, label }, idx) => {
          const isDone = isModalOpen && currentStep > n;
          return (
            <React.Fragment key={n}>
              {idx > 0 && (
                <div className="flex-1 h-px min-w-[16px] bg-[#232838] mx-2 shrink-0" aria-hidden="true" />
              )}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border transition-all ${
                    isDone
                      ? "bg-[#2EE6A8] border-[#2EE6A8] text-[#0A0E14]"
                      : "bg-[#1A1F2B] border-[#2EE6A8]/50 text-[#2EE6A8]"
                  }`}
                  aria-label={`Step ${n}${isDone ? " completed" : ""}`}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  isDone ? "text-[#2EE6A8]" : "text-[#E8ECF1]"
                }`}>{label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Two-Column Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Steps (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: DEPOSIT CAPITAL */}
          <section className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#232838]/60 pb-3">
              <h2 className="text-sm font-semibold text-[#E8ECF1]">1. Deposit Capital</h2>
              <span className="text-xs font-mono text-[#8993A6] tracking-wider uppercase">
                STEP 1 OF 3
              </span>
            </div>

            <div>
              <label className="block text-xs text-[#8993A6] mb-2 font-mono">
                Initial Amount to Lock
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full font-mono text-base px-4 py-3 rounded-xl bg-[#0A0E14] border border-[#232838] text-[#E8ECF1] focus:outline-none focus:border-[#2EE6A8] transition-colors"
                />
                <div className="absolute right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1A1F2B] border border-[#232838] text-xs font-mono text-[#E8ECF1]">
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="bg-transparent text-[#E8ECF1] cursor-pointer focus:outline-none"
                    aria-label="Select asset token"
                  >
                    {SUPPORTED_TOKENS.map((tok) => (
                      <option key={tok.symbol} value={tok.symbol} className="bg-[#12161F]">
                        {tok.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* STEP 2: BENEFICIARY ALLOCATION */}
          <section className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#232838]/60 pb-3">
              <h2 className="text-sm font-semibold text-[#E8ECF1]">2. Beneficiary Allocation</h2>
              {isBeneficiaryValid ? (
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#2EE6A8]/15 text-[#2EE6A8] border border-[#2EE6A8]/30">
                  SUMS TO 100%
                </span>
              ) : (
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#F5B841]/15 text-[#F5B841] border border-[#F5B841]/30">
                  {currentTotalBps} / 10,000 BPS
                </span>
              )}
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-[#F5B841]/10 border border-[#F5B841]/40 text-xs font-mono text-[#F5B841]">
                {validationError}
              </div>
            )}

            <BeneficiarySetupForm onChange={handleBeneficiaryChange} />
          </section>

          {/* STEP 3: HEARTBEAT & GUARDIANS */}
          <section className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg space-y-5">
            <div className="border-b border-[#232838]/60 pb-3">
              <h2 className="text-sm font-semibold text-[#E8ECF1]">3. Heartbeat &amp; Guardians</h2>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-[#8993A6] font-mono">
                  Guardian Consensus Nodes (2-of-2 Required)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setGuardian1("0x81C3D582F3473F71C4C8bF394E1d32BA218991a2");
                    setGuardian2("0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0");
                  }}
                  className="text-[11px] font-mono text-[#2EE6A8] hover:underline cursor-pointer"
                >
                  + Use Sepolia Demo Guardians
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={guardian1}
                  onChange={(e) => setGuardian1(e.target.value)}
                  className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl bg-[#0A0E14] border border-[#232838] text-[#E8ECF1] focus:outline-none focus:border-[#2EE6A8]"
                  placeholder="Paste guardian wallet address (0x...)"
                  aria-label="Guardian 1 Ethereum address"
                />
                <input
                  type="text"
                  value={guardian2}
                  onChange={(e) => setGuardian2(e.target.value)}
                  className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl bg-[#0A0E14] border border-[#232838] text-[#E8ECF1] focus:outline-none focus:border-[#2EE6A8]"
                  placeholder="Paste guardian wallet address (0x...)"
                  aria-label="Guardian 2 Ethereum address"
                />
              </div>
            </div>

            {/* Email Binding */}
            <div className="space-y-2 pt-1 border-t border-[#232838]/60">
              <label className="block text-xs text-[#8993A6] font-mono">
                Notify me before check-in deadline (optional)
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => {
                    setOwnerEmail(e.target.value);
                    setIsOwnerEmailVerified(false);
                  }}
                  placeholder="owner@example.com"
                  className="flex-1 font-mono text-xs px-3.5 py-2.5 rounded-xl bg-[#0A0E14] border border-[#232838] text-[#E8ECF1] focus:outline-none focus:border-[#2EE6A8]"
                />
                <button
                  type="button"
                  onClick={handleVerifyOwnerEmail}
                  disabled={!ownerEmail || isSigningOwnerEmail || isOwnerEmailVerified}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isOwnerEmailVerified
                      ? "bg-[#2EE6A8]/15 text-[#2EE6A8] border border-[#2EE6A8]/40"
                      : "bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  {isOwnerEmailVerified
                    ? "✓ Verified"
                    : isSigningOwnerEmail
                    ? "Signing..."
                    : "Verify"}
                </button>
              </div>
            </div>

            {/* Heartbeat Interval */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-[#8993A6] font-mono">
                  Heartbeat Checking Interval
                </label>
                <span className="text-[11px] font-mono text-[#2EE6A8] bg-[#2EE6A8]/10 px-2 py-0.5 rounded border border-[#2EE6A8]/20">
                  ⚡ 5m &amp; 10m Testing Presets
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {CHECKIN_INTERVALS.map((intv) => (
                  <button
                    key={intv.label}
                    type="button"
                    onClick={() => setSelectedInterval(intv)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all text-center cursor-pointer border ${
                      selectedInterval.label === intv.label
                        ? "border-[#2EE6A8] bg-[#2EE6A8]/10 text-[#2EE6A8] font-bold shadow-[0_0_12px_rgba(46,230,168,0.2)]"
                        : "border-[#232838] bg-[#0A0E14] text-[#8993A6] hover:text-[#E8ECF1] hover:border-[#3E4759]"
                    }`}
                  >
                    {intv.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grace Period (Contest Window) */}
            <div className="space-y-2 pt-2 border-t border-[#232838]/60">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-[#8993A6] font-mono">
                  Grace Period (Contest Window)
                </label>
                <span className="text-[11px] font-mono text-[#F5B841] bg-[#F5B841]/10 px-2 py-0.5 rounded border border-[#F5B841]/20">
                  ⚡ 5m Testing Preset
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GRACE_PERIOD_OPTIONS.map((period) => (
                  <button
                    key={period.label}
                    type="button"
                    onClick={() => setSelectedGracePeriod(period)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all text-center cursor-pointer border ${
                      selectedGracePeriod.label === period.label
                        ? "border-[#F5B841] bg-[#F5B841]/10 text-[#F5B841] font-bold shadow-[0_0_12px_rgba(245,184,65,0.2)]"
                        : "border-[#232838] bg-[#0A0E14] text-[#8993A6] hover:text-[#E8ECF1] hover:border-[#3E4759]"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#8993A6]">
                Window duration following an inactivity lapse during which you can cancel claims with a stealth signature before funds unlock.
              </p>
            </div>
          </section>
        </div>

        {/* Right Column: Execution Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-lg space-y-6">
            <h2 className="text-sm font-semibold text-[#E8ECF1] tracking-tight">
              Locker Execution Summary
            </h2>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-[#232838]/60">
                <span className="text-[#8993A6]">Deposit Amount</span>
                <span className="font-bold text-[#E8ECF1]">{depositAmount} {selectedToken}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#232838]/60">
                <span className="text-[#8993A6]">Beneficiary Count</span>
                <span className="font-bold text-[#E8ECF1]">{beneficiaryItems.length || 2} Wallets</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#232838]/60">
                <span className="text-[#8993A6]">Check-In Frequency</span>
                <span className="font-bold text-[#E8ECF1]">
                  Every {selectedInterval.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#8993A6]">Grace Period</span>
                <span className="font-bold text-[#F5B841]">{selectedGracePeriod.display}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] flex items-start gap-3">
              <span className="text-[#2EE6A8] text-sm mt-0.5">ℹ</span>
              <p className="text-[11px] text-[#8993A6] leading-relaxed">
                Guardian consensus is Merkle-committed — guardians can verify a lapse
                but never see your funds or your allocation.
              </p>
            </div>

            {/* Authorize & Deploy Vault Button */}
            <button
              id="authorize-and-deploy-vault-button"
              type="button"
              disabled={!isBeneficiaryValid || currentTotalBps !== 10000}
              onClick={handleStartProvisioning}
              className="w-full py-4 px-6 rounded-xl font-bold text-sm bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(46,230,168,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>⚡ Authorize &amp; Deploy (1-Click)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1-CLICK ATOMIC PROVISIONING PROGRESS MODAL                                */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-xl bg-[#12161F] border border-[#232838] rounded-2xl p-6 sm:p-8 shadow-2xl text-[#E8ECF1] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#232838]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 flex items-center justify-center text-[#2EE6A8]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#E8ECF1]">
                    {isCompleted ? "Vault Setup Complete!" : "1-Click Vault Setup"}
                  </h3>
                  <p className="text-xs text-[#8993A6]">
                    Deploy, fund &amp; configure in a single Ethereum transaction
                  </p>
                </div>
              </div>

              {!stepStatus.includes("in_progress") && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#8993A6] hover:text-[#E8ECF1] p-1.5 rounded-lg hover:bg-[#1A1F2B] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 1-Click Operations Checklist */}
            <div className="py-6 space-y-3">
              <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-2.5 text-xs font-mono">
                <div className="text-[11px] uppercase tracking-wider text-[#8993A6] font-bold pb-1 border-b border-[#232838]/60">
                  Bundled Operations in 1 Transaction:
                </div>
                <div className="flex items-center gap-2.5 text-[#E8ECF1]">
                  <span className="text-[#2EE6A8]">✓</span>
                  <span>Deploy InheritanceVault Smart Contract</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#E8ECF1]">
                  <span className="text-[#2EE6A8]">✓</span>
                  <span>Fund Initial Deposit ({depositAmount} {selectedToken})</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#E8ECF1]">
                  <span className="text-[#2EE6A8]">✓</span>
                  <span>Commit Beneficiary Allocation Merkle Tree ({beneficiaryItems.length || 2} Wallets)</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#E8ECF1]">
                  <span className="text-[#2EE6A8]">✓</span>
                  <span>Commit 2-of-2 Guardian Consensus Merkle Root</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#E8ECF1]">
                  <span className="text-[#2EE6A8]">✓</span>
                  <span>Configure Heartbeat ({selectedInterval.label}) &amp; Grace Period ({selectedGracePeriod.label})</span>
                </div>
              </div>

              {provisionedVaultAddress && (
                <div className="p-3.5 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8993A6]">Deployed Vault:</span>
                  <span className="text-[#2EE6A8] font-bold">
                    {provisionedVaultAddress.slice(0, 10)}...{provisionedVaultAddress.slice(-8)}
                  </span>
                </div>
              )}

              {txHashes.deploy && (
                <div className="p-3 rounded-xl bg-[#0A0E14] border border-[#232838] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8993A6]">Transaction Hash:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHashes.deploy}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2EE6A8] hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>{txHashes.deploy.slice(0, 10)}...{txHashes.deploy.slice(-6)}</span>
                    <span>↗</span>
                  </a>
                </div>
              )}
            </div>

            {/* Active Step Real-time Feedback */}
            {stepStatus === "in_progress" && (
              <div className="p-3.5 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-xs font-mono text-[#2EE6A8] flex items-center gap-2.5 animate-pulse">
                <svg className="animate-spin h-4 w-4 text-[#2EE6A8] shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{activeStepDescription}</span>
              </div>
            )}

            {/* Error Message */}
            {stepError && (
              <div className="p-4 rounded-xl bg-[#F5484A]/10 border border-[#F5484A]/40 text-xs font-mono text-[#F5484A] space-y-2">
                <div className="font-bold">Transaction Failed / Cancelled:</div>
                <div className="break-words">{stepError}</div>
                <div className="text-[11px] text-[#8993A6]">
                  Click below to try again whenever you are ready.
                </div>
              </div>
            )}

            {/* Completion View */}
            {isCompleted && (
              <div className="p-4 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/40 text-xs font-mono text-[#2EE6A8] space-y-2 text-center">
                <div className="font-bold text-sm">✓ 1-Click Vault Setup Successfully Completed!</div>
                <p className="text-[11px] text-[#8993A6]">
                  Your vault is funded, active on Sepolia, and guarded by Proof-of-Life consensus.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#232838]">
              {isCompleted ? (
                <Link
                  href="/dashboard"
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] transition-all text-center cursor-pointer shadow-[0_0_20px_rgba(46,230,168,0.3)]"
                >
                  Go to Vault Pulse Dashboard →
                </Link>
              ) : stepError ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#1A1F2B] hover:bg-[#232838] text-[#8993A6] hover:text-[#E8ECF1] cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => executeStep()}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-[#F5B841] hover:bg-[#e5aa33] text-[#0A0E14] transition-all cursor-pointer"
                  >
                    Retry Setup
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={stepStatus === "in_progress"}
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-[#1A1F2B] hover:bg-[#232838] text-[#8993A6] hover:text-[#E8ECF1] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Running in background...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
