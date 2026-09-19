"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import CadenceLogo from "../ui/CadenceLogo";
import { useWalletModal } from "../ui/ConnectWalletModal";
import LiveECGMonitor from "../ui/LiveECGMonitor";

export default function LandingHero() {
  const { isConnected, isConnecting } = useAccount();
  const { openWalletModal } = useWalletModal();

  const handlePrimaryClick = () => {
    if (!isConnected) {
      openWalletModal();
    }
  };

  return (
    <section id="hero" className="relative w-full pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="p-3 bg-[#12161F] border border-[#232838] mb-4 shadow-xl">
          <CadenceLogo size={42} showWordmark={false} />
        </div>
        
        {/* Status Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#12161F] border border-[#2EE6A8]/40 text-[#2EE6A8] text-[11px] font-mono tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8] animate-ping" />
          <span>ACTIVE HEARTBEAT MINING // PROTOCOL VERIFIED</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#F5F7FA] tracking-tight max-w-4xl leading-[1.15] mb-6 font-sans">
          Life has a rhythm. <br className="hidden sm:inline" />
          <span className="text-[#2EE6A8]">This protocol listens for it.</span>
        </h1>

        {/* Supporting Copy */}
        <p className="text-sm sm:text-base text-[#A6AFBC] leading-relaxed max-w-2xl mx-auto mb-8 font-sans">
          Cadence is a self-custodial digital inheritance protocol that monitors an on-chain cryptographic Heartbeat. Assets are protected by multi-signal guardian consensus and only distributed after verified inactivity and a reversible Contest Window.
        </p>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          {isConnected ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex-1 px-8 py-3.5 bg-[#2EE6A8] text-[#0A0E14] font-mono text-xs font-black tracking-wider uppercase hover:bg-[#2EE6A8]/90 active:scale-[0.99] transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ENTER PROTOCOL DASHBOARD</span>
              <span>→</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled={isConnecting}
              onClick={handlePrimaryClick}
              className="w-full sm:w-auto flex-1 px-8 py-3.5 bg-[#2EE6A8] text-[#0A0E14] font-mono text-xs font-black tracking-wider uppercase hover:bg-[#2EE6A8]/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isConnecting ? (
                <span>CONNECTING WALLET...</span>
              ) : (
                <>
                  <span>CONNECT WALLET TO BEGIN</span>
                  <span>↗</span>
                </>
              )}
            </button>
          )}

          <a
            href="#security"
            className="w-full sm:w-auto px-6 py-3.5 bg-[#12161F] hover:bg-[#1A1F2B] border border-[#232838] text-[#A6AFBC] hover:text-[#F5F7FA] font-mono text-xs font-bold tracking-wider uppercase transition-colors text-center cursor-pointer"
          >
            ARCHITECTURE &amp; SECURITY ↓
          </a>
        </div>
      </div>

      {/* Dynamic ECG Oscilloscope Line Container */}
      <div className="w-full max-w-5xl my-6 p-4 sm:p-6 bg-[#12161F] border border-[#232838] relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#232838] text-xs font-mono">
          <div className="flex items-center gap-2 text-[#2EE6A8]">
            <span className="w-2 h-2 rounded-full bg-[#2EE6A8] animate-pulse" />
            <span className="font-bold">SYSTEM TELEMETRY: ACTIVE RHYTHM</span>
          </div>
          <div className="text-[#A6AFBC] hidden sm:block">
            CALIBRATION: 62 BPM · ISOELECTRIC ISO-9901
          </div>
        </div>

        {/* Live Vector Animated Waveform */}
        <div className="w-full h-24 sm:h-28 flex items-center justify-center">
          <LiveECGMonitor state="active" bpm={62} className="w-full h-full" />
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#A6AFBC]">
          <span>FREQUENCY: CONTINUOUS SWEEP</span>
          <span className="text-[#2EE6A8]">STATUS: NOMINAL / HEALTHY</span>
        </div>
      </div>

      {/* Three Capability Callouts */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {/* Callout 1 */}
        <div className="p-5 bg-[#12161F] border border-[#232838] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#2EE6A8] uppercase tracking-wider">
              01 // CONSENSUS
            </span>
            <span className="text-[10px] font-mono text-[#A6AFBC] bg-[#0A0E14] px-1.5 py-0.5 border border-[#232838]">
              MERKLE ROOT
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F5F7FA]">
            Merkle-Committed Guardians
          </h3>
          <p className="text-xs text-[#A6AFBC] leading-relaxed">
            Decentralized 2-of-2 consensus verification. Guardians confirm an inactivity lapse without learning balances, portfolio composition, or heir identities.
          </p>
        </div>

        {/* Callout 2 */}
        <div className="p-5 bg-[#12161F] border border-[#232838] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#2EE6A8] uppercase tracking-wider">
              02 // PRIVACY
            </span>
            <span className="text-[10px] font-mono text-[#A6AFBC] bg-[#0A0E14] px-1.5 py-0.5 border border-[#232838]">
              ECIES ENCRYPTION
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F5F7FA]">
            Client-Side Encrypted Allocations
          </h3>
          <p className="text-xs text-[#A6AFBC] leading-relaxed">
            Heir percentages and blinded leaves are encrypted off-chain. Only the designated heir can decrypt their share locally in-memory via deterministic signatures.
          </p>
        </div>

        {/* Callout 3 */}
        <div className="p-5 bg-[#12161F] border border-[#232838] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#F5B841] uppercase tracking-wider">
              03 // REVERSIBILITY
            </span>
            <span className="text-[10px] font-mono text-[#F5B841] bg-[#F5B841]/10 px-1.5 py-0.5 border border-[#F5B841]/30">
              72H WINDOW
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F5F7FA]">
            Reversible Contest Window
          </h3>
          <p className="text-xs text-[#A6AFBC] leading-relaxed">
            Nothing is finalized immediately. If a false-alarm occurs, the vault owner signs a gasless EIP-712 stealth signature (<code className="text-[#2EE6A8]">cancelClaimWithSig</code>) to instantly reset the vault.
          </p>
        </div>
      </div>
    </section>
  );
}
