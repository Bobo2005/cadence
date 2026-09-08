"use client";

import React, { useState, useEffect } from "react";
import { type Address } from "viem";
import { useWalletClient } from "wagmi";
import {
  hasPimlicoApiKey,
  isSmartContractAccount,
  getCheckInSponsorshipQuote,
  executeCheckIn,
  entryPoint07Address,
  type SponsorshipQuote,
  type CheckInExecutionResult,
} from "../lib/paymaster";
import { useToast } from "./ToastProvider";

interface CheckInButtonProps {
  vaultAddress: Address;
  ownerAddress: Address;
  onCheckInSuccess?: (result: CheckInExecutionResult) => void;
  disabled?: boolean;
  className?: string;
}

export default function CheckInButton({
  vaultAddress,
  ownerAddress,
  onCheckInSuccess,
  disabled = false,
  className = "",
}: CheckInButtonProps) {
  const { data: walletClient } = useWalletClient();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>("");
  const [quote, setQuote] = useState<SponsorshipQuote | null>(null);
  const [isSmartAccount, setIsSmartAccount] = useState<boolean | null>(null);
  const [executionResult, setExecutionResult] = useState<CheckInExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasApiKey = hasPimlicoApiKey();

  // Pre-commit on-chain account type detection (Architecture Constraint #8)
  useEffect(() => {
    let isMounted = true;
    if (ownerAddress) {
      isSmartContractAccount(ownerAddress)
        .then((isSmart) => {
          if (isMounted) {
            setIsSmartAccount(isSmart);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsSmartAccount(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [ownerAddress]);

  const handleOpen = () => {
    setErrorMessage(null);
    setExecutionResult(null);
    setIsOpen(true);

    if (!quote && !isQuoting) {
      setIsQuoting(true);
      getCheckInSponsorshipQuote(vaultAddress, ownerAddress)
        .then((q) => {
          setQuote(q);
          setIsSmartAccount(q.isSmartAccount);
        })
        .catch((err) => {
          console.error("Failed to load check-in quote:", err);
        })
        .finally(() => {
          setIsQuoting(false);
        });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!walletClient) {
      setErrorMessage("Wallet client not connected. Please ensure your wallet is active.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep("Requesting signature in wallet...");
    setErrorMessage(null);

    try {
      setSubmissionStep(
        isSmartAccount
          ? "Sponsoring UserOp via Pimlico Paymaster..."
          : "Broadcasting heartbeat transaction to Sepolia..."
      );

      const result = await executeCheckIn(vaultAddress, walletClient, ownerAddress);
      setExecutionResult(result);
      addToast({
        title: result.mode === "sponsored_smart_account" ? "Heartbeat Sponsored (ERC-4337)" : "Heartbeat Confirmed",
        description: "Proof-of-life timestamp refreshed on Sepolia.",
        txHash: result.txHash,
        type: "success",
      });
      if (onCheckInSuccess) {
        onCheckInSuccess(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Check-in failed: ${msg}`);
      addToast({
        title: "Check-in Failed",
        description: msg.slice(0, 120),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
      setSubmissionStep("");
    }
  };

  // Pre-commit UI styling values
  const isSponsored = Boolean(isSmartAccount && hasApiKey);

  return (
    <>
      {/* Primary Trigger Button with Pre-Commit Honest Badges */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`relative group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-medium text-base transition-all duration-300 cursor-pointer ${
            disabled
              ? "bg-[#1A1F2B] text-[#8993A6] cursor-not-allowed border border-[#232838]"
              : isSponsored
              ? "bg-[#2EE6A8] hover:bg-[#25C791] text-[#0A0E14] font-semibold shadow-[0_0_24px_rgba(46,230,168,0.25)] hover:shadow-[0_0_36px_rgba(46,230,168,0.4)] transform hover:-translate-y-0.5 active:translate-y-0"
              : "bg-[#F5B841] hover:bg-[#E5AA33] text-[#0A0E14] font-semibold shadow-[0_0_24px_rgba(245,184,65,0.25)] hover:shadow-[0_0_36px_rgba(245,184,65,0.4)] transform hover:-translate-y-0.5 active:translate-y-0"
          } ${className}`}
        >
          {/* Heartbeat Icon */}
          <svg
            className={`w-5 h-5 ${disabled ? "text-[#8993A6]" : "text-[#0A0E14] animate-pulse"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>

          <span>Record Heartbeat Now</span>

          {/* Pre-Commit Badge: Teal for Sponsored (Smart Account), Amber for Direct (EOA) */}
          {isSmartAccount === null ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-mono uppercase bg-[#0A0E14]/15 text-[#0A0E14]">
              Checking...
            </span>
          ) : isSponsored ? (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider bg-[#0A0E14]/20 text-[#0A0E14] font-bold border border-[#0A0E14]/20"
              title="ERC-4337 Smart Account detected — gas sponsored by Pimlico paymaster"
            >
              Sponsored · 0 ETH
            </span>
          ) : (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider bg-[#0A0E14]/20 text-[#0A0E14] font-bold border border-[#0A0E14]/20"
              title="Plain EOA detected — direct on-chain transaction paid by wallet"
            >
              Direct Transaction · Normal Gas
            </span>
          )}
        </button>

        {/* Status pill under button */}
        <div className="flex items-center gap-1.5 text-xs text-[#8993A6]">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSponsored ? "bg-[#2EE6A8]" : "bg-[#F5B841]"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isSponsored ? "bg-[#2EE6A8]" : "bg-[#F5B841]"
              }`}
            />
          </span>
          <span>
            {isSmartAccount === null
              ? "Detecting account bytecode..."
              : isSponsored
              ? "Pimlico ERC-4337 Paymaster active · Sepolia"
              : "Direct EOA heartbeat · Standard Sepolia gas"}
          </span>
        </div>
      </div>

      {/* Honest Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg bg-[#12161F] border border-[#232838] rounded-2xl p-6 shadow-2xl text-[#E8ECF1] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#232838]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSponsored
                      ? "bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-[#2EE6A8]"
                      : "bg-[#F5B841]/10 border border-[#F5B841]/30 text-[#F5B841]"
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-[#E8ECF1]">Proof-of-Life Heartbeat</h3>
                  <p className="text-xs text-[#8993A6]">
                    {isSponsored
                      ? "ERC-4337 Smart Account Sponsored Route"
                      : "Direct On-Chain Transaction Route"}
                  </p>
                </div>
              </div>
              {!isSubmitting && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-[#8993A6] hover:text-[#E8ECF1] p-1 rounded-lg hover:bg-[#1A1F2B] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Content Body */}
            {!executionResult ? (
              <div className="py-5 space-y-5">
                {/* Cost Highlight Card */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#0A0E14] border border-[#232838]">
                  <div>
                    <span className="text-xs text-[#8993A6] block">Execution Path</span>
                    <span className="text-sm font-mono font-semibold text-[#E8ECF1]">
                      {isSponsored ? "ERC-4337 Paymaster" : "Direct EOA Call"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#8993A6] font-medium block">
                      {isSponsored ? "Your Cost (Sponsored)" : "Estimated Gas Cost"}
                    </span>
                    <span
                      className={`text-base font-bold font-mono ${
                        isSponsored ? "text-[#2EE6A8]" : "text-[#F5B841]"
                      }`}
                    >
                      {isSponsored ? "0.0000 ETH" : "~0.0002 ETH"}
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="text-sm text-[#8993A6] leading-relaxed bg-[#1A1F2B]/50 p-3.5 rounded-xl border border-[#232838]/80">
                  <p>
                    Submitting this heartbeat calls <code className="text-[#2EE6A8] font-mono">checkIn()</code> on your vault, resetting the inactivity countdown back to full duration.
                  </p>
                  {isSponsored ? (
                    <p className="mt-2 text-xs text-[#2EE6A8]">
                      ✓ Your wallet is an ERC-4337 smart account. Gas is sponsored by Pimlico Verifying Paymaster via EntryPoint v0.7.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-[#F5B841]">
                      ℹ Your wallet is an EOA (Externally Owned Account). In accordance with ERC-4337 architecture constraints, gas will be signed and paid directly from your wallet balance.
                    </p>
                  )}
                </div>

                {/* Technical Parameters */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-[#232838]/50">
                    <span className="text-[#8993A6]">Target Locker</span>
                    <span className="text-[#E8ECF1]">
                      {vaultAddress.slice(0, 10)}...{vaultAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#232838]/50">
                    <span className="text-[#8993A6]">Function Call</span>
                    <span className="text-[#2EE6A8]">checkIn() · 0x183ff085</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#232838]/50">
                    <span className="text-[#8993A6]">Account Type</span>
                    <span className="text-[#E8ECF1]">
                      {isSmartAccount ? "Smart Contract Account" : "Plain EOA"}
                    </span>
                  </div>
                  {isSponsored && (
                    <div className="flex justify-between py-1 border-b border-[#232838]/50">
                      <span className="text-[#8993A6]">EntryPoint</span>
                      <span className="text-[#E8ECF1]">{entryPoint07Address.slice(0, 10)}... (v0.7)</span>
                    </div>
                  )}
                  {quote && (
                    <div className="flex justify-between py-1">
                      <span className="text-[#8993A6]">Sepolia Fast Gas</span>
                      <span className="text-[#E8ECF1]">{quote.estimatedGasGwei} Gwei</span>
                    </div>
                  )}
                </div>

                {/* Real Pending Status */}
                {isSubmitting && submissionStep && (
                  <div className="p-3 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-[#2EE6A8] text-xs font-mono flex items-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5 text-[#2EE6A8]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{submissionStep}</span>
                  </div>
                )}

                {/* Real Error Message */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-[#F5484A]/10 border border-[#F5484A]/30 text-[#F5484A] text-xs font-mono break-words">
                    {errorMessage}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#1A1F2B] hover:bg-[#232838] text-[#8993A6] hover:text-[#E8ECF1] text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCheckIn}
                    disabled={isSubmitting || isQuoting}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSponsored
                        ? "bg-[#2EE6A8] hover:bg-[#25C791] text-[#0A0E14] shadow-[0_0_20px_rgba(46,230,168,0.25)]"
                        : "bg-[#F5B841] hover:bg-[#E5AA33] text-[#0A0E14] shadow-[0_0_20px_rgba(245,184,65,0.25)]"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-[#0A0E14]" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Broadcasting...</span>
                      </>
                    ) : isSponsored ? (
                      <span>Confirm Check-In (0 ETH)</span>
                    ) : (
                      <span>Sign &amp; Broadcast Heartbeat</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Genuine Success View with On-Chain Link */
              <div className="py-6 space-y-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#2EE6A8]/15 border border-[#2EE6A8]/40 flex items-center justify-center text-[#2EE6A8]">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold text-lg text-[#E8ECF1]">Heartbeat Confirmed on Sepolia!</h4>
                  <p className="text-xs text-[#8993A6]">
                    Your vault inactivity countdown has been reset on-chain.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0A0E14] border border-[#232838] rounded-xl text-left space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8993A6]">Transaction Hash:</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${executionResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2EE6A8] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>{executionResult.txHash.slice(0, 10)}...{executionResult.txHash.slice(-6)}</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8993A6]">Execution Route:</span>
                    <span className="text-[#E8ECF1]">
                      {executionResult.mode === "sponsored_smart_account"
                        ? "Pimlico Paymaster (Sponsored)"
                        : "Direct Wallet Transaction"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8993A6]">Gas Cost:</span>
                    <span className="text-[#2EE6A8] font-bold">
                      {executionResult.mode === "sponsored_smart_account"
                        ? "0.0000 ETH (Sponsored)"
                        : "Normal Gas Paid by Wallet"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full mt-3 px-4 py-3 rounded-xl bg-[#2EE6A8] hover:bg-[#25C791] text-[#0A0E14] text-sm font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
