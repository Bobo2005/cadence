"use client";

import React from "react";

export default function SecurityExplanation() {
  const securityPillars = [
    {
      index: "01",
      title: "Assets Remain Self-Custodied",
      tag: "NON-CUSTODIAL LOCKER",
      description:
        "Your crypto capital resides directly inside your dedicated, immutable smart contract locker on Ethereum. There are no private keys held by centralized custodians, no centralized servers with withdrawal rights, and no escrow backdoors.",
    },
    {
      index: "02",
      title: "Allocations Encrypted Client-Side",
      tag: "ECIES ASYMMETRIC ENCRYPTION",
      description:
        "Beneficiary percentages, addresses, and blinding salts are encrypted client-side using ECIES before submission. The smart contract only commits a 32-byte cryptographic Merkle root (allocationRoot). Plaintext data is never written on-chain.",
    },
    {
      index: "03",
      title: "Zero-Knowledge Guardian Attestation",
      tag: "BLIND QUORUM",
      description:
        "Guardians only verify whether an inactivity lapse has occurred. Because allocations and balances are cryptographically blinded, guardian nodes cannot inspect your estate balance, identify other heirs, or coordinate bribery attacks.",
    },
    {
      index: "04",
      title: "Contestable Irreversible Threshold",
      tag: "EIP-712 STEALTH CANCELLATION",
      description:
        "Distribution cannot occur immediately upon a timeout. A mandatory 72-hour Contest Window opens, giving the owner complete reversibility. A single gasless stealth signature instantly voids false-positive claims and resets the locker.",
    },
  ];

  return (
    <section id="security" className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#232838]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-4 border-b border-[#232838]">
        <div>
          <div className="text-[11px] font-mono text-[#2EE6A8] uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8]" />
            CRYPTOGRAPHIC TRUST MODEL
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F7FA] tracking-tight">
            Institutional Security Architecture
          </h2>
        </div>
        <p className="text-xs font-mono text-[#A6AFBC] max-w-sm">
          Strict on-chain invariants designed to eliminate single points of failure, coercion, and false-alarm triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securityPillars.map((pillar) => (
          <div
            key={pillar.index}
            className="p-6 bg-[#12161F] border border-[#232838] space-y-3 relative hover:border-[#2EE6A8]/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2EE6A8]">
                {`${pillar.index} // SPECIFICATION`}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#0A0E14] text-[#A6AFBC] border border-[#232838]">
                {pillar.tag}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#F5F7FA]">
              {pillar.title}
            </h3>
            <p className="text-xs text-[#A6AFBC] leading-relaxed">
              {pillar.description}
            </p>
          </div>
        ))}
      </div>

      {/* Cryptographic Comparison Matrix */}
      <div className="mt-8 p-5 bg-[#0A0E14] border border-[#232838] space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-[#A6AFBC] font-bold">
          SECURITY ASSURANCES &amp; PROTOCOL INVARIANTS:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#12161F] border border-[#232838]">
            <span className="text-[#2EE6A8] font-bold block mb-1">✓ IMMUTABLE SMART CONTRACT</span>
            <span className="text-[#A6AFBC]">Direct custody via Ethereum Sepolia deployment; no upgrade proxy backdoors.</span>
          </div>
          <div className="p-3 bg-[#12161F] border border-[#232838]">
            <span className="text-[#2EE6A8] font-bold block mb-1">✓ ZERO PLAINTEXT LEAKAGE</span>
            <span className="text-[#A6AFBC]">Merkle roots and ECIES ciphertexts prevent front-running and public exposure.</span>
          </div>
          <div className="p-3 bg-[#12161F] border border-[#232838]">
            <span className="text-[#2EE6A8] font-bold block mb-1">✓ REVERSIBLE SETTLEMENT</span>
            <span className="text-[#A6AFBC]">Owner signature overrides any claim attempt prior to grace expiration.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
