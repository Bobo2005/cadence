"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import CadenceLogo from "../components/ui/CadenceLogo";
import { useWalletModal } from "../components/ui/ConnectWalletModal";

export default function LandingPage() {
  const router = useRouter();
  const { isConnected, isConnecting } = useAccount();
  const { openWalletModal } = useWalletModal();

  // If already connected, auto-route to dashboard
  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  const handleConnectWallet = () => {
    if (isConnected) {
      router.push("/dashboard");
    } else {
      openWalletModal();
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0A0E14] text-[#E8ECF1] flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* ========================================================================= */}
      {/* BACKGROUND ECG PULSE LINE TEXTURE (Steady Active Rhythm)                  */}
      {/* Runs full-width horizontally through the screen behind the card           */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <svg
          className="w-[140%] max-w-none h-44 opacity-35 stroke-[#16382E]"
          viewBox="0 0 1600 120"
          fill="none"
          preserveAspectRatio="none"
        >
          {/* Subtle horizontal grid lines */}
          <line x1="0" y1="60" x2="1600" y2="60" stroke="#131B26" strokeWidth="1" strokeDasharray="6 6" />

          {/* Steady ECG Path traversing across the screen */}
          <path
            d="M 0,60 L 140,60 L 148,58 L 155,60 L 165,60 L 175,22 L 188,102 L 198,38 L 208,60 L 220,60 L 380,60 L 388,58 L 395,60 L 405,60 L 415,22 L 428,102 L 438,38 L 448,60 L 460,60 L 620,60 L 628,58 L 635,60 L 645,60 L 655,22 L 668,102 L 678,38 L 688,60 L 700,60 L 860,60 L 868,58 L 875,60 L 885,60 L 895,22 L 908,102 L 918,38 L 928,60 L 940,60 L 1100,60 L 1108,58 L 1115,60 L 1125,60 L 1135,22 L 1148,102 L 1158,38 L 1168,60 L 1180,60 L 1340,60 L 1348,58 L 1355,60 L 1365,60 L 1375,22 L 1388,102 L 1398,38 L 1408,60 L 1420,60 L 1600,60"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Ambient radial glow centered */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2EE6A8]/5 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* Top spacer / header area */}
      <div className="pt-12 px-6 flex justify-center z-10">
        {/* Intentionally empty to keep focus on center hero per reference mockup */}
      </div>

      {/* ========================================================================= */}
      {/* CENTER HERO & CONNECT WALLET CARD (Matches connect-wallet.png)           */}
      {/* ========================================================================= */}
      <main className="w-full max-w-xl mx-auto px-6 py-8 flex flex-col items-center z-10">
        {/* Brand Header: Logo + CADENCE Wordmark */}
        <div className="flex flex-col items-center mb-4">
          <div className="p-3 rounded-2xl bg-[#12161F]/60 border border-[#232838]/60 shadow-[0_0_20px_rgba(46,230,168,0.15)] mb-3">
            <CadenceLogo size={46} showWordmark={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-[#E8ECF1] uppercase">
            CADENCE
          </h1>
          {/* Badge: ACTIVE HEARTBEAT MINING */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12161F] border border-[#2EE6A8]/40 text-[#2EE6A8] text-[11px] font-mono tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8] animate-ping" />
            ACTIVE HEARTBEAT MINING
          </div>
        </div>

        {/* Centered Presentation Card */}
        <div className="w-full rounded-[22px] bg-[#12161F] border border-[#232838] p-8 sm:p-10 shadow-2xl relative text-center">
          {/* Card Headline */}
          <h2 className="text-xl sm:text-2xl font-bold text-[#E8ECF1] tracking-tight leading-snug mb-4">
            Life has a rhythm. This protocol listens for it.
          </h2>

          {/* One-paragraph explainer */}
          <p className="text-sm text-[#8993A6] leading-relaxed mb-8 max-w-md mx-auto">
            Cadence is a non-custodial, privacy-preserving inheritance locker. If
            your on-chain heartbeat stops and the check-in window expires, assets
            are autonomously and securely decrypted for your beneficiaries.
          </p>

          {/* Single CTA: Connect Wallet to Begin */}
          <div className="flex justify-center">
            <button
              id="connect-wallet-cta-button"
              type="button"
              disabled={isConnecting}
              onClick={handleConnectWallet}
              className="w-full sm:w-auto min-w-[240px] px-7 py-3.5 rounded-xl font-bold text-sm bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] active:scale-[0.98] transition-all duration-200 shadow-[0_0_24px_rgba(46,230,168,0.35)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#0A0E14]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Connecting to Protocol...</span>
                </>
              ) : isConnected ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span>Enter Protocol Dashboard</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m4-5h-7a1 1 0 00-1 1v2a1 1 0 001 1h7a1 1 0 001-1v-2a1 1 0 00-1-1zm-3 2h.01"
                    />
                  </svg>
                  <span>Connect Wallet to Begin</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER: CRITICAL COPY CORRECTION APPLIED                                   */}
      {/* Replaces false "Fully Audited Zero-Knowledge Key Sharding" with accurate   */}
      {/* architecture statements: Merkle commitments, ECIES & ERC-4337             */}
      {/* ========================================================================= */}
      <footer className="pb-8 pt-4 px-6 text-center z-10 space-y-1.5">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-[#5A6478]">
          <svg className="w-3.5 h-3.5 text-[#2EE6A8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>
            Merkle-Committed Guardian Consensus · ECIES Allocation Encryption · ERC-4337 Smart Accounts
          </span>
        </div>
        <div>
          <span className="text-[11px] font-mono text-[#3E4759]">
            Non-Custodial Architecture · Zero Plaintext Shares Committed On-Chain
          </span>
        </div>
      </footer>
    </div>
  );
}
