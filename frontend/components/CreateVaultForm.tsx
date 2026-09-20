"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount, useWalletClient, useSwitchChain, useBalance } from "wagmi";
import { useToast } from "./ui/Toast";
import {
  type Address,
  type Hex,
  parseEther,
  formatUnits,
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
  registerMonitoredVault,
} from "../lib/notifications";
import {
  CONTRACT_ADDRESSES,
  publicClient,
  ONE_CLICK_VAULT_ABI,
  ONE_CLICK_VAULT_BYTECODE,
  INHERITANCE_VAULT_ABI,
  ConsensusState,
} from "../lib/contracts";
import {
  saveRegisteredVault,
  getProvisioningState,
  clearProvisioningState,
  type ProvisioningState,
} from "../lib/vaultRegistry";

export const STREAMING_DURATION_OPTIONS = [
  { label: "5 MIN (TEST)", display: "5 Minutes (Testing)", seconds: 300 },
  { label: "6 MONTHS", display: "6 Months (180 Days)", seconds: 180 * 86400 },
  { label: "1 YEAR", display: "1 Year (365 Days)", seconds: 365 * 86400 },
  { label: "2 YEARS", display: "2 Years (730 Days)", seconds: 730 * 86400 },
];

export const INITIAL_RELEASE_OPTIONS = [
  { label: "10% EMERGENCY", bps: 1000 },
  { label: "20% BUFFER", bps: 2000 },
  { label: "0% PURE STREAM", bps: 0 },
];

export const GRACE_PERIOD_OPTIONS = [
  { label: "5 MIN (TEST)", display: "5 Minutes (Testing)", seconds: 300 },
  { label: "24 HOURS", display: "24 Hours", seconds: 86400 },
  { label: "72 HOURS", display: "72 Hours (Default)", seconds: 259200 },
  { label: "7 DAYS", display: "7 Days", seconds: 86400 * 7 },
];
import { CHECKIN_INTERVALS, SUPPORTED_TOKENS } from "../lib/constants";
export { CHECKIN_INTERVALS };

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

  if (
    message.toLowerCase().includes("insufficient funds") ||
    shortMsg.toLowerCase().includes("insufficient funds") ||
    details.toLowerCase().includes("insufficient funds")
  ) {
    return "Insufficient Sepolia ETH in your connected wallet to cover gas and deposit fees.";
  }

  if (shortMsg && shortMsg.length < 200) {
    return shortMsg;
  }

  const firstLine = message.split("\n")[0] || String(err);
  return firstLine.length > 180 ? firstLine.slice(0, 180) + "..." : firstLine;
}

export type DeploymentConfirmationState =
  | "awaiting_wallet"
  | "signature_requested"
  | "transaction_pending"
  | "confirmed"
  | "failed"
  | "rejected";

export function isRejectionError(err: unknown): boolean {
  if (!err) return false;
  const errorObj = err as {
    message?: string;
    details?: string;
    shortMessage?: string;
    name?: string;
    code?: number;
  };
  const message = String(errorObj?.message || "").toLowerCase();
  const details = String(errorObj?.details || "").toLowerCase();
  const shortMsg = String(errorObj?.shortMessage || "").toLowerCase();
  const name = String(errorObj?.name || "");

  return (
    name === "UserRejectedRequestError" ||
    errorObj?.code === 4001 ||
    message.includes("user rejected") ||
    details.includes("user rejected") ||
    shortMsg.includes("user rejected") ||
    message.includes("rejected the request") ||
    details.includes("rejected the request")
  );
}

interface CreateVaultFormProps {
  onDeploySuccess?: (result: MerkleTreeResult) => void;
}

export default function CreateVaultForm({ onDeploySuccess }: CreateVaultFormProps) {
  const { address: connectedAddress, chain } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const { showToast } = useToast();

  // Fetch real connected wallet balance
  const { data: balanceData } = useBalance({
    address: connectedAddress,
  });

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

  // Operational 3-step active state
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

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
  const [selectedInterval, setSelectedInterval] = useState(CHECKIN_INTERVALS[2]); // 30 DAYS default
  const [selectedGracePeriod, setSelectedGracePeriod] = useState(GRACE_PERIOD_OPTIONS[2]); // 72 HOURS default
  const [guardian1, setGuardian1] = useState("");
  const [guardian2, setGuardian2] = useState("");
  const [guardian1Email, setGuardian1Email] = useState("");
  const [guardian2Email, setGuardian2Email] = useState("");

  // Step 3b: Cadence Streams — Autonomous Streaming Trust (default OFF per specs)
  const [isStreamingTrust, setIsStreamingTrust] = useState(false);
  const [selectedStreamDuration, setSelectedStreamDuration] = useState(STREAMING_DURATION_OPTIONS[0]);
  const [selectedInitialReleaseBps, setSelectedInitialReleaseBps] = useState(1000);
  const [selectedYieldBps] = useState(500); // 5.0% APY

  // Pre-fill guardian emails from storage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedG1Email = localStorage.getItem("cadence_guardian_email_1");
      const savedG2Email = localStorage.getItem("cadence_guardian_email_2");
      if (savedG1Email) setGuardian1Email(savedG1Email);
      if (savedG2Email) setGuardian2Email(savedG2Email);
    }
  }, []);

  // Optional owner notification email binding
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isOwnerEmailVerified, setIsOwnerEmailVerified] = useState(false);
  const [isSigningOwnerEmail, setIsSigningOwnerEmail] = useState(false);

  // In-progress provisioning state (Partial-failure recovery & Resume mechanism)
  const [savedProvisioning, setSavedProvisioning] = useState<ProvisioningState | null>(null);

  // Page 4: Atomic Deployment Confirmation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState<DeploymentConfirmationState>("awaiting_wallet");
  const [activeStepDescription, setActiveStepDescription] = useState<string>("");
  const [stepError, setStepError] = useState<string | null>(null);

  // Deployed artifacts
  const [provisionedVaultAddress, setProvisionedVaultAddress] = useState<Address | null>(null);
  const [txHashes, setTxHashes] = useState<{
    deploy?: Hex;
    deposit?: Hex;
    allocationRoot?: Hex;
    guardianRoot?: Hex;
  }>({});

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

  const handleDiscardSavedProvisioning = () => {
    if (window.confirm("Are you sure you want to discard the previous in-progress vault setup?")) {
      if (connectedAddress) {
        clearProvisioningState(connectedAddress);
      }
      setSavedProvisioning(null);
      setProvisionedVaultAddress(null);
      setTxHashes({});
    }
  };

  const handleResumeSavedProvisioning = () => {
    if (!savedProvisioning) return;
    if (savedProvisioning.vaultAddress) {
      setProvisionedVaultAddress(savedProvisioning.vaultAddress);
    }
    if (savedProvisioning.txHashes) {
      setTxHashes(savedProvisioning.txHashes);
    }
    setModalState("awaiting_wallet");
    setIsModalOpen(true);
    setStepError(null);
  };

  // Start deployment flow
  const handleStartProvisioning = async () => {
    if (!connectedAddress) {
      showToast("Please connect your wallet to deploy a vault.", "warning");
      return;
    }

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
      setActiveStep(2);
      setValidationError("Beneficiary shares must sum to exactly 10,000 BPS (100.00%) before deploying.");
      showToast("Total allocation must equal exactly 10,000 BPS.", "warning");
      return;
    }

    let effectiveG1 = guardian1.trim();
    let effectiveG2 = guardian2.trim();
    if (!effectiveG1 || !effectiveG2) {
      effectiveG1 = effectiveG1 || "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2";
      effectiveG2 = effectiveG2 || "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0";
      setGuardian1(effectiveG1);
      setGuardian2(effectiveG2);
    }

    if (!isAddress(effectiveG1) || !isAddress(effectiveG2)) {
      setActiveStep(3);
      showToast("Please specify two valid guardian Ethereum addresses.", "warning");
      return;
    }

    setModalState("awaiting_wallet");
    setStepError(null);
    setIsModalOpen(true);
  };

  // 1-Click Atomic Deployment Orchestrator
  const executeDeployment = async () => {
    const client = await getEffectiveWalletClient();
    if (!connectedAddress || !client) {
      setStepError("Wallet signer not connected or not on Sepolia. Please verify your wallet connection.");
      setModalState("failed");
      return;
    }

    setModalState("signature_requested");
    setStepError(null);
    setActiveStepDescription("Please approve the atomic deployment transaction in your wallet...");

    try {
      const effectiveG1 = guardian1.trim() || "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2";
      const effectiveG2 = guardian2.trim() || "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0";

      const guardianTree = buildGuardianTree([getAddress(effectiveG1), getAddress(effectiveG2)]);
      const allocTree = buildAllocationTree(allocationsList);

      const depositWei = parseEther(depositAmount || "0");
      const checkInSec = BigInt(selectedInterval.seconds);
      const contestSec = BigInt(selectedGracePeriod.seconds);

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
      setModalState("transaction_pending");
      setActiveStepDescription("Confirming atomic deployment transaction on Sepolia blockchain...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
      if (!receipt.contractAddress) {
        throw new Error("Contract deployment succeeded but contractAddress was not returned in receipt.");
      }
      const deployedAddress = receipt.contractAddress;
      setProvisionedVaultAddress(deployedAddress);

      // Configure streaming parameters if enabled
      if (isStreamingTrust) {
        try {
          setActiveStepDescription("Configuring Cadence Streams Smart Trust & Yield parameters...");
          const streamDurationSec = BigInt(selectedStreamDuration.seconds);
          const initialBps = BigInt(selectedInitialReleaseBps);
          const yieldBps = BigInt(selectedYieldBps);
          const configHash = await client.writeContract({
            chain: sepolia,
            address: deployedAddress,
            abi: INHERITANCE_VAULT_ABI,
            functionName: "setStreamingConfig",
            args: [streamDurationSec, initialBps, yieldBps],
            account: client.account || connectedAddress,
          });
          await publicClient.waitForTransactionReceipt({ hash: configHash });
        } catch (streamErr) {
          console.warn("[CreateVaultForm] Could not configure streaming trust immediately:", streamErr);
        }
      }

      // Build encrypted allocations
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

      // Save to local registry
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

      if (typeof window !== "undefined") {
        if (guardian1Email.trim()) {
          localStorage.setItem(`cadence_guardian_email_1_${deployedAddress}`, guardian1Email.trim());
          localStorage.setItem("cadence_guardian_email_1", guardian1Email.trim());
        }
        if (guardian2Email.trim()) {
          localStorage.setItem(`cadence_guardian_email_2_${deployedAddress}`, guardian2Email.trim());
          localStorage.setItem("cadence_guardian_email_2", guardian2Email.trim());
        }
      }

      // Register with Sentinel for live notifications
      registerMonitoredVault({
        vaultAddress: deployedAddress,
        name: "Inheritance Vault",
        guardians: [
          { address: getAddress(effectiveG1), label: "Guardian Node 1", email: guardian1Email.trim() || undefined },
          { address: getAddress(effectiveG2), label: "Guardian Node 2", email: guardian2Email.trim() || undefined },
        ],
      }).catch(() => {});

      for (const item of beneficiaryItems) {
        if (item.suggestedEmail && item.address) {
          suggestBeneficiaryEmail(item.address, item.suggestedEmail, connectedAddress).catch((e) => {
            console.warn("[CreateVault] Beneficiary suggestion notification skipped:", e);
          });
        }
      }

      clearProvisioningState(connectedAddress);
      setSavedProvisioning(null);
      setModalState("confirmed");
      setActiveStepDescription("Locker successfully created and funded in 1 single transaction!");
      showToast("Locker deployed, funded & configured successfully!", "success");

      if (onDeploySuccess) {
        onDeploySuccess(allocTree);
      }
    } catch (err: unknown) {
      console.warn("[CreateVaultForm] Atomic deployment execution error:", err);
      const friendlyMsg = parseUserFriendlyError(err);
      setStepError(friendlyMsg);
      if (isRejectionError(err)) {
        setModalState("rejected");
      } else {
        setModalState("failed");
      }
    }
  };

  // Real-time Deposit Amount Validation
  const depositNum = parseFloat(depositAmount || "0");
  const isDepositValid = !isNaN(depositNum) && depositNum > 0;
  const formattedBalance = balanceData
    ? formatUnits(balanceData.value, balanceData.decimals)
    : "0";
  const balanceNum = parseFloat(formattedBalance);
  const isDepositExceedingBalance = selectedToken === "ETH" && isDepositValid && depositNum > balanceNum;

  // Max balance fill helper
  const handleSetMaxDeposit = () => {
    if (!balanceData) return;
    const maxVal = parseFloat(formattedBalance);
    if (maxVal <= 0) return;
    // Leave small gas buffer if ETH
    const safeMax = selectedToken === "ETH" ? Math.max(0, maxVal - 0.005) : maxVal;
    setDepositAmount(safeMax > 0 ? safeMax.toFixed(4) : "0");
  };

  // Can deploy check
  const isDeploymentReady =
    isDepositValid &&
    isBeneficiaryValid &&
    currentTotalBps === 10000 &&
    !isDepositExceedingBalance;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 text-[#111111]">
      {/* ========================================================================= */}
      {/* HEADER                                                                    */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
          Create a Locker
        </h1>
        <p className="text-base sm:text-lg text-[#5F6368]">
          Configure how your inheritance will activate.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* IN-PROGRESS PROVISIONING RESUME BANNER                                    */}
      {/* ========================================================================= */}
      {savedProvisioning && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF6D8] border border-[#D99A00]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#996B00] font-bold text-sm">
              <span>⚠️</span>
              <span>Pending Locker Setup In Progress</span>
            </div>
            <p className="text-xs text-[#5F6368]">
              An earlier deployment attempt was paused at step {savedProvisioning.step} of 4. You can resume without losing your state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardSavedProvisioning}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#E8EAED] text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleResumeSavedProvisioning}
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#111111] hover:bg-black text-white shadow-sm transition-all cursor-pointer"
            >
              Resume Setup →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP INDICATOR                                                            */}
      {/* States: completed = teal, current = black/purple, upcoming = muted gray   */}
      {/* ========================================================================= */}
      <div
        className="flex items-center gap-2 sm:gap-4 p-2 rounded-2xl bg-white border border-[#E8EAED] shadow-sm overflow-x-auto"
        aria-label="Provisioning steps"
      >
        {[
          { step: 1 as const, num: "01", label: "DEPOSIT" },
          { step: 2 as const, num: "02", label: "ALLOCATION" },
          { step: 3 as const, num: "03", label: "HEARTBEAT" },
        ].map(({ step, num, label }) => {
          const isCurrent = activeStep === step;
          const isCompletedStep =
            (step === 1 && isDepositValid && activeStep > 1) ||
            (step === 2 && currentTotalBps === 10000 && isBeneficiaryValid && activeStep > 2);

          return (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(step)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                isCurrent
                  ? "bg-[#111111] text-white shadow-sm ring-1 ring-[#7C5CFF]/40"
                  : isCompletedStep
                  ? "bg-[#E9F8F1] text-[#22A06B] border border-[#22A06B]/30 hover:bg-[#DDF4EA]"
                  : "bg-[#F7F8FA] text-[#80868B] border border-[#E8EAED] hover:text-[#111111] hover:bg-[#EEF0F2]"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent
                    ? "bg-[#7C5CFF] text-white"
                    : isCompletedStep
                    ? "bg-[#22A06B] text-white"
                    : "bg-[#E8EAED] text-[#5F6368]"
                }`}
              >
                {isCompletedStep ? "✓" : num}
              </span>
              <span className="tracking-wider">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP TWO-COLUMN: LEFT FORM / RIGHT STICKY SUMMARY                      */}
      {/* MOBILE: STACK THEM NATURALLY                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: 3-Step Operational Form (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ===================================================================== */}
          {/* STEP 1: DEPOSIT CAPITAL                                               */}
          {/* ===================================================================== */}
          {activeStep === 1 && (
            <section className="bg-white border border-[#E8EAED] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8EAED]">
                <div>
                  <h2 className="text-xl font-bold text-[#111111]">
                    01. Deposit Capital
                  </h2>
                  <p className="text-xs text-[#5F6368] mt-0.5">
                    Select your asset and configure initial capital to be locked into the vault.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#F7F8FA] text-[#5F6368] border border-[#E8EAED]">
                  STEP 1 OF 3
                </span>
              </div>

              {/* Supported Tokens Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-semibold text-[#5F6368] uppercase tracking-wider">
                  Supported Assets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SUPPORTED_TOKENS.map((tok) => {
                    const isSelected = selectedToken === tok.symbol;
                    return (
                      <button
                        key={tok.symbol}
                        type="button"
                        onClick={() => setSelectedToken(tok.symbol)}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#F0ECFF] border-[#7C5CFF] text-[#111111] shadow-sm ring-1 ring-[#7C5CFF]"
                            : "bg-[#F7F8FA] border-[#E8EAED] text-[#5F6368] hover:border-[#111111] hover:text-[#111111]"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? "bg-[#7C5CFF] text-white" : "bg-[#E8EAED] text-[#111111]"
                          }`}
                        >
                          {tok.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{tok.symbol}</div>
                          <div className="text-[10px] text-[#8A8F98] truncate">{tok.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deposit Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-semibold text-[#5F6368] uppercase tracking-wider">
                    Deposit Amount
                  </label>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#5F6368]">
                    <span>Wallet Balance:</span>
                    <span className="font-bold text-[#111111]">
                      {balanceData ? `${balanceNum.toFixed(4)} ${selectedToken}` : "0.0000 ETH"}
                    </span>
                    <button
                      type="button"
                      onClick={handleSetMaxDeposit}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#111111] text-white hover:bg-black transition-colors cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full font-mono text-xl sm:text-2xl px-4 py-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] text-[#111111] focus:outline-none focus:bg-white focus:border-[#111111] transition-all font-semibold"
                  />
                  <div className="absolute right-3.5 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E8EAED] text-xs font-mono font-bold text-[#111111] shadow-xs">
                    <span>{selectedToken}</span>
                  </div>
                </div>

                {/* Real-time Validation Warnings */}
                {!isDepositValid && depositAmount !== "" && (
                  <p className="text-xs font-mono text-[#D64545]">
                    Please enter a deposit amount greater than 0.
                  </p>
                )}
                {isDepositExceedingBalance && (
                  <p className="text-xs font-mono text-[#D64545]">
                    Deposit amount exceeds available wallet balance ({balanceNum.toFixed(4)} {selectedToken}).
                  </p>
                )}
              </div>

              {/* Estimated Transaction Information */}
              <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5F6368]">
                  Estimated Transaction Information
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-[#8A8F98]">Network</div>
                    <div className="font-bold text-[#111111]">Sepolia (11155111)</div>
                  </div>
                  <div>
                    <div className="text-[#8A8F98]">Gas Estimate</div>
                    <div className="font-bold text-[#22A06B]">~0.0018 ETH (Standard)</div>
                  </div>
                  <div>
                    <div className="text-[#8A8F98]">Architecture</div>
                    <div className="font-bold text-[#111111]">1-Click Atomic Bundle</div>
                  </div>
                </div>
              </div>

              {/* Step 1 Footer Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!isDepositValid || isDepositExceedingBalance}
                  onClick={() => setActiveStep(2)}
                  className="py-3.5 px-6 rounded-full font-bold text-xs bg-[#111111] text-white hover:bg-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  <span>Continue to Allocation</span>
                  <span>→</span>
                </button>
              </div>
            </section>
          )}

          {/* ===================================================================== */}
          {/* STEP 2: BENEFICIARY ALLOCATION                                        */}
          {/* ===================================================================== */}
          {activeStep === 2 && (
            <section className="bg-white border border-[#E8EAED] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8EAED]">
                <div>
                  <h2 className="text-xl font-bold text-[#111111]">
                    02. Beneficiary Allocation
                  </h2>
                  <p className="text-xs text-[#5F6368] mt-0.5">
                    Define heirs and split shares in basis points (100 BPS = 1.00%).
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#F7F8FA] text-[#5F6368] border border-[#E8EAED]">
                  STEP 2 OF 3
                </span>
              </div>

              {validationError && (
                <div className="p-3.5 rounded-2xl bg-[#FFF6D8] border border-[#D99A00]/40 text-xs font-mono text-[#996B00]">
                  {validationError}
                </div>
              )}

              {/* Beneficiary Setup Form with Prominent Validator Banner */}
              <BeneficiarySetupForm onChange={handleBeneficiaryChange} />

              {/* Step 2 Navigation Footer */}
              <div className="pt-4 border-t border-[#E8EAED] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="py-3 px-5 rounded-full font-semibold text-xs bg-[#F7F8FA] text-[#5F6368] hover:text-[#111111] hover:bg-[#E8EAED] border border-[#E8EAED] transition-colors cursor-pointer"
                >
                  ← Back to Deposit
                </button>
                <button
                  type="button"
                  disabled={!isBeneficiaryValid || currentTotalBps !== 10000}
                  onClick={() => setActiveStep(3)}
                  className="py-3.5 px-6 rounded-full font-bold text-xs bg-[#111111] text-white hover:bg-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  <span>Continue to Heartbeat</span>
                  <span>→</span>
                </button>
              </div>
            </section>
          )}

          {/* ===================================================================== */}
          {/* STEP 3: HEARTBEAT & GUARDIANS                                         */}
          {/* ===================================================================== */}
          {activeStep === 3 && (
            <section className="bg-white border border-[#E8EAED] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8EAED]">
                <div>
                  <h2 className="text-xl font-bold text-[#111111]">
                    03. Heartbeat &amp; Guardians
                  </h2>
                  <p className="text-xs text-[#5F6368] mt-0.5">
                    Configure your check-in interval, contest window grace period, and consensus nodes.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#F7F8FA] text-[#5F6368] border border-[#E8EAED]">
                  STEP 3 OF 3
                </span>
              </div>

              {/* Guardian Consensus Nodes */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#111111] uppercase tracking-wider">
                    Guardian Consensus Nodes (2-of-2 Required)
                  </label>
                  <p className="text-xs text-[#5F6368]">
                    Guardians attest to owner inactivity without learning asset amounts or heir identities.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Guardian 1 */}
                  <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#111111] flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
                        Guardian Node 1
                      </span>
                      <span className="text-[10px] font-mono text-[#5F6368] bg-white px-2 py-0.5 rounded-full border border-[#E8EAED]">
                        Node #1
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-[#5F6368]">
                        Wallet Address <span className="text-[#D64545]">*</span>
                      </label>
                      <input
                        type="text"
                        value={guardian1}
                        onChange={(e) => setGuardian1(e.target.value)}
                        className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-white border border-[#E8EAED] text-[#111111] placeholder-[#8A8F98] focus:outline-none focus:border-[#111111]"
                        placeholder="0x81C3...91a2"
                        aria-label="Guardian 1 Ethereum address"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-[#5F6368]">
                        Alert Email <span className="text-[#8A8F98]">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={guardian1Email}
                        onChange={(e) => setGuardian1Email(e.target.value)}
                        className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-white border border-[#E8EAED] text-[#111111] placeholder-[#8A8F98] focus:outline-none focus:border-[#111111]"
                        placeholder="guardian1@cadence.xyz"
                        aria-label="Guardian 1 Email address"
                      />
                    </div>
                  </div>

                  {/* Guardian 2 */}
                  <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#111111] flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
                        Guardian Node 2
                      </span>
                      <span className="text-[10px] font-mono text-[#5F6368] bg-white px-2 py-0.5 rounded-full border border-[#E8EAED]">
                        Node #2
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-[#5F6368]">
                        Wallet Address <span className="text-[#D64545]">*</span>
                      </label>
                      <input
                        type="text"
                        value={guardian2}
                        onChange={(e) => setGuardian2(e.target.value)}
                        className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-white border border-[#E8EAED] text-[#111111] placeholder-[#8A8F98] focus:outline-none focus:border-[#111111]"
                        placeholder="0x34d7...A1F0"
                        aria-label="Guardian 2 Ethereum address"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-[#5F6368]">
                        Alert Email <span className="text-[#8A8F98]">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={guardian2Email}
                        onChange={(e) => setGuardian2Email(e.target.value)}
                        className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-white border border-[#E8EAED] text-[#111111] placeholder-[#8A8F98] focus:outline-none focus:border-[#111111]"
                        placeholder="guardian2@cadence.xyz"
                        aria-label="Guardian 2 Email address"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Owner Notification Email Binding */}
              <div className="space-y-2 pt-2 border-t border-[#E8EAED]">
                <label className="block text-xs font-mono font-semibold text-[#5F6368] uppercase tracking-wider">
                  Owner Pre-Deadline Notifications (Optional)
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
                    className="flex-1 font-mono text-xs px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E8EAED] text-[#111111] focus:outline-none focus:bg-white focus:border-[#111111]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOwnerEmail}
                    disabled={!ownerEmail || isSigningOwnerEmail || isOwnerEmailVerified}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isOwnerEmailVerified
                        ? "bg-[#E9F8F1] text-[#22A06B] border border-[#22A06B]/40"
                        : "bg-[#111111] text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {isOwnerEmailVerified
                      ? "✓ Verified"
                      : isSigningOwnerEmail
                      ? "Signing..."
                      : "Verify & Bind"}
                  </button>
                </div>
              </div>

              {/* Heartbeat Interval Presets */}
              <div className="space-y-2 pt-2 border-t border-[#E8EAED]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-semibold text-[#5F6368] uppercase tracking-wider">
                    Heartbeat Interval Presets
                  </label>
                  <span className="text-[11px] font-mono text-[#7C5CFF]">
                    Proof-of-Life Check-In Frequency
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {CHECKIN_INTERVALS.map((intv) => {
                    const isSelected = selectedInterval.label === intv.label;
                    return (
                      <button
                        key={intv.label}
                        type="button"
                        onClick={() => setSelectedInterval(intv)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-mono transition-all text-center cursor-pointer border ${
                          isSelected
                            ? "border-[#111111] bg-[#111111] text-white font-bold shadow-xs"
                            : "border-[#E8EAED] bg-[#F7F8FA] text-[#5F6368] hover:text-[#111111] hover:border-[#111111]"
                        }`}
                      >
                        {intv.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contest Window Duration & Plain English Explanation */}
              <div className="space-y-2 pt-2 border-t border-[#E8EAED]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-semibold text-[#5F6368] uppercase tracking-wider">
                    Contest Window Duration
                  </label>
                  <span className="text-[11px] font-mono text-[#996B00]">
                    Default: 72 HOURS
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRACE_PERIOD_OPTIONS.map((period) => {
                    const isSelected = selectedGracePeriod.label === period.label;
                    return (
                      <button
                        key={period.label}
                        type="button"
                        onClick={() => setSelectedGracePeriod(period)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-mono transition-all text-center cursor-pointer border ${
                          isSelected
                            ? "border-[#D99A00] bg-[#FFF6D8] text-[#996B00] font-bold shadow-xs"
                            : "border-[#E8EAED] bg-[#F7F8FA] text-[#5F6368] hover:text-[#111111] hover:border-[#111111]"
                        }`}
                      >
                        {period.label}
                      </button>
                    );
                  })}
                </div>

                {/* Plain English Explanation */}
                <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] flex items-start gap-2.5 text-xs text-[#5F6368]">
                  <span className="text-[#7C5CFF] text-sm">ℹ</span>
                  <p className="leading-relaxed">
                    <strong>What is the Contest Window?</strong> If a check-in interval lapses, the protocol enters a temporary grace window (default <strong>72 HOURS</strong>) before assets can be claimed. During this period, you can cancel any activation with a single heartbeat check-in if triggered mistakenly.
                  </p>
                </div>
              </div>

              {/* Cadence Streams Toggle */}
              <div className="space-y-3 pt-3 border-t border-[#E8EAED]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                      <span className="text-[#7C5CFF]">⚡</span>
                      <span>Cadence Streams (Smart Trust &amp; Yield)</span>
                    </div>
                    <div className="text-xs text-[#5F6368]">
                      Vests inheritance continuously per second rather than an instant lump-sum payout.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStreamingTrust(!isStreamingTrust)}
                    className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
                      isStreamingTrust
                        ? "bg-[#E9F8F1] border-[#22A06B] text-[#22A06B]"
                        : "bg-[#F7F8FA] border-[#E8EAED] text-[#80868B]"
                    }`}
                  >
                    {isStreamingTrust ? "ON" : "OFF"}
                  </button>
                </div>

                {isStreamingTrust && (
                  <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-[#7C5CFF]/30 space-y-3 animate-in fade-in">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-mono font-semibold text-[#5F6368] uppercase">
                        Streaming Duration Schedule
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {STREAMING_DURATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setSelectedStreamDuration(opt)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                              selectedStreamDuration.label === opt.label
                                ? "border-[#7C5CFF] bg-[#F0ECFF] text-[#7C5CFF] font-bold"
                                : "border-[#E8EAED] bg-white text-[#5F6368] hover:text-[#111111]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-mono font-semibold text-[#5F6368] uppercase">
                        Immediate Emergency Buffer (Day 1 Unlock)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {INITIAL_RELEASE_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setSelectedInitialReleaseBps(opt.bps)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                              selectedInitialReleaseBps === opt.bps
                                ? "border-[#111111] bg-[#111111] text-white font-bold"
                                : "border-[#E8EAED] bg-white text-[#5F6368] hover:text-[#111111]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-xl bg-white border border-[#E8EAED]">
                      <span className="text-[#5F6368]">Simulated Aave v3 Yield:</span>
                      <span className="text-[#22A06B] font-bold">+5.00% APY (Auto-Compounding)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3 Navigation Footer */}
              <div className="pt-4 border-t border-[#E8EAED] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="py-3 px-5 rounded-full font-semibold text-xs bg-[#F7F8FA] text-[#5F6368] hover:text-[#111111] hover:bg-[#E8EAED] border border-[#E8EAED] transition-colors cursor-pointer"
                >
                  ← Back to Allocation
                </button>
                <button
                  type="button"
                  onClick={handleStartProvisioning}
                  disabled={!isDeploymentReady}
                  className="py-3.5 px-6 rounded-full font-bold text-xs bg-[#111111] text-white hover:bg-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  <span>Authorize &amp; Deploy</span>
                  <span>⚡</span>
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: STICKY LOCKER EXECUTION SUMMARY                            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          <div className="bg-white border border-[#E8EAED] rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#111111]">
                LOCKER EXECUTION SUMMARY
              </h2>
              <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-[#E8EAED]/60">
                <span className="text-[#5F6368]">Asset</span>
                <span className="font-bold text-[#111111]">{selectedToken}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EAED]/60">
                <span className="text-[#5F6368]">Deposit</span>
                <span className="font-bold text-[#111111]">
                  {depositAmount ? parseFloat(depositAmount).toFixed(4) : "0.0000"} {selectedToken}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EAED]/60">
                <span className="text-[#5F6368]">Beneficiaries</span>
                <span className="font-bold text-[#111111]">
                  {beneficiaryItems.length || 2}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EAED]/60">
                <span className="text-[#5F6368]">Guardian Consensus</span>
                <span className="font-bold text-[#111111]">2 / 2</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EAED]/60">
                <span className="text-[#5F6368]">Heartbeat</span>
                <span className="font-bold text-[#111111]">{selectedInterval.label}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EAED]/60">
                <span className="text-[#5F6368]">Contest Window</span>
                <span className="font-bold text-[#996B00]">{selectedGracePeriod.label}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#5F6368]">Cadence Streams</span>
                <span className={`font-bold ${isStreamingTrust ? "text-[#22A06B]" : "text-[#80868B]"}`}>
                  {isStreamingTrust ? "ON" : "OFF"}
                </span>
              </div>
            </div>

            {/* Allocation Status Indicator */}
            {currentTotalBps !== 10000 && (
              <div className="p-3.5 rounded-2xl bg-[#FFF6D8] border border-[#D99A00]/40 text-xs text-[#996B00] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Allocation Check Required</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Deployment is locked until total beneficiary allocation sums to exactly 10,000 BPS (currently {currentTotalBps.toLocaleString()} BPS).
                </p>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              id="authorize-and-deploy-vault-button"
              type="button"
              disabled={!isDeploymentReady}
              onClick={handleStartProvisioning}
              className="w-full py-4 px-6 rounded-full font-bold text-sm bg-[#111111] text-white hover:bg-black active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>AUTHORIZE &amp; DEPLOY</span>
            </button>

            <div className="text-center">
              <p className="text-[11px] text-[#8A8F98]">
                Single 1-click atomic transaction on Sepolia
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4: ATOMIC DEPLOYMENT CONFIRMATION MODAL                              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="atomic-deployment-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            className="relative w-full max-w-xl bg-white border border-[#E8EAED] rounded-3xl p-6 sm:p-8 shadow-2xl text-[#111111] overflow-hidden space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E8EAED]">
              <div className="space-y-1">
                <h3 id="atomic-deployment-title" className="font-bold text-xl text-[#111111] tracking-tight">
                  AUTHORIZE &amp; DEPLOY LOCKER
                </h3>
                <p className="text-xs text-[#5F6368]">
                  The goal is certainty, not fear.
                </p>
              </div>

              {modalState !== "signature_requested" && modalState !== "transaction_pending" && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#5F6368] hover:text-[#111111] p-1.5 rounded-full hover:bg-[#F7F8FA] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Explanation Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] space-y-3 text-xs">
              <div className="font-mono font-semibold text-[#111111] tracking-wider uppercase text-[11px]">
                This signature will:
              </div>
              <ol className="space-y-2 text-[#333333] font-mono text-xs pl-1">
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white border border-[#E8EAED] flex items-center justify-center font-bold text-[10px] text-[#7C5CFF] shrink-0">
                    1
                  </span>
                  <span>Deploy the Locker</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white border border-[#E8EAED] flex items-center justify-center font-bold text-[10px] text-[#7C5CFF] shrink-0">
                    2
                  </span>
                  <span>Deposit the selected assets ({depositAmount || "0"} {selectedToken})</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white border border-[#E8EAED] flex items-center justify-center font-bold text-[10px] text-[#7C5CFF] shrink-0">
                    3
                  </span>
                  <span>Commit beneficiary allocation roots</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white border border-[#E8EAED] flex items-center justify-center font-bold text-[10px] text-[#7C5CFF] shrink-0">
                    4
                  </span>
                  <span>Register guardian consensus</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white border border-[#E8EAED] flex items-center justify-center font-bold text-[10px] text-[#7C5CFF] shrink-0">
                    5
                  </span>
                  <span>Start the Heartbeat timer</span>
                </li>
              </ol>
            </div>

            {/* Show: Telemetry Table */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5F6368]">
                Configuration Telemetry
              </div>
              <div className="p-4 rounded-2xl bg-white border border-[#E8EAED] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <div className="text-[#8A8F98]">Network</div>
                  <div className="font-bold text-[#111111]">Sepolia (11155111)</div>
                </div>
                <div>
                  <div className="text-[#8A8F98]">Contract</div>
                  <div className="font-bold text-[#111111]">OneClickVault</div>
                </div>
                <div>
                  <div className="text-[#8A8F98]">Deposit</div>
                  <div className="font-bold text-[#111111]">{depositAmount} {selectedToken}</div>
                </div>
                <div>
                  <div className="text-[#8A8F98]">Beneficiary Count</div>
                  <div className="font-bold text-[#111111]">{beneficiaryItems.length || 2} Wallets</div>
                </div>
                <div>
                  <div className="text-[#8A8F98]">Guardian Count</div>
                  <div className="font-bold text-[#111111]">2 Guardians</div>
                </div>
                <div>
                  <div className="text-[#8A8F98]">Heartbeat</div>
                  <div className="font-bold text-[#111111]">{selectedInterval.label}</div>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#E8EAED]/60 flex items-center justify-between">
                  <span className="text-[#8A8F98]">Contest Window</span>
                  <span className="font-bold text-[#996B00]">{selectedGracePeriod.label}</span>
                </div>
              </div>
            </div>

            {/* State Feedback Card */}
            {modalState === "signature_requested" && (
              <div className="p-4 rounded-2xl bg-[#F0ECFF] border border-[#7C5CFF]/30 text-xs font-mono text-[#7C5CFF] flex items-center gap-3 animate-pulse">
                <svg className="animate-spin h-5 w-5 text-[#7C5CFF] shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div className="space-y-0.5">
                  <div className="font-bold">Signature requested</div>
                  <div className="text-[11px] text-[#5F6368]">
                    {activeStepDescription || "Please confirm the transaction in your connected wallet."}
                  </div>
                </div>
              </div>
            )}

            {modalState === "transaction_pending" && (
              <div className="p-4 rounded-2xl bg-[#E8F5FE] border border-[#0284C7]/30 text-xs font-mono text-[#0284C7] space-y-2">
                <div className="flex items-center gap-3 animate-pulse">
                  <svg className="animate-spin h-5 w-5 text-[#0284C7] shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <div>
                    <div className="font-bold">Transaction pending</div>
                    <div className="text-[11px] text-[#5F6368]">
                      {activeStepDescription || "Mining on Sepolia blockchain (~12 seconds)..."}
                    </div>
                  </div>
                </div>
                {txHashes.deploy && (
                  <div className="pt-2 border-t border-[#0284C7]/20 flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6368]">Tx Hash:</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHashes.deploy}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0284C7] font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{txHashes.deploy.slice(0, 10)}...{txHashes.deploy.slice(-6)}</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {modalState === "confirmed" && (
              <div className="p-4 rounded-2xl bg-[#E9F8F1] border border-[#22A06B]/40 text-xs font-mono text-[#22A06B] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>✓</span>
                  <span>Confirmed</span>
                </div>
                <p className="text-[11px] text-[#5F6368]">
                  Your Locker has been deployed and funded on Sepolia. Heartbeat telemetry is live.
                </p>
                {provisionedVaultAddress && (
                  <div className="pt-2 border-t border-[#22A06B]/20 flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6368]">Contract:</span>
                    <span className="font-bold text-[#111111]">
                      {provisionedVaultAddress.slice(0, 10)}...{provisionedVaultAddress.slice(-8)}
                    </span>
                  </div>
                )}
                {txHashes.deploy && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6368]">Receipt:</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHashes.deploy}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#22A06B] font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{txHashes.deploy.slice(0, 10)}...{txHashes.deploy.slice(-6)}</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {modalState === "rejected" && (
              <div className="p-4 rounded-2xl bg-[#FFF6D8] border border-[#D99A00]/40 text-xs font-mono text-[#996B00] space-y-2">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Rejected</span>
                </div>
                <p className="text-[11px] text-[#5F6368]">
                  The signature was declined in your wallet. No gas was consumed, and no assets were moved.
                </p>
              </div>
            )}

            {modalState === "failed" && (
              <div className="p-4 rounded-2xl bg-[#FDECEC] border border-[#D64545]/40 text-xs font-mono text-[#D64545] space-y-2">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>✕</span>
                  <span>Failed</span>
                </div>
                <div className="text-[11px] text-[#5F6368] break-words">
                  {stepError || "An unexpected error occurred during contract execution."}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#E8EAED]">
              {modalState === "confirmed" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 rounded-full text-xs font-semibold bg-[#F7F8FA] hover:bg-[#E8EAED] text-[#5F6368] hover:text-[#111111] border border-[#E8EAED] transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <Link
                    href="/dashboard"
                    className="flex-1 py-3 px-6 rounded-full font-bold text-xs bg-[#111111] hover:bg-black text-white transition-all text-center cursor-pointer shadow-md"
                  >
                    GO TO VAULT PULSE DASHBOARD →
                  </Link>
                </>
              ) : modalState === "signature_requested" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setModalState("awaiting_wallet");
                      setIsModalOpen(false);
                    }}
                    className="px-5 py-3 rounded-full text-xs font-semibold bg-[#F7F8FA] hover:bg-[#E8EAED] text-[#5F6368] hover:text-[#111111] border border-[#E8EAED] transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3 px-6 rounded-full font-bold text-xs bg-[#F0ECFF] text-[#7C5CFF] border border-[#7C5CFF]/30 opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>SIGNATURE REQUESTED...</span>
                  </button>
                </>
              ) : modalState === "transaction_pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 rounded-full text-xs font-semibold bg-[#F7F8FA] hover:bg-[#E8EAED] text-[#5F6368] hover:text-[#111111] border border-[#E8EAED] transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3 px-6 rounded-full font-bold text-xs bg-[#E8F5FE] text-[#0284C7] border border-[#0284C7]/30 opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>TRANSACTION PENDING...</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setModalState("awaiting_wallet");
                      setIsModalOpen(false);
                    }}
                    className="px-5 py-3 rounded-full text-xs font-semibold bg-[#F7F8FA] hover:bg-[#E8EAED] text-[#5F6368] hover:text-[#111111] border border-[#E8EAED] transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={executeDeployment}
                    className="flex-1 py-3 px-6 rounded-full font-bold text-xs bg-[#111111] hover:bg-black text-white transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <span>AUTHORIZE &amp; DEPLOY</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
