"use client";

import React, { useState } from "react";
import LiveECGMonitor from "../ui/LiveECGMonitor";

export default function ProductTelemetryPreview() {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <section id="telemetry-preview" className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-[#232838] pb-4">
        <div>
          <div className="text-[11px] font-mono text-[#2EE6A8] uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8] animate-pulse" />
            AUTHENTICATED CONSOLE PREVIEW
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F7FA] tracking-tight">
            Vault Pulse Telemetry Architecture
          </h2>
        </div>
        <div className="text-xs font-mono text-[#A6AFBC]">
          REAL-TIME STATE INSPECTION // LOCKER #082
        </div>
      </div>

      {/* Main Framed Product Console Container */}
      <div className="w-full bg-[#12161F] border border-[#232838] shadow-2xl relative overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="bg-[#0A0E14] border-b border-[#232838] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#232838] inline-block" />
              <span className="w-2.5 h-2.5 bg-[#232838] inline-block" />
              <span className="w-2.5 h-2.5 bg-[#232838] inline-block" />
            </div>
            <span className="text-[#A6AFBC] border-l border-[#232838] pl-3">
              CADENCE-CONSOLE://vault-pulse.sepolia.eth/0x81c3...91a2
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="px-2 py-0.5 bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/30">
              ● SEPOLIA
            </span>
            <span className="text-[#A6AFBC] hidden sm:inline">
              SYNCED 12s AGO
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Status & ECG Hero Card */}
          <div className="bg-[#0A0E14] border border-[#2EE6A8] p-5 sm:p-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232838]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-[#2EE6A8] animate-ping" />
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-[#2EE6A8] font-bold">
                    ACTIVE SIGNAL // HEALTHY
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#F5F7FA]">
                    Locker Heartbeat Rhythm
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="text-left sm:text-right">
                  <div className="text-[11px] font-mono text-[#A6AFBC]">HEARTBEAT CADENCE</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#2EE6A8]">
                    72 <span className="text-xs font-normal text-[#A6AFBC]">BPM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Oscilloscope Waveform embedded in console */}
            <div className="py-2">
              <LiveECGMonitor state="active" bpm={72} className="w-full h-20" />
            </div>

            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-[#232838]/60 text-xs font-mono text-[#A6AFBC]">
              <span>PROOF-OF-LIFE STATUS: MONITORED</span>
              <span className="text-[#2EE6A8]">LAST PULSE RECORDED: 12 MINUTES AGO</span>
            </div>
          </div>

          {/* 3-Column Telemetry Metric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Next Required Check-In */}
            <div className="p-5 bg-[#0A0E14] border border-[#232838] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#A6AFBC] uppercase">Next Check-In Deadline</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/30">
                  30D CADENCE
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#F5F7FA]">
                42d : 18h : 35m : 12s
              </div>
              <div className="pt-2 border-t border-[#232838] flex items-center justify-between text-xs font-mono">
                <span className="text-[#A6AFBC]">PAYMASTER STATUS</span>
                <span className="text-[#2EE6A8] font-bold">SPONSORED · 0 ETH</span>
              </div>
            </div>

            {/* Card 2: Protected Vault Balance */}
            <div className="p-5 bg-[#0A0E14] border border-[#232838] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#A6AFBC] uppercase">Protected Vault Balance</span>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-[11px] font-mono text-[#2EE6A8] hover:underline cursor-pointer"
                >
                  [{showBalance ? "HIDE" : "SHOW"}]
                </button>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#F5F7FA]">
                {showBalance ? "12.5000 ETH" : "•••••••• ETH"}
              </div>
              <div className="pt-2 border-t border-[#232838] flex items-center justify-between text-xs font-mono">
                <span className="text-[#A6AFBC]">ESTATE SPLIT</span>
                <span className="text-[#F5F7FA]">2 BENEFICIARIES (100%)</span>
              </div>
            </div>

            {/* Card 3: Guardian Consensus */}
            <div className="p-5 bg-[#0A0E14] border border-[#232838] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#A6AFBC] uppercase">Guardian Consensus</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/30">
                  QUORUM 2/2
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#A6AFBC]">Node #1 (0x81c3...91a2)</span>
                  <span className="text-[#2EE6A8]">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A6AFBC]">Node #2 (0x34d7...a1f0)</span>
                  <span className="text-[#2EE6A8]">ONLINE</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#232838] flex items-center justify-between text-xs font-mono">
                <span className="text-[#A6AFBC]">CONTEST WINDOW</span>
                <span className="text-[#F5B841]">ARMED (72H REVERSIBLE)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Console Status Footer */}
        <div className="bg-[#0A0E14] border-t border-[#232838] px-4 py-2.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#A6AFBC]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8]" />
            <span>CONTRACT: 0x4B35...F48a (InheritanceVault.sol)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>SLITHER PASS: 0 HIGH / CRIT</span>
            <span>EIP-712 REVERSIBLE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
