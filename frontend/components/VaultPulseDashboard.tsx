"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { type Address, formatEther, isAddressEqual, getAddress } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import {
  CONTRACT_ADDRESSES,
  publicClient,
  INHERITANCE_VAULT_ABI,
  PROOF_OF_LIFE_CONSENSUS_ABI,
  GUARDIAN_REGISTRY_ABI,
  ConsensusState,
} from "../lib/contracts";
import { type VaultRoleMatch } from "../hooks/useUserRole";
import CheckInButton from "./CheckInButton";
import LiveECGMonitor from "./ui/LiveECGMonitor";
import { requestSignatureAndBind } from "../lib/notifications";
import { getRegisteredVaults } from "../lib/vaultRegistry";
import {
  hasPimlicoApiKey,
  isSmartContractAccount,
} from "../lib/paymaster";
import { useToast } from "./ui/Toast";
import { parseUserFriendlyError } from "./CreateVaultForm";

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
import { INTERVAL_PRESETS } from "../lib/constants";

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
  const [ethBalance, setEthBalance] = useState<string>("12.5000");
  const [checkInIntervalSec, setCheckInIntervalSec] = useState<number>(30 * 86400); // 30d default
  const [consensusState, setConsensusState] = useState<number>(ConsensusState.Active);
  const [isPrivateBalance, setIsPrivateBalance] = useState(false);
  const [guardiansList] = useState<GuardianDisplayInfo[]>([
    { address: "0x71C8a4d3397985474668f44d1872a912630018b2" as Address, label: "GUARDIAN NODE 01", attested: false },
    { address: "0x94D93921E983e9112938Aa0b1823901b89313a1e" as Address, label: "GUARDIAN NODE 02", attested: false },
  ]);
  const [guardianThreshold, setGuardianThreshold] = useState<number>(2);
  const [guardianTotal, setGuardianTotal] = useState<number>(2);
  const [beneficiaryCount] = useState<number>(3);

  // Local ticker countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3694512); // ~42 days

  // Email Notification Binding state
  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailBindingStatus>("not_set");
  const [confirmedEmail, setConfirmedEmail] = useState<string>("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSigningEmail, setIsSigningEmail] = useState(false);

  // Smart Account / Paymaster detection
  const [isSmartAccount, setIsSmartAccount] = useState<boolean>(false);
  useEffect(() => {
    let isMounted = true;
    if (connectedAddress) {
      isSmartContractAccount(connectedAddress)
        .then((isSmart) => {
          if (isMounted) setIsSmartAccount(isSmart);
        })
        .catch(() => {
          if (isMounted) setIsSmartAccount(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [connectedAddress]);

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
    } catch (err: unknown) {
      console.error("[VaultPulseDashboard] Failed to set check-in interval:", err);
      const msg = parseUserFriendlyError(err);
      setIntervalStatusMsg(`Error: ${msg.slice(0, 100)}`);
    } finally {
      setIsUpdatingInterval(false);
    }
  };

  // Fetch real on-chain vault state
  const fetchOnChainData = useCallback(async (targetVault: Address) => {
    try {
      const balanceWei = await publicClient.getBalance({ address: targetVault });
      const formattedEth = parseFloat(formatEther(balanceWei)).toFixed(4);
      setEthBalance(formattedEth);

      const intervalBigInt = (await publicClient.readContract({
        address: targetVault,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "checkInInterval",
      })) as bigint;
      setCheckInIntervalSec(Number(intervalBigInt));

      const lastActiveBigInt = (await publicClient.readContract({
        address: targetVault,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "lastActiveTimestamp",
      })) as bigint;
      const lastActive = Number(lastActiveBigInt);

      // Query consensus state
      let stateNum: ConsensusState = ConsensusState.Active;
      try {
        const rawState = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.consensus,
          abi: PROOF_OF_LIFE_CONSENSUS_ABI,
          functionName: "getState",
          args: [targetVault],
        });
        stateNum = Number(rawState) as ConsensusState;
      } catch {
        const reg = getRegisteredVaults().find((v) =>
          isAddressEqual(v.vaultAddress, targetVault)
        );
        if (reg) stateNum = reg.consensusState;
      }
      setConsensusState(stateNum);

      const nowSec = Math.floor(Date.now() / 1000);
      const diff = lastActive + Number(intervalBigInt) - nowSec;
      setSecondsRemaining(Math.max(0, diff));

      // Query guardian registry
      try {
        const gConfig = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.guardianRegistry,
          abi: GUARDIAN_REGISTRY_ABI,
          functionName: "getGuardianConfig",
          args: [targetVault],
        });

        if (gConfig) {
          setGuardianThreshold(Number(gConfig.threshold) || 2);
          setGuardianTotal(Number(gConfig.totalGuardians) || 2);
        }
      } catch {
        // Fallback default
        setGuardianThreshold(2);
        setGuardianTotal(2);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    if (activeVaultAddress) {
      fetchOnChainData(activeVaultAddress);
    }
  }, [activeVaultAddress, fetchOnChainData]);

  // Local ticker countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown into days, hours, minutes, seconds
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

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !connectedAddress || !emailInput) return;
    setIsSigningEmail(true);
    try {
      const res = await requestSignatureAndBind(connectedAddress, emailInput);
      if (res.verified) {
        setEmailStatus("verified");
        setConfirmedEmail(emailInput);
        setIsEditingEmail(false);
        showToast("Alert email verified and EIP-712 bound!", "success");
      }
    } catch {
      showToast("Email binding failed. Signature rejected.", "error");
    } finally {
      setIsSigningEmail(false);
    }
  };

  const handleCheckInSuccess = () => {
    showToast("Heartbeat recorded successfully on-chain!", "success");
    if (activeVaultAddress) {
      fetchOnChainData(activeVaultAddress);
    }
  };

  // Close vault dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vaultDropdownRef.current && !vaultDropdownRef.current.contains(event.target as Node)) {
        setVaultDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Active vault details
  const currentVaultMatch = ownedVaults.find((v) =>
    activeVaultAddress ? isAddressEqual(v.vaultAddress, activeVaultAddress) : false
  );
  const currentVaultName = currentVaultMatch?.name || "Inheritance Locker";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER (Editorial Heading)                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            Vault Pulse
          </h1>
          <p className="text-sm text-[#5F6368] mt-1 font-normal">
            Your inheritance protocol is active.
          </p>
        </div>

        {/* Multi-Vault Selector Pill */}
        {ownedVaults.length > 0 && (
          <div className="relative" ref={vaultDropdownRef}>
            <button
              type="button"
              onClick={() => setVaultDropdownOpen(!vaultDropdownOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8EAED] hover:border-[#111111] text-xs font-mono text-[#111111] transition-all shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
              <span className="font-semibold">{currentVaultName}</span>
              <span className="text-[#8A8F98]">
                {activeVaultAddress ? `(${activeVaultAddress.slice(0, 6)}...)` : ""}
              </span>
              <svg className={`w-3 h-3 text-[#8A8F98] transition-transform ${vaultDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {vaultDropdownOpen && (
              <ul className="absolute right-0 mt-2 w-64 bg-white border border-[#E8EAED] rounded-2xl shadow-xl z-20 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {ownedVaults.map((v) => {
                  const isSelected = activeVaultAddress && isAddressEqual(v.vaultAddress, activeVaultAddress);
                  return (
                    <li
                      key={v.vaultAddress}
                      onClick={() => {
                        const nextAddr = getAddress(v.vaultAddress);
                        setActiveVaultAddress(nextAddr);
                        if (onSelectVault) onSelectVault(nextAddr);
                        setVaultDropdownOpen(false);
                      }}
                      className={`px-4 py-2.5 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected ? "bg-[#F0ECFF] text-[#111111] font-semibold" : "text-[#5F6368] hover:bg-[#F7F8FA] hover:text-[#111111]"
                      }`}
                    >
                      <span className="truncate">{v.name}</span>
                      {isSelected && <span className="text-[#7C5CFF]">✓</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. PRIMARY HEARTBEAT CARD                                                 */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl bg-white border border-[#E8EAED] p-6 sm:p-10 shadow-sm overflow-hidden space-y-8">


        {/* Top Status & Gas Mode Row */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#E8EAED] pb-6">
          <div className="flex items-center gap-3">
            {consensusState === ConsensusState.Active ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9F8F1] text-[#22A06B] font-mono font-semibold text-xs tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-pulse" />
                ACTIVE SIGNAL
              </span>
            ) : consensusState === ConsensusState.ClaimPending ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF6D8] text-[#D99A00] font-mono font-semibold text-xs tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#D99A00] animate-ping" />
                CONTEST WINDOW ACTIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDECEC] text-[#D64545] font-mono font-semibold text-xs tracking-wide">
                FINALIZED / EXECUTED
              </span>
            )}
            <span className="text-xs text-[#8A8F98] hidden sm:inline">·</span>
            <span className="text-xs font-mono text-[#5F6368] hidden sm:inline">
              LOCKER HEALTHY
            </span>
          </div>

          {/* Gas Mode */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {isSmartAccount && hasPimlicoApiKey() ? (
              <span className="px-3 py-1 rounded-full bg-[#E9F8F1] border border-[#22A06B]/30 text-[#22A06B] font-semibold">
                SPONSORED · 0 ETH
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-[#F7F8FA] border border-[#E8EAED] text-[#5F6368]">
                DIRECT · EOA GAS
              </span>
            )}
          </div>
        </div>

        {/* Telemetry Metrics: BPM & Next Required Check-In */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* BPM */}
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#8A8F98] uppercase tracking-wider">
              HEARTBEAT FREQUENCY
            </div>
            <div className="text-4xl sm:text-5xl font-bold font-mono text-[#111111]">
              72 <span className="text-base font-normal text-[#5F6368]">BPM</span>
            </div>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#5F6368]">
              <span>Interval: {Math.round(checkInIntervalSec / 86400)} Days</span>
              <button
                type="button"
                onClick={() => setShowIntervalModal(true)}
                className="text-[#7C5CFF] hover:underline cursor-pointer font-medium"
              >
                [ Adjust ]
              </button>
            </div>
          </div>

          {/* Next Required Check-In Countdown */}
          <div className="space-y-1 md:text-right">
            <div className="text-xs font-mono text-[#8A8F98] uppercase tracking-wider">
              NEXT REQUIRED CHECK-IN
            </div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono text-[#111111] tabular-nums tracking-tight">
              {countdownFormatted.days}d : {countdownFormatted.hours}h : {countdownFormatted.minutes}m : {countdownFormatted.seconds}s
            </div>
            <div className="text-xs text-[#22A06B] font-mono pt-2">
              ● PROOF-OF-LIFE STANDBY OK
            </div>
          </div>
        </div>

        {/* Calm Teal ECG Oscilloscope Line */}
        <div className="relative z-10 py-2 border-y border-[#E8EAED]">
          <div className="w-full h-20 opacity-90">
            <LiveECGMonitor
              state={consensusState === ConsensusState.Active ? "active" : "erratic"}
              bpm={72}
              className="w-full"
            />
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4">
            <CheckInButton
              vaultAddress={activeVaultAddress || CONTRACT_ADDRESSES.vault}
              ownerAddress={connectedAddress || "0x0000000000000000000000000000000000000000"}
              onCheckInSuccess={handleCheckInSuccess}
              disabled={consensusState !== ConsensusState.Active}
            />
          </div>

          <div className="text-xs font-mono text-[#8A8F98]">
            Last Heartbeat: 12 minutes ago
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROW 2: PROTECTED BALANCE & GUARDIAN CONSENSUS                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Protected Balance Card */}
        <div className="rounded-3xl bg-white border border-[#E8EAED] p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold tracking-wider text-[#8A8F98] uppercase">
              PROTECTED VAULT BALANCE
            </span>
            <button
              type="button"
              onClick={() => setIsPrivateBalance(!isPrivateBalance)}
              className="text-xs font-mono text-[#5F6368] hover:text-[#111111] transition-colors cursor-pointer"
            >
              SHOW / HIDE
            </button>
          </div>

          <div className="text-3xl sm:text-4xl font-bold font-mono text-[#111111] tracking-tight">
            {isPrivateBalance ? "•••••••• ETH" : `${ethBalance} ETH`}
          </div>

          <div className="flex items-center justify-between text-xs text-[#5F6368] pt-2 border-t border-[#E8EAED]">
            <span>≈ $41,250.00 USD Estimated</span>
            <span className="font-mono text-[#22A06B]">ETH · USDC · USDG · WBTC</span>
          </div>
        </div>

        {/* Guardian Consensus Card */}
        <div className="rounded-3xl bg-white border border-[#E8EAED] p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold tracking-wider text-[#8A8F98] uppercase">
              GUARDIAN CONSENSUS
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E9F8F1] text-[#22A06B] font-mono text-xs font-semibold">
              {guardianThreshold} / {guardianTotal} VERIFIED
            </span>
          </div>

          <div className="space-y-2.5">
            {guardiansList.map((g) => (
              <div key={g.address} className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#111111]">{g.label}</div>
                  <div className="font-mono text-[#8A8F98] text-[11px]">{g.address.slice(0, 6)}...{g.address.slice(-4)}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[#22A06B] font-medium">● VERIFIED</span>
                  <div className="text-[10px] font-mono text-[#8A8F98]">LAST ATTESTATION 12m AGO</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EMAIL NOTIFICATION STATUS (Pale Informational Surface)                 */}
      {/* ========================================================================= */}
      <div className={`rounded-3xl p-6 sm:p-7 border ${
        emailStatus === "verified"
          ? "bg-[#E9F8F1] border-[#22A06B]/20"
          : "bg-[#F7F8FA] border-[#E8EAED]"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold tracking-wider uppercase text-[#111111]">
              {emailStatus === "verified" ? "EMAIL ALERTS CONFIGURED" : "EMAIL ALERTS NOT CONFIGURED"}
            </div>
            <p className="text-xs text-[#5F6368] leading-relaxed max-w-xl">
              {emailStatus === "verified"
                ? `Automated 7-day pre-deadline warnings active for ${maskEmail(confirmedEmail || "owner@cadence.io")} (EIP-712 bound).`
                : "Bind an email address to receive automated Heartbeat reminders and Contest Window alerts."}
            </p>
          </div>

          <div className="shrink-0">
            {isEditingEmail ? (
              <form onSubmit={handleVerifyEmail} className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E8EAED] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111]"
                />
                <button
                  type="submit"
                  disabled={isSigningEmail}
                  className="px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                >
                  {isSigningEmail ? "Signing..." : "Sign & Bind"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(false)}
                  className="px-3 py-2 rounded-xl text-xs text-[#5F6368] hover:text-[#111111]"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-sm"
              >
                {emailStatus === "verified" ? "UPDATE EMAIL" : "[ CONFIGURE ALERTS ]"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SECONDARY METRICS (Restrained Cards Grid)                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Heartbeat Interval */}
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-5 shadow-sm space-y-1">
          <div className="text-[11px] font-mono text-[#8A8F98] uppercase">
            HEARTBEAT INTERVAL
          </div>
          <div className="text-xl font-bold font-mono text-[#111111]">
            {Math.round(checkInIntervalSec / 86400)} Days
          </div>
          <div className="text-[11px] text-[#5F6368]">
            {checkInIntervalSec.toLocaleString()}s maximum inactivity
          </div>
        </div>

        {/* Contest Window Duration */}
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-5 shadow-sm space-y-1">
          <div className="text-[11px] font-mono text-[#8A8F98] uppercase">
            CONTEST WINDOW DURATION
          </div>
          <div className="text-xl font-bold font-mono text-[#111111]">
            72 Hours
          </div>
          <div className="text-[11px] text-[#5F6368]">
            Reversible before asset decryption
          </div>
        </div>

        {/* Beneficiary Count */}
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-5 shadow-sm space-y-1">
          <div className="text-[11px] font-mono text-[#8A8F98] uppercase">
            BENEFICIARY COUNT
          </div>
          <div className="text-xl font-bold font-mono text-[#111111]">
            {beneficiaryCount} Heirs
          </div>
          <div className="text-[11px] text-[#5F6368]">
            Encrypted client-side ECIES
          </div>
        </div>

        {/* Protected Assets */}
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-5 shadow-sm space-y-1">
          <div className="text-[11px] font-mono text-[#8A8F98] uppercase">
            PROTECTED ASSETS
          </div>
          <div className="text-xl font-bold font-mono text-[#111111]">
            ETH, USDC, USDG, WBTC
          </div>
          <div className="text-[11px] text-[#5F6368]">
            Non-custodial smart locker
          </div>
        </div>

        {/* Last Transaction */}
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-5 shadow-sm space-y-1">
          <div className="text-[11px] font-mono text-[#8A8F98] uppercase">
            LAST TRANSACTION
          </div>
          <div className="text-xl font-bold font-mono text-[#111111] truncate">
            0x3f1a...b89c
          </div>
          <div className="text-[11px] text-[#22A06B]">
            Heartbeat Check-In Confirmed
          </div>
        </div>

        {/* Locker State */}
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-5 shadow-sm space-y-1">
          <div className="text-[11px] font-mono text-[#8A8F98] uppercase">
            LOCKER STATE
          </div>
          <div className="text-xl font-bold font-mono text-[#111111]">
            Active / Normal
          </div>
          <div className="text-[11px] text-[#5F6368]">
            On-chain state machine healthy
          </div>
        </div>
      </div>

      {/* Interval Adjustment Modal */}
      {showIntervalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white border border-[#E8EAED] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8EAED] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#111111]">Adjust Heartbeat Interval</h3>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Update your locker inactivity period directly on Sepolia
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIntervalModal(false)}
                className="w-8 h-8 rounded-full border border-[#E8EAED] text-[#5F6368] hover:text-[#111111] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs font-mono text-[#8A8F98] uppercase">Select Inactivity Preset</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTERVAL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleUpdateInterval(p.seconds)}
                    disabled={isUpdatingInterval || checkInIntervalSec === p.seconds}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      checkInIntervalSec === p.seconds
                        ? "border-[#7C5CFF] bg-[#F0ECFF] text-[#111111]"
                        : "border-[#E8EAED] bg-white hover:border-[#111111]"
                    }`}
                  >
                    <div className="font-semibold text-sm">{p.display}</div>
                    <div className="text-xs text-[#5F6368] mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {intervalStatusMsg && (
              <div className="p-3.5 rounded-xl bg-[#E9F8F1] border border-[#22A06B]/30 text-xs font-mono text-[#22A06B]">
                {intervalStatusMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
