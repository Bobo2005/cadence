"use client";

import React, { useState } from "react";
import Link from "next/link";

interface SecuritySection {
  id: string;
  number: string;
  title: string;
  whatItDoes: string;
  whyItMatters: string;
}

const SECURITY_SECTIONS: SecuritySection[] = [
  {
    id: "self-custody",
    number: "01",
    title: "Self-Custody",
    whatItDoes:
      "All deposited digital assets remain under your sole cryptographic authority until protocol settlement conditions are permanently fulfilled on-chain. No Cadence server, administrator, or third-party entity ever holds custody of your private keys or funds.",
    whyItMatters:
      "Eliminates counterparty insolvency, centralized exchange freezes, and rogue administrative seizures. While your locker is in ACTIVE status, you retain absolute authority to withdraw your tokens at any moment.",
  },
  {
    id: "client-side-encryption",
    number: "02",
    title: "Client-Side Encryption",
    whatItDoes:
      "All allocation percentages, heir identities, and blinding salts are encrypted inside your browser before any data is broadcast to the network or smart contracts.",
    whyItMatters:
      "Your estate plans and family inheritance arrangements remain completely confidential. Validators, indexers, block explorers, and RPC nodes cannot read your beneficiaries or their share distributions.",
  },
  {
    id: "guardian-consensus",
    number: "03",
    title: "2-of-3 Guardian Resilience Consensus",
    whatItDoes:
      "Inactivity cannot be triggered by a single party. A decentralized network of designated guardians must independently verify and submit cryptographic attestations reaching a strict 2-of-3 quorum. Furthermore, Guardian Resilience enables guardians to nominate non-custodial backup keys that activate after a waiting period, eliminating single-point-of-failure orphan lockouts if a guardian loses their keys.",
    whyItMatters:
      "Prevents unilateral claims, rogue oracle takeovers, and compromised guardian attacks. Even if an individual guardian becomes permanently unresponsive or loses their private key, their registered backup can attest to protocol consensus without compromising security.",
  },
  {
    id: "merkle-commitments",
    number: "04",
    title: "Merkle Commitments",
    whatItDoes:
      "The locker smart contract stores only a single 32-byte cryptographic root hash of all beneficiary allocations rather than unencrypted recipient lists and token amounts.",
    whyItMatters:
      "Guarantees that allocations are mathematically immutable and tamper-evident while minimizing on-chain gas footprint and preserving recipient privacy.",
  },
  {
    id: "heartbeat-mechanism",
    number: "05",
    title: "Heartbeat Mechanism",
    whatItDoes:
      "Locker activity is maintained via periodic Proof-of-Life heartbeats signed by the owner wallet. Heartbeats can be broadcast directly or sponsored via ERC-4337 verifying paymasters with zero gas overhead.",
    whyItMatters:
      "Provides an effortless, highly visible proof of life. As long as you maintain regular signals within your chosen timeframe, no inheritance procedure can ever initiate.",
  },
  {
    id: "contest-window",
    number: "06",
    title: "Contest Window",
    whatItDoes:
      "If inactivity is asserted and guardian quorum is met, the locker enters an emergency 72-hour reversible Contest Window before any assets can be finalized or claimed.",
    whyItMatters:
      "Acts as a protocol safety valve. If a false alarm occurs or guardians mistakenly assert inactivity while you are alive, you have a guaranteed 72-hour window to cancel the claim with an instant stealth reset.",
  },
  {
    id: "stealth-reset",
    number: "07",
    title: "EIP-712 Emergency Reset",
    whatItDoes:
      "During the Contest Window, the owner can cancel pending claims using an EIP-712 typed signature signed by an unlinkable stealth address. The reset payload can be relayed by any third party without gas.",
    whyItMatters:
      "Ensures Zero Gas Linkage. Even if your primary address is monitored or out of gas, an unlinkable emergency key can cancel false activations and restore your locker immediately.",
  },
  {
    id: "beneficiary-privacy",
    number: "08",
    title: "Beneficiary Privacy",
    whatItDoes:
      "Beneficiary claims utilize EIP-5564 stealth addresses and blinded Merkle proofs. An heir reveals only their specific leaf verification and cryptographic salt when claiming.",
    whyItMatters:
      "Prevents public clustering and blockchain espionage. Observers cannot determine which family members received assets or what shares were allocated to each beneficiary.",
  },
  {
    id: "on-chain-settlement",
    number: "09",
    title: "On-Chain Settlement",
    whatItDoes:
      "Final asset distribution executes deterministically through audited smart contract logic. Beneficiaries receive funds either via direct lump-sum transfer or streamed incrementally via smart account circuit breakers.",
    whyItMatters:
      "Eliminates probate courts, executor delays, and legal disputes. Asset transfer is governed strictly by verifiable math and irrevocable decentralized execution.",
  },
  {
    id: "arbitrum-stylus",
    number: "10",
    title: "Arbitrum Stylus WASM Verification",
    whatItDoes:
      "Merkle allocation proof verification is implemented as an Arbitrum Stylus Rust WASM contract (stylus_merkle), executing alongside standard EVM smart contracts with bit-for-bit mathematical equivalence.",
    whyItMatters:
      "Unlocks WebAssembly near-native compute speeds, reduces verification gas costs to fractions of a cent on Arbitrum Nitro chains, and proves composability between Rust and Solidity contracts.",
  },
  {
    id: "cadence-streams-anti-drainer",
    number: "11",
    title: "Anti-Drainer Stream Circuit Breakers",
    whatItDoes:
      "Cadence Streams releases an initial emergency liquidity buffer upon finalization and streams remaining funds per-second while accruing unvested yield. If an heir's wallet is compromised or drained, designated guardians or registered backup addresses can invoke pauseStream() and redirectStream() on-chain.",
    whyItMatters:
      "Transforms crypto inheritance from a fragile 100% lump-sum dump into an insulated family trust. Unvested capital is safeguarded against phishing drainers, redirecting the family fortune to secure cold storage.",
  },
];

export default function SecurityProtocolPanel() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = SECURITY_SECTIONS.filter((section) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(q) ||
      section.whatItDoes.toLowerCase().includes(q) ||
      section.whyItMatters.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 font-sans text-[#111111] animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. HEADER                                                                 */}
      {/* ========================================================================= */}
      <div className="border-b border-[#E8EAED] pb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            Security
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F8F9FA] border border-[#E8EAED] text-xs font-mono text-[#5F6368] self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-[#137333]" />
            <span>11 ARCHITECTURAL LAYERS</span>
          </div>
        </div>

        <p className="text-sm sm:text-base text-[#5F6368] max-w-3xl leading-relaxed">
          Understand what Cadence protects, what it does not expose, and how the protocol moves inheritance from signal to settlement across Arbitrum Sepolia, Robinhood Chain, and Ethereum Sepolia.
        </p>

        {/* Search / Filter Filter */}
        <div className="pt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search security architecture (e.g. Merkle, EIP-712, Stylus, Quorum)..."
            className="w-full sm:max-w-md px-4 py-2.5 rounded-2xl bg-white border border-[#E8EAED] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECURITY POSTURE DISCLOSURE NOTICE                                     */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8EAED] shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#5F6368]">
          <span>🛡</span>
          <span>Security Philosophy & Multi-Chain Verification Posture</span>
        </div>
        <p className="text-xs sm:text-sm text-[#5F6368] leading-relaxed">
          Cadence is engineered using defense-in-depth cryptographic primitives and non-custodial smart contracts. Smart contracts are verified on <strong>Arbitrum Sepolia</strong> (Chain ID: 421614), <strong>Robinhood Chain Testnet</strong> (Chain ID: 46630), and <strong>Ethereum Sepolia</strong> (Chain ID: 11155111). The codebase has passed <strong>252 / 252 Foundry tests across 18 suites</strong> and achieved a clean <strong>Slither 0.11.6 static analysis pass (0 Critical, 0 High, 0 Medium across 55 contracts)</strong>.
        </p>
        <div className="pt-1 flex flex-wrap items-center gap-4 text-xs font-mono text-[#137333]">
          <a
            href="https://sepolia.arbiscan.io/address/0x07f9e3f0c0bb2d45300711d4f425917fa493525d"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Arbitrum Sepolia Arbiscan ↗</span>
          </a>
          <a
            href="https://explorer.testnet.chain.robinhood.com/address/0x65d7646e9da74e4d537b3f11ebc32acf3a4fe38f"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Robinhood Explorer ↗</span>
          </a>
          <a
            href="https://sepolia.etherscan.io/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74#code"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Ethereum Sepolia Etherscan ↗</span>
          </a>
          <Link href="/network" className="hover:underline text-[#5F6368] font-semibold">
            Inspect Live Network Status →
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. NINE ARCHITECTURAL SECURITY SECTIONS                                   */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {filteredSections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8EAED] shadow-sm hover:border-[#111111]/30 transition-all space-y-6"
          >
            {/* Card Title & Section Number */}
            <div className="flex items-start sm:items-center justify-between gap-4 border-b border-[#E8EAED] pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#111111] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {section.number}
                </span>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#111111]">
                  {section.title}
                </h2>
              </div>

              <span className="text-[11px] font-mono text-[#8A8F98] uppercase tracking-wider shrink-0">
                LAYER {section.number}
              </span>
            </div>

            {/* WHAT IT DOES */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#5F6368] block">
                WHAT IT DOES
              </span>
              <p className="text-sm text-[#111111] leading-relaxed">
                {section.whatItDoes}
              </p>
            </div>

            {/* WHY IT MATTERS */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#137333] block">
                WHY IT MATTERS
              </span>
              <p className="text-sm text-[#5F6368] leading-relaxed">
                {section.whyItMatters}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
