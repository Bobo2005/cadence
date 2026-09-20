"use client";

import React from "react";

export default function EditorialProductPreview() {
  const steps = [
    {
      number: "1",
      title: "Deposit into your self-custodial locker",
      description:
        "A dedicated smart contract vault holding your ETH and tokens. You retain 100% control, private ownership, and withdrawal rights at all times.",
    },
    {
      number: "2",
      title: "Configure allocations client-side",
      description:
        "Designate heir addresses and percentage shares. All allocations are encrypted in your browser using ECIES before committing to Ethereum.",
    },
    {
      number: "3",
      title: "Designate zero-knowledge guardians",
      description:
        "Select trusted guardians who only attest to inactivity status. Guardians cannot see your vault balance, asset types, or heir identities.",
    },
    {
      number: "4",
      title: "Set heartbeat interval, then walk away",
      description:
        "The moment inactivity is detected and guardians confirm, a 72-hour reversible contest window protects against premature execution.",
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
