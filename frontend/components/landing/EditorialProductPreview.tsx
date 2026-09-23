"use client";

import React from "react";

export default function EditorialProductPreview() {
  const steps = [
    {
      number: "1",
      title: "Deposit into your self-custodial locker",
      description:
        "A dedicated smart contract vault holding your native ETH, Paxos USDG, or stablecoins on Arbitrum Sepolia and Robinhood Chain. You retain 100% control, private ownership, and withdrawal rights at all times.",
    },
    {
      number: "2",
      title: "Configure allocations & Cadence Streams",
      description:
        "Designate heir addresses, shares, and streaming schedules. Cadence Streams deposits unvested inheritance into Aave v3's live Arbitrum Sepolia market for supported assets, earning real, verifiable interest — USDG-denominated vaults use a modeled rate pegged to USDG's own published yield.",
    },
    {
      number: "3",
      title: "Designate 2-of-3 Resilient Guardians",
      description:
        "Designate trusted guardians who attest to inactivity status. Guardian Resilience includes non-custodial backup nomination to eliminate orphan lockouts, with zero access to balances or heir identities.",
    },
    {
      number: "4",
      title: "Set heartbeat interval & Stylus settlement",
      description:
        "The moment inactivity is confirmed, a 72-hour reversible contest window opens. Final settlement executes autonomously via high-performance Arbitrum Stylus Rust WASM Merkle verification.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#F7F8FA] border-y border-[#E8EAED]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section Header matching Sequence reference */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-14">
          <div className="lg:col-span-7">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111111] leading-tight">
              Autonomously settled the moment the window closes.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm md:text-base text-[#5F6368] leading-relaxed">
              Pre-programmed cryptography executes your intentions autonomously, within strict
              mathematical limits you set in advance.
            </p>
          </div>
        </div>

        {/* 4 Cards Grid matching Sequence reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-2xl border border-[#E8EAED] p-6 sm:p-7 shadow-sm hover:border-[#AEB3BB] hover:shadow-md transition-all flex flex-col justify-start"
            >
              {/* Step number — mono, no accent ring */}
              <div className="text-[11px] font-mono font-semibold text-[#8A8F98] uppercase tracking-wider mb-5">
                0{step.number}
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-[#111111] mb-2.5 leading-snug">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-[13px] text-[#5F6368] leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
