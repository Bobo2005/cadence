"use client";

import React from "react";
import WalletButton from "./WalletButton";

export interface TopBarProps {
  blockNumber?: bigint | null;
  secondsAgo?: number;
  isWrongNetwork?: boolean;
  onSwitchNetwork?: () => void;
  onOpenMobileMenu?: () => void;
  className?: string;
}

export default function TopBar({
  blockNumber,
  secondsAgo = 12,
  isWrongNetwork = false,
  onSwitchNetwork,
  onOpenMobileMenu,
  className = "",
}: TopBarProps) {
  return (
    <header
      className={`h-16 bg-white border-b border-[#E8EAED] sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between font-sans ${className}`}
    >
      {/* Left: Mobile menu toggle + Telemetry Network Pill */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onOpenMobileMenu && (
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-[#5F6368] hover:text-[#111111] hover:bg-[#F1F3F5] transition-colors cursor-pointer"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="px-2.5 py-0.5 rounded-full bg-[#E9F8F1] text-[#22A06B] font-mono font-medium text-xs">
            SEPOLIA
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#5F6368]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse" />
            <span className="hidden sm:inline">SYNCED {secondsAgo}s AGO</span>
            <span className="sm:hidden">{secondsAgo}s</span>
          </div>
          {blockNumber && (
            <span className="hidden lg:inline text-xs font-mono text-[#8A8F98]">
              #{blockNumber.toString()}
            </span>
          )}
        </div>
      </div>

      {/* Right: Network warning and Wallet Control */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isWrongNetwork && onSwitchNetwork && (
          <button
            type="button"
            onClick={onSwitchNetwork}
            className="px-2.5 sm:px-3 py-1 rounded-full bg-[#FDECEC] border border-[#D64545]/30 text-[11px] sm:text-xs font-medium text-[#D64545] hover:bg-[#FDECEC]/80 transition-colors cursor-pointer"
          >
            Switch to Sepolia
          </button>
        )}
        <WalletButton />
      </div>
    </header>
  );
}
