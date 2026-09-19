"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import CadenceLogo from "../ui/CadenceLogo";
import { useWalletModal } from "../ui/ConnectWalletModal";

export default function LandingHeader() {
  const { isConnected, address } = useAccount();
  const { openWalletModal } = useWalletModal();

  return (
    <header className="w-full border-b border-[#232838] bg-[#0A0E14]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Wordmark */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 bg-[#12161F] border border-[#232838] group-hover:border-[#2EE6A8]/50 transition-colors">
              <CadenceLogo size={26} showWordmark={false} />
            </div>
            <span className="font-sans font-black tracking-[0.2em] text-[#F5F7FA] text-base uppercase select-none">
              CADENCE
            </span>
          </Link>

          {/* Network & Protocol Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#12161F] border border-[#232838] text-[11px] font-mono text-[#A6AFBC]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8] animate-ping" />
            <span>SEPOLIA</span>
            <span className="text-[#3E4759]">&middot;</span>
            <span className="text-[#2EE6A8]">PROTOCOL ACTIVE</span>
          </div>
        </div>

        {/* Compact Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-[#A6AFBC]">
          <a href="#hero" className="hover:text-[#F5F7FA] transition-colors">Overview</a>
          <a href="#telemetry-preview" className="hover:text-[#F5F7FA] transition-colors">Live Console</a>
          <a href="#security" className="hover:text-[#F5F7FA] transition-colors">Cryptography</a>
          <Link href="/dashboard" className="hover:text-[#2EE6A8] transition-colors">App</Link>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#2EE6A8] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#2EE6A8]/90 transition-colors flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0E14]" />
              <span>DASHBOARD</span>
              <span className="text-[10px] text-[#0A0E14]/80 hidden sm:inline">
                ({address?.slice(0, 6)}...{address?.slice(-4)})
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={openWalletModal}
              className="px-4 py-2 border border-[#2EE6A8] text-[#2EE6A8] hover:bg-[#2EE6A8]/10 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <span>CONNECT WALLET</span>
              <span className="text-[10px] text-[#2EE6A8]/70">↗</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
