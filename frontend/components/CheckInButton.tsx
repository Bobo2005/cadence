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
      if (onCheckInSuccess) {
        onCheckInSuccess(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Check-in failed: ${msg}`);
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
      <div className="flex flex-col items-start sm:items-center gap-2">
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`relative group inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer ${
            disabled
              ? "bg-[#E8EAED] text-[#8A8F98] cursor-not-allowed"
              : "bg-[#111111] hover:bg-black text-white shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
          } ${className}`}
        >
          {/* Heartbeat Icon */}
          <svg
            className={`w-4 h-4 ${disabled ? "text-[#8A8F98]" : "text-[#22A06B] animate-pulse"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>

          <span>RECORD HEARTBEAT NOW</span>

          {/* Pre-Commit Badge: Green for Sponsored (Smart Account), Neutral for Direct (EOA) */}
          {isSmartAccount === null ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-mono uppercase bg-white/10 text-white/80">
              Checking...
            </span>
          ) : isSponsored ? (
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider bg-[#22A06B]/20 text-[#22A06B] font-bold"
              title="ERC-4337 Smart Account detected — gas sponsored by Pimlico paymaster"
            >
              SPONSORED · 0 ETH
            </span>
          ) : (
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider bg-white/15 text-white/90 font-medium"
              title="Plain EOA detected — direct on-chain transaction paid by wallet"
            >
              DIRECT · EOA GAS
            </span>
          )}
        </button>
      </div>

      {/* Honest Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg bg-white border border-[#E8EAED] rounded-3xl p-6 sm:p-8 shadow-2xl text-[#111111] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E8EAED]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isSponsored
                      ? "bg-[#E9F8F1] text-[#22A06B]"
                      : "bg-[#FFF6D8] text-[#D99A00]"
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#111111]">Proof-of-Life Heartbeat</h3>
                  <p className="text-xs text-[#5F6368]">
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
                  className="w-8 h-8 rounded-full border border-[#E8EAED] text-[#5F6368] hover:text-[#111111] hover:border-[#AEB3BB] flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Content Body */}
            {!executionResult ? (
              <div className="py-5 space-y-5">
                {/* Cost Highlight Card */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED]">
                  <div>
                    <span className="text-xs text-[#5F6368] block">Execution Path</span>
                    <span className="font-mono text-sm font-semibold text-[#111111]">
                      {isSponsored ? "ERC-4337 UserOp" : "Direct Standard EOA"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#5F6368] block">Estimated Gas Cost</span>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        isSponsored ? "text-[#22A06B]" : "text-[#D99A00]"
                      }`}
                    >
                      {isSponsored ? "0.0000 ETH (Sponsored)" : quote ? `${quote.userCostEth} ETH` : "Wallet Balance"}
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="text-sm text-[#5F6368] leading-relaxed bg-[#F7F8FA] p-4 rounded-2xl border border-[#E8EAED]">
                  <p>
                    Submitting this heartbeat calls <code className="text-[#111111] bg-white px-1.5 py-0.5 rounded border border-[#E8EAED] font-mono">checkIn()</code> on your vault, resetting the inactivity countdown back to full duration.
                  </p>
                  {isSponsored ? (
                    <p className="mt-2 text-xs text-[#22A06B] font-medium">
                      ✓ Your wallet is an ERC-4337 smart account. Gas is sponsored by Pimlico Verifying Paymaster via EntryPoint v0.7.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-[#5F6368]">
                      ℹ Your wallet is an EOA (Externally Owned Account). Gas will be signed and paid directly from your wallet balance.
                    </p>
                  )}
                </div>

                {/* Technical Parameters */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-[#E8EAED]">
                    <span className="text-[#5F6368]">Target Locker</span>
                    <span className="text-[#111111]">
                      {vaultAddress.slice(0, 10)}...{vaultAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8EAED]">
                    <span className="text-[#5F6368]">Function Call</span>
                    <span className="text-[#111111]">checkIn() · 0x183ff085</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8EAED]">
                    <span className="text-[#5F6368]">Account Type</span>
                    <span className="text-[#111111]">
                      {isSmartAccount ? "Smart Contract Account" : "Plain EOA"}
                    </span>
                  </div>
                  {isSponsored && (
                    <div className="flex justify-between py-1 border-b border-[#E8EAED]">
                      <span className="text-[#5F6368]">EntryPoint</span>
                      <span className="text-[#111111]">{entryPoint07Address.slice(0, 10)}... (v0.7)</span>
                    </div>
                  )}
                  {quote && (
                    <div className="flex justify-between py-1">
                      <span className="text-[#5F6368]">Sepolia Fast Gas</span>
                      <span className="text-[#111111]">{quote.estimatedGasGwei} Gwei</span>
                    </div>
                  )}
                </div>

                {/* Real Pending Status */}
                {isSubmitting && submissionStep && (
                  <div className="p-3.5 rounded-xl bg-[#E9F8F1] border border-[#22A06B]/30 text-[#22A06B] text-xs font-mono flex items-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5 text-[#22A06B]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{submissionStep}</span>
                  </div>
                )}

                {/* Real Error Message */}
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-[#FDECEC] border border-[#D64545]/30 text-[#D64545] text-xs font-mono break-words">
                    {errorMessage}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-5 py-3 rounded-full bg-[#F7F8FA] hover:bg-[#F1F3F5] text-[#5F6368] hover:text-[#111111] text-sm font-medium transition-colors cursor-pointer border border-[#E8EAED]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCheckIn}
                    disabled={isSubmitting || isQuoting}
                    className="flex-1 px-5 py-3 rounded-full bg-[#111111] hover:bg-black text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Broadcasting...</span>
                      </>
                    ) : isSponsored ? (
                      <span>Confirm Check-In (0 ETH)</span>
                    ) : (
                      <span>Sign &amp; Broadcast Check-In</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Genuine Success View with On-Chain Link */
              <div className="py-6 space-y-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E9F8F1] border border-[#22A06B]/30 flex items-center justify-center text-[#22A06B]">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold text-lg text-[#111111]">Heartbeat Confirmed on Sepolia!</h4>
                  <p className="text-xs text-[#5F6368]">
                    Your vault inactivity countdown has been reset on-chain.
                  </p>
                </div>

                <div className="p-4 bg-[#F7F8FA] border border-[#E8EAED] rounded-2xl text-left space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5F6368]">Transaction Hash:</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${executionResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7C5CFF] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>{executionResult.txHash.slice(0, 10)}...{executionResult.txHash.slice(-6)}</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6368]">Execution Route:</span>
                    <span className="text-[#111111] font-medium">
                      {executionResult.mode === "sponsored_smart_account"
                        ? "Pimlico Paymaster (Sponsored)"
                        : "Direct Wallet Transaction"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6368]">Gas Cost:</span>
                    <span className="text-[#22A06B] font-bold">
                      {executionResult.mode === "sponsored_smart_account"
                        ? "0.0000 ETH (Sponsored)"
                        : "Normal Gas Paid by Wallet"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full mt-3 px-6 py-3 rounded-full bg-[#111111] hover:bg-black text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm"
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
