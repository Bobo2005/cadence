"use client";

import React from "react";
import CadenceLogo from "./CadenceLogo";
import { useWalletModal } from "./ConnectWalletModal";
import { useSwitchChain } from "wagmi";

/* ========================================================================= */
/* 1. LOADING: Light skeletons and restrained shimmer. No dark loading screen*/
/* ========================================================================= */
export interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
  label?: string;
}

export function LoadingSkeleton({
  rows = 3,
  className = "",
  label = "Loading protocol state...",
}: LoadingSkeletonProps) {
  return (
    <div
      className={`w-full p-6 sm:p-8 rounded-3xl bg-white border border-[#E8EAED] space-y-4 shadow-xs animate-in fade-in duration-150 ${className}`}
      role="status"
      aria-label={label}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#F1F3F5] animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="w-32 h-3.5 rounded-full bg-[#F1F3F5] animate-pulse" />
          <div className="w-48 h-2.5 rounded-full bg-[#EAECEF] animate-pulse" />
        </div>
      </div>

      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="w-full h-8 rounded-xl bg-[#F1F3F5] animate-pulse"
            style={{ width: `${100 - i * 12}%`, animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#8A8F98]">
        <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-pulse" />
        <span>{label}</span>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 2. WALLET DISCONNECTED: CONNECT WALLET                                    */
/* ========================================================================= */
export interface WalletDisconnectedStateProps {
  onConnectClick?: () => void;
  title?: string;
  description?: string;
}

export function WalletDisconnectedState({
  onConnectClick,
  title = "CONNECT WALLET",
  description = "A connected Ethereum wallet is required to interact with Cadence lockers, monitor heartbeat attestation signals, or execute claims.",
}: WalletDisconnectedStateProps) {
  const { openWalletModal } = useWalletModal();

  const handleConnect = () => {
    if (onConnectClick) onConnectClick();
    else openWalletModal();
  };

  return (
    <div className="w-full max-w-lg mx-auto my-8 p-8 sm:p-10 rounded-3xl bg-white border border-[#E8EAED] text-center space-y-6 shadow-sm animate-in fade-in duration-150">
      <div className="inline-flex p-3 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED]">
        <CadenceLogo size={36} showWordmark={false} />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#111111] uppercase">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-[#5F6368] max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={handleConnect}
          className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-xs font-mono bg-[#111111] text-white hover:bg-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm tracking-wider uppercase"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m4-5h-7a1 1 0 00-1 1v2a1 1 0 001 1h7a1 1 0 001-1v-2a1 1 0 00-1-1zm-3 2h.01" />
          </svg>
          <span>CONNECT WALLET</span>
        </button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. WRONG NETWORK: NETWORK MISMATCH                                        */
/* ========================================================================= */
export interface NetworkMismatchStateProps {
  onSwitchNetwork?: () => void;
  targetNetworkName?: string;
  targetChainId?: 11155111;
}

export function NetworkMismatchState({
  onSwitchNetwork,
  targetNetworkName = "Sepolia",
  targetChainId = 11155111,
}: NetworkMismatchStateProps) {
  const { switchChain } = useSwitchChain();

  const handleSwitch = () => {
    if (onSwitchNetwork) onSwitchNetwork();
    else switchChain?.({ chainId: targetChainId });
  };

  return (
    <div className="w-full max-w-lg mx-auto my-8 p-8 sm:p-10 rounded-3xl bg-[#FFF5F5] border-2 border-[#F5484A]/40 text-center space-y-6 shadow-sm animate-in fade-in duration-150">
      <div className="inline-flex p-3 rounded-2xl bg-white border border-[#FAD2CF] text-[#C5221F]">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#111111] uppercase">
          NETWORK MISMATCH
        </h2>
        <p className="text-xs sm:text-sm text-[#5F6368] max-w-sm mx-auto leading-relaxed">
          Cadence currently requires {targetNetworkName}.
        </p>
      </div>

      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={handleSwitch}
          className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-xs font-mono bg-[#111111] text-white hover:bg-black transition-all cursor-pointer shadow-sm tracking-wider uppercase"
        >
          [ SWITCH NETWORK ]
        </button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 4. TRANSACTION PENDING: TRANSACTION PENDING                               */
/* ========================================================================= */
export interface TransactionPendingStateProps {
  txHash?: string;
  actionTitle?: string;
  onCancel?: () => void;
}

export function TransactionPendingState({
  txHash,
  actionTitle = "On-chain state transition in progress",
  onCancel,
}: TransactionPendingStateProps) {
  return (
    <div className="w-full max-w-lg mx-auto my-8 p-8 sm:p-10 rounded-3xl bg-white border border-[#E8EAED] text-center space-y-6 shadow-sm animate-in fade-in duration-150">
      <div className="inline-flex p-4 rounded-full bg-[#F7F8FA] border border-[#E8EAED] text-[#5F6368]">
        <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#111111] uppercase">
          TRANSACTION PENDING
        </h2>
        <div className="text-xs font-mono font-bold text-[#5F6368] tracking-wider uppercase">
          AWAITING NETWORK CONFIRMATION
        </div>
        <p className="text-xs text-[#5F6368] max-w-sm mx-auto leading-relaxed pt-1">
          {actionTitle}
        </p>
      </div>

      {txHash && (
        <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E8EAED] text-xs font-mono text-[#5F6368] space-y-1">
          <div className="text-[10px] uppercase text-[#8A8F98]">TRANSACTION HASH</div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#111111] hover:underline font-bold break-all block"
          >
            {txHash} ↗
          </a>
        </div>
      )}

      {onCancel && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-mono text-[#8A8F98] hover:text-[#111111] transition-colors"
          >
            Dismiss Dialog
          </button>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* 5. SUCCESS: White surface plus success accent and explicit confirmation   */
/* ========================================================================= */
export interface SuccessConfirmationStateProps {
  title?: string;
  amount?: string;
  recipient?: string;
  txHash?: string;
  actionText?: string;
  onActionClick?: () => void;
  actionHref?: string;
}

export function SuccessConfirmationState({
  title = "INHERITANCE CLAIM SETTLED",
  amount,
  recipient,
  txHash,
  actionText = "RETURN TO CLAIM PORTAL",
  onActionClick,
  actionHref,
}: SuccessConfirmationStateProps) {
  return (
    <div className="w-full max-w-lg mx-auto my-8 p-8 sm:p-10 rounded-3xl bg-white border border-[#CEEAD6] text-center space-y-6 shadow-sm animate-in fade-in duration-150">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#137333] font-mono text-xs font-bold tracking-wider uppercase">
        <span className="w-2 h-2 rounded-full bg-[#137333]" />
        <span>● CONFIRMED</span>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#111111] uppercase">
          {title}
        </h2>
        {amount && (
          <div className="text-3xl sm:text-4xl font-bold font-mono text-[#137333] my-2">
            {amount}
          </div>
        )}
        {recipient && (
          <div className="text-xs font-mono text-[#5F6368]">
            TRANSFERRED TO <span className="text-[#111111] font-bold">{recipient}</span>
          </div>
        )}
      </div>

      {txHash && (
        <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E8EAED] text-xs font-mono text-[#5F6368] space-y-1">
          <div className="text-[10px] uppercase text-[#8A8F98]">VERIFIED ON SEPOLIA</div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#137333] hover:underline font-bold break-all block"
          >
            {txHash} ↗
          </a>
        </div>
      )}

      <div className="pt-2">
        {actionHref ? (
          <a
            href={actionHref}
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-xs font-mono bg-[#111111] text-white hover:bg-black transition-all shadow-sm uppercase tracking-wider"
          >
            {actionText} →
          </a>
        ) : onActionClick ? (
          <button
            type="button"
            onClick={onActionClick}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-xs font-mono bg-[#111111] text-white hover:bg-black transition-all shadow-sm uppercase tracking-wider cursor-pointer"
          >
            {actionText} →
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 6. FAILURE: Pale error surface, explanation and recovery action           */
/* ========================================================================= */
export interface FailureRecoveryStateProps {
  title?: string;
  errorMessage: string;
  recoveryActionText?: string;
  onRecoveryClick?: () => void;
  secondaryActionText?: string;
  onSecondaryClick?: () => void;
}

export function FailureRecoveryState({
  title = "Action Interrupted",
  errorMessage,
  recoveryActionText = "Try Again",
  onRecoveryClick,
  secondaryActionText = "Return to Dashboard",
  onSecondaryClick,
}: FailureRecoveryStateProps) {
  return (
    <div className="w-full max-w-lg mx-auto my-8 p-8 sm:p-10 rounded-3xl bg-[#FDECEC] border border-[#FAD2CF] text-center space-y-6 shadow-sm animate-in fade-in duration-150">
      <div className="inline-flex p-3 rounded-2xl bg-white border border-[#FAD2CF] text-[#C5221F]">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#C5221F] uppercase">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-[#111111] max-w-md mx-auto leading-relaxed font-mono">
          {errorMessage}
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRecoveryClick && (
          <button
            type="button"
            onClick={onRecoveryClick}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-bold text-xs font-mono bg-[#C5221F] text-white hover:bg-[#a51d1a] transition-all cursor-pointer shadow-sm uppercase tracking-wider"
          >
            {recoveryActionText}
          </button>
        )}
        {onSecondaryClick && (
          <button
            type="button"
            onClick={onSecondaryClick}
            className="w-full sm:w-auto px-5 py-3 rounded-full font-mono text-xs text-[#5F6368] hover:text-[#111111] hover:bg-white transition-colors border border-[#FAD2CF] cursor-pointer"
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 7. EMPTY CLAIM STATE: NO LOCKERS FOUND                                    */
/* ========================================================================= */
export interface EmptyClaimStateProps {
  connectedAddress?: string;
  onSwitchPersona?: (address: string) => void;
}

export function EmptyClaimState({
  connectedAddress,
  onSwitchPersona,
}: EmptyClaimStateProps) {
  return (
    <div className="rounded-3xl bg-white border border-[#E8EAED] p-8 sm:p-12 text-center space-y-6 shadow-sm">
      <div className="space-y-2 max-w-md mx-auto">
        <h3 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#111111] uppercase">
          NO LOCKERS FOUND
        </h3>
        <p className="text-xs sm:text-sm text-[#5F6368] leading-relaxed">
          No finalized inheritance allocations are associated with this wallet.
        </p>
      </div>

      {connectedAddress && (
        <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] max-w-sm mx-auto text-xs font-mono text-[#5F6368]">
          <span>Connected: </span>
          <span className="font-bold text-[#111111]">
            {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
          </span>
        </div>
      )}

      {onSwitchPersona && (
        <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#E8EAED] max-w-md mx-auto text-left space-y-3">
          <div className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wider">
            Reviewer / Judge Persona Switch
          </div>
          <p className="text-xs text-[#5F6368] leading-relaxed">
            Switch to a pre-configured heir wallet to inspect finalized allocations:
          </p>
          <div className="space-y-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => onSwitchPersona("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")}
              className="w-full p-2.5 rounded-xl bg-white border border-[#E8EAED] hover:border-[#111111] hover:bg-[#F7F8FA] flex items-center justify-between cursor-pointer transition-all text-left shadow-xs"
            >
              <span className="font-semibold text-[#111111]">Alice (Primary Heir · 40% Share)</span>
              <span className="text-[#5F6368] font-mono">0x7099...79C8 →</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchPersona("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")}
              className="w-full p-2.5 rounded-xl bg-white border border-[#E8EAED] hover:border-[#111111] hover:bg-[#F7F8FA] flex items-center justify-between cursor-pointer transition-all text-left shadow-xs"
            >
              <span className="font-semibold text-[#111111]">Bob (Secondary Heir · 60% Share)</span>
              <span className="text-[#5F6368] font-mono">0x3C44...93BC →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
