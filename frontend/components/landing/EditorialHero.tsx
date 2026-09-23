"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useWalletModal } from "../ui/ConnectWalletModal";

export default function EditorialHero() {
  const { isConnected } = useAccount();
  const { openWalletModal } = useWalletModal();

  // Dynamic realistic countdown for Card 2
  const [timeLeft, setTimeLeft] = useState({
    days: 42,
    hours: 18,
    minutes: 35,
    seconds: 22,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-white">
      <div className="max-w-[1200px] mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Headline, Copy, Actions */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-left">
            {/* Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-[66px] lg:text-[70px] font-bold text-[#111111] leading-[1.05] sm:leading-[0.98] tracking-[-0.035em] max-w-[680px]">
              Life has a rhythm. This protocol listens for it.
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg md:text-xl text-[#5F6368] leading-relaxed max-w-md lg:max-w-[540px] font-normal">
              Cadence secures regulated, yield-bearing family wealth for the next generation of retail investors — not speculative crypto for DeFi natives.
            </p>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              {isConnected ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-[#222222] transition-colors shadow-sm text-center"
                >
                  Enter Protocol Dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openWalletModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-[#222222] transition-colors shadow-sm cursor-pointer text-center"
                >
                  CONNECT WALLET TO BEGIN
                </button>
              )}

              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-full bg-white border border-[#D9DCE1] text-[#111111] text-sm font-medium hover:border-[#AEB3BB] hover:bg-[#F7F8FA] transition-colors text-center"
              >
                HOW IT WORKS
              </a>
            </div>

            {/* Feature Callouts */}
            <div className="pt-6 sm:pt-8 border-t border-[#E8EAED] grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-medium text-[#5F6368]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] shrink-0" />
                <span>Arbitrum Sepolia & Robinhood Chain Live</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] shrink-0" />
                <span>2-of-3 Resilient Consensus (Backup Nomination)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] shrink-0" />
                <span>Paxos USDG (7.00% Robinhood Earn APY)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] shrink-0" />
                <span>Arbitrum Stylus WASM Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] shrink-0" />
                <span>Client-side encrypted allocations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] shrink-0" />
                <span>72-hour reversible Contest Window</span>
              </div>
            </div>
          </div>

          {/* Right Column: Product UI Visualization */}
          <div className="lg:col-span-6 w-full py-4 lg:py-6">
            {/* MOBILE STACKED COMPOSITION */}
            <div className="block lg:hidden space-y-3.5 max-w-md mx-auto">
              {/* Mobile Card 1: Heartbeat Signal */}
              <div className="w-full bg-white rounded-2xl border border-[#E8EAED] p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#8A8F98] uppercase">
                  <span>SIGNAL 01 · HEALTHY</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B] shadow-[0_0_8px_rgba(34,160,107,0.6)]" />
                </div>
                <div className="mt-1 text-base font-bold text-[#111111]">
                  Heartbeat active
                </div>
                <div className="my-2.5 border-t border-[#F1F3F5]" />
                <div className="flex items-center justify-between text-xs font-semibold text-[#111111]">
                  <span>Rate: 72 BPM</span>
                  <span className="text-[11px] font-mono text-[#22A06B]">PROOF-OF-LIFE</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8A8F98] pt-1">
                  <span>INTERVAL 30 DAYS</span>
                  <span>13:45 UTC</span>
                </div>
              </div>

              {/* Mobile Card 2: Contest Countdown */}
              <div className="w-full bg-white rounded-2xl border border-[#E8EAED] p-4 sm:p-5 shadow-sm">
                <div className="text-[11px] font-mono tracking-wider text-[#8A8F98] uppercase">
                  WHEN INACTIVE · 72H CONTEST
                </div>
                <div className="mt-1 text-base font-bold text-[#111111]">
                  Next check-in window
                </div>
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg bg-[#F7F8FA] px-3 py-2 text-xs">
                    <span className="font-medium text-[#111111]">Remaining Time</span>
                    <span className="font-mono font-bold text-[#D64545] tabular-nums">
                      {timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 text-xs text-[#5F6368]">
                    <span>Settlement Status</span>
                    <span className="font-semibold text-[#111111]">Reversible</span>
                  </div>
                </div>
              </div>

              {/* Mobile Card 3: Guardian Consensus */}
              <div className="w-full bg-white rounded-2xl border border-[#E8EAED] p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono tracking-wider text-[#8A8F98] uppercase">
                    STEP 02 · READY
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F7F8FA] text-[#22A06B] text-[10px] font-bold tracking-wider uppercase border border-[#E8EAED]">
                    RESILIENT
                  </span>
                </div>
                <div className="mt-1 text-base font-bold text-[#111111]">
                  Guardian consensus
                </div>
                <div className="my-2.5 border-t border-[#F1F3F5]" />
                <div className="grid grid-cols-3 gap-2 text-left">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#8A8F98]">GUARDIANS</div>
                    <div className="text-xs font-bold font-mono text-[#111111] mt-0.5">2 / 3</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#8A8F98]">PROTECTED</div>
                    <div className="text-xs font-bold font-mono text-[#111111] mt-0.5">10,000 USDG</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#8A8F98]">ALLOCATION</div>
                    <div className="text-xs font-bold font-mono text-[#22A06B] mt-0.5">ENCRYPTED</div>
                  </div>
                </div>
              </div>
            </div>

            {/* DESKTOP FLOATING COMPOSITION */}
            <div className="hidden lg:flex justify-center relative">
              <div className="relative w-full max-w-[500px] min-h-[500px]">
                {/* Background decorative dotted matrix */}
                <div className="absolute bottom-16 left-0 grid grid-cols-8 gap-2 pointer-events-none -z-10 opacity-30">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <span key={i} className="w-1 h-1 rounded-full bg-[#AEB3BB]" />
                  ))}
                </div>

                {/* SVG Curved Connector Lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox="0 0 500 500"
                  fill="none"
                >
                  <path
                    d="M 230 145 C 230 185, 270 195, 270 205"
                    stroke="#D9DCE1"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <circle cx="230" cy="145" r="3" fill="#FFFFFF" stroke="#D9DCE1" strokeWidth="1.2" />
                  <path
                    d="M 340 330 C 340 375, 280 370, 270 385"
                    stroke="#D9DCE1"
                    strokeWidth="1.2"
                  />
                  <circle cx="340" cy="330" r="3.5" fill="#FFFFFF" stroke="#D9DCE1" strokeWidth="1.5" />
                </svg>

                {/* CARD 1 (Top Left): Heartbeat Signal */}
                <div className="relative z-20 w-[290px] sm:w-[320px] bg-white rounded-xl border border-[#E8EAED] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#8A8F98] uppercase">
                    <span>SIGNAL 01 · HEALTHY</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B] shadow-[0_0_8px_rgba(34,160,107,0.6)]" />
                  </div>
                  <div className="mt-1 text-base font-bold text-[#111111]">
                    Heartbeat active
                  </div>

                  <div className="my-3 border-t border-[#F1F3F5]" />

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#111111] flex items-center justify-between">
                      <span>Rate: 72 BPM</span>
                      <span className="text-[11px] font-mono text-[#22A06B]">PROOF-OF-LIFE</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#8A8F98] pt-1">
                      <span>INTERVAL 30 DAYS</span>
                      <span>13:45 UTC</span>
                    </div>
                  </div>
                </div>

                {/* CARD 2 (Middle Right): Contest Countdown */}
                <div className="relative z-20 w-[300px] sm:w-[335px] ml-auto -mt-6 bg-white rounded-xl border border-[#E8EAED] p-5 shadow-[0_12px_32px_rgb(0,0,0,0.08)] transition-transform hover:-translate-y-0.5">
                  <div className="text-[11px] font-mono tracking-wider text-[#8A8F98] uppercase">
                    WHEN INACTIVE · 72H CONTEST
                  </div>
                  <div className="mt-1 text-base font-bold text-[#111111]">
                    Next check-in window
                  </div>

                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between rounded-lg bg-[#F7F8FA] px-3 py-2 text-xs">
                      <span className="font-medium text-[#111111]">Remaining Time</span>
                      <span className="font-mono font-bold text-[#D64545] tabular-nums">
                        {timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-3 py-1.5 text-xs text-[#5F6368]">
                      <span>Settlement Status</span>
                      <span className="font-semibold text-[#111111]">Reversible</span>
                    </div>
                  </div>
                </div>

                {/* CARD 3 (Bottom Left): Guardian Consensus */}
                <div className="relative z-30 w-[320px] sm:w-[350px] -mt-6 bg-white rounded-xl border border-[#E8EAED] p-5 shadow-[0_12px_32px_rgb(0,0,0,0.08)] transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono tracking-wider text-[#8A8F98] uppercase">
                      STEP 02 · READY
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F7F8FA] text-[#22A06B] text-[10px] font-bold tracking-wider uppercase border border-[#E8EAED]">
                      RESILIENT
                    </span>
                  </div>

                  <div className="mt-1 text-base font-bold text-[#111111]">
                    Guardian consensus
                  </div>

                  <div className="my-3 border-t border-[#F1F3F5]" />

                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#8A8F98]">
                        GUARDIANS
                      </div>
                      <div className="text-xs font-bold font-mono text-[#111111] mt-0.5">
                        2 / 3
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#8A8F98]">
                        PROTECTED
                      </div>
                      <div className="text-xs font-bold font-mono text-[#111111] mt-0.5">
                        10,000 USDG
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#8A8F98]">
                        ALLOCATION
                      </div>
                      <div className="text-xs font-bold font-mono text-[#22A06B] mt-0.5">
                        ENCRYPTED
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
