"use client";

import React from "react";

export default function EditorialSecuritySection() {
  const securityPillars = [
    {
      index: "01",
      title: "Assets remain strictly self-custodied",
      description:
        "Funds remain deposited in your dedicated non-custodial smart contract locker. Cadence contracts hold zero privileged access to withdraw or liquidate assets without your valid signature or verified inheritance proof.",
      tag: "NON-CUSTODIAL",
    },
    {
      index: "02",
      title: "Allocations encrypted client-side",
      description:
        "Beneficiary addresses, asset shares, and inheritance instructions are encrypted using browser-native ECIES (AES-GCM-256) before touching the network. Plaintext data never enters public mempools or RPC nodes.",
      tag: "CLIENT-SIDE ECIES",
    },
    {
      index: "03",
      title: "2-of-3 Resilient Guardian Quorum",
      description:
        "Guardians attest to inactivity without access to balances or heir identities. Guardian Resilience introduces non-custodial backup nomination to eliminate single-point-of-failure orphan lockouts.",
      tag: "RESILIENT QUORUM",
    },
    {
      index: "04",
      title: "Reversible 72-hour Contest Window",
      description:
        "Distribution cannot occur until the configured Contest Window expires. If guardians trigger prematurely, the owner can cancel with zero gas linkage via an off-chain EIP-712 stealth reset signature.",
      tag: "REVERSIBLE SETTLEMENT",
    },
    {
      index: "05",
      title: "Anti-Drainer Stream Circuit Breakers",
      description:
        "If an heir's wallet is compromised or drained, designated guardians or backup addresses can invoke pauseStream and redirectStream on-chain, redirecting all remaining inheritance to a secure cold wallet.",
      tag: "CIRCUIT BREAKER",
    },
  ];

  return (
    <section id="security" className="py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Heading & Philosophical framing */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111111] leading-tight">
              Security engineered for zero-trust inheritance.
            </h2>

            <p className="text-base text-[#5F6368] leading-relaxed">
              Traditional paper wills leak plaintext, and centralized platforms can freeze
              accounts. Cadence replaces human intermediaries with immutable on-chain state
              machines, zero-knowledge proofs, and automated contest safeguards.
            </p>

            <div className="p-5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] space-y-3">
              <div className="text-xs font-mono font-semibold text-[#111111] uppercase tracking-wider">
                Audited & Verified Across 18 Suites
              </div>
              <div className="text-xs text-[#5F6368] leading-relaxed">
                Deployed and verified on Arbitrum Sepolia, Robinhood Chain, and Ethereum Sepolia with 252/252 passing Foundry tests, 0 High/Critical findings in Slither 0.11.6 static analysis across 55 contracts, and Stylus Rust WASM verification.
              </div>
            </div>
          </div>

          {/* Right Column: 4 Spacious Security Cards */}
          <div className="lg:col-span-7 space-y-4">
            {securityPillars.map((pillar) => (
              <div
                key={pillar.index}
                className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E8EAED] hover:border-[#AEB3BB] transition-colors space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#7C5CFF]">
                    {`${pillar.index} // INVARIANT`}
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#F7F8FA] text-[#5F6368] border border-[#E8EAED]">
                    {pillar.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#111111]">
                  {pillar.title}
                </h3>
                <p className="text-sm text-[#5F6368] leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
