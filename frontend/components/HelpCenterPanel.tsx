"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

export type HelpCategory =
  | "ALL"
  | "GETTING STARTED"
  | "VAULTS"
  | "HEARTBEATS"
  | "GUARDIANS"
  | "BENEFICIARIES"
  | "CONTEST WINDOW"
  | "CLAIMS"
  | "SECURITY"
  | "NETWORK";

interface FAQItem {
  id: string;
  category: Exclude<HelpCategory, "ALL">;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  // 1. GETTING STARTED
  {
    id: "gs-01",
    category: "GETTING STARTED",
    question: "What is Cadence and how does it protect my assets?",
    answer:
      "Cadence is a non-custodial crypto inheritance protocol. You deposit assets into an autonomous on-chain Locker controlled solely by your private key. As long as you maintain a periodic Heartbeat, your funds remain untouched and private. If inactivity is detected and confirmed by decentralized guardians, an emergency Contest Window opens. If you do not reset it, your designated beneficiaries can decrypt and claim their individual allocations.",
  },
  {
    id: "gs-02",
    category: "GETTING STARTED",
    question: "What do I need to get started?",
    answer:
      "You only need an Ethereum-compatible wallet (such as MetaMask, Coinbase Wallet, or Rabby) connected to Ethereum Sepolia. To configure a Locker, you will specify your heartbeat check-in interval (e.g. 90 days), designate one or more beneficiary addresses with their respective percentage allocations, and deposit ETH or ERC-20 tokens.",
  },
  {
    id: "gs-03",
    category: "GETTING STARTED",
    question: "Can Cadence team or admins access my funds?",
    answer:
      "No. Cadence is strictly non-custodial. There are no admin keys, no backdoors, and no team multisig controls over your Locker funds. Only your private key can withdraw funds while active, and only valid cryptographic proofs from designated heirs can release funds after inactivity and contest expiration.",
  },

  // 2. VAULTS
  {
    id: "v-01",
    category: "VAULTS",
    question: "What assets can I store in a Cadence Locker?",
    answer:
      "Cadence natively supports native ETH and regulated ERC-20 tokens, featuring Paxos USDG as the premier retail stablecoin (modeled 7.00% APY pegged to published Robinhood Earn yield), alongside USDC, USDT, and WBTC. Token whitelists are enforced on-chain.",
  },
  {
    id: "v-02",
    category: "VAULTS",
    question: "Can I withdraw my assets or cancel a Locker at any time?",
    answer:
      "Yes. As long as your Locker is in the ACTIVE state, you retain sovereign ownership. You can withdraw all or part of your funds, update beneficiary allocations by publishing a new Merkle root, or close the Locker altogether.",
  },
  {
    id: "v-03",
    category: "VAULTS",
    question: "How are multiple Lockers managed?",
    answer:
      "You can create distinct Lockers for different portfolios or beneficiary tiers (e.g. immediate family vs. organizational continuity). Each Locker has its own autonomous address, heartbeat frequency, and Merkle root.",
  },
  {
    id: "v-04",
    category: "VAULTS",
    question: "Why Paxos USDG and how does the yield work?",
    answer:
      "Paxos USDG is a regulated global dollar designed for consumer protection and retail savings. Cadence aligns with Robinhood Earn's published 7.00% APY, allowing retail family estates to compound yield without crypto volatility. For USDG vaults, yield is calculated using a modeled rate pegged to Robinhood Earn's published APY.",
  },
  {
    id: "v-05",
    category: "VAULTS",
    question: "How do I fund my vault directly from Coinbase, Binance, or Kraken?",
    answer:
      "Cadence features an Assisted 1-Click QR Deposit Modal. When creating or funding your vault, select your exchange (Coinbase, Binance, or Kraken) or mobile Web3 wallet to generate a dynamic, pre-filled QR code with your target address and deposit amount. Open your exchange app, scan the code, and confirm the withdrawal using your native FaceID, TouchID, or exchange 2FA. You never type exchange passwords or expose API keys inside Cadence.",
  },

  // 3. HEARTBEATS
  {
    id: "hb-01",
    category: "HEARTBEATS",
    question: "How do I check in to prove I am active?",
    answer:
      "You can check in at any time with a single click from the Vault Pulse dashboard. Checking in resets the timer countdown back to its full configured duration (e.g. 90 days). You can also configure email reminders to notify you well before a check-in expires.",
  },
  {
    id: "hb-02",
    category: "HEARTBEATS",
    question: "What happens if I forget to check in?",
    answer:
      "If your configured interval elapses without a check-in, the Locker does NOT immediately distribute funds. Instead, decentralized guardian nodes verify inactivity and initiate the Contest Window. You receive urgent alerts and have the entire duration of the Contest Window (e.g., 72 hours) to reset the Locker.",
  },
  {
    id: "hb-03",
    category: "HEARTBEATS",
    question: "Is there a gasless way to check in?",
    answer:
      "Yes. Cadence supports gasless EIP-712 check-in signatures. You sign a typed message with your wallet off-chain, and an automated relayer submits the checkInWithSignature() transaction on your behalf.",
  },

  // 4. GUARDIANS
  {
    id: "g-01",
    category: "GUARDIANS",
    question: "Who are the Guardians and what authority do they hold?",
    answer:
      "Guardians are independent verification nodes (e.g. community sentinels, automated oracles, or trusted entities) that attest to inactivity. Guardians have ZERO access to your funds, ZERO knowledge of your beneficiaries, and CANNOT initiate distribution without consensus.",
  },
  {
    id: "g-02",
    category: "GUARDIANS",
    question: "How does Guardian consensus work?",
    answer:
      "Cadence enforces an m-of-n threshold rule. In our standard setup, at least 2 of 3 independent guardians must independently inspect the on-chain heartbeat and submit signed attestations before a Contest Window can open.",
  },
  {
    id: "g-03",
    category: "GUARDIANS",
    question: "Can I choose my own personal guardians?",
    answer:
      "Yes. In addition to public protocol sentinels, you can register custom trusted addresses (e.g. family attorneys, institutional custodians, or cold wallets) as your personal guardian quorum during vault setup.",
  },
  {
    id: "g-04",
    category: "GUARDIANS",
    question: "What is Guardian Resilience and backup nomination?",
    answer:
      "Guardian Resilience eliminates the risk of orphan lockouts if a guardian loses their private key or becomes unreachable. Guardians can nominate a non-custodial backup key. After an attestation waiting period elapses, the backup can submit consensus attestations, preventing estates from freezing.",
  },

  // 5. BENEFICIARIES
  {
    id: "b-01",
    category: "BENEFICIARIES",
    question: "How do I add beneficiaries to my Locker?",
    answer:
      "During vault creation or update, you enter each beneficiary's Ethereum address and allocation percentage (e.g. 60% / 40%). The Cadence interface combines these into a cryptographic Merkle tree and generates client-side encrypted allocation vouchers for each heir.",
  },
  {
    id: "b-02",
    category: "BENEFICIARIES",
    question: "Can beneficiaries see each other's addresses or share percentages?",
    answer:
      "No. Beneficiary privacy is absolute. Sibling allocations are blinded with individual cryptographic salts. An heir can only decrypt and prove their own allocation; they cannot inspect who else is in the vault or how much others receive.",
  },
  {
    id: "b-03",
    category: "BENEFICIARIES",
    question: "Do beneficiaries need a crypto wallet before the claim?",
    answer:
      "Beneficiaries only need an EVM wallet address to be designated as an heir. They do not need to interact with the protocol, install extensions, or hold gas tokens until they claim their inheritance upon vault finalization.",
  },
  {
    id: "b-04",
    category: "BENEFICIARIES",
    question: "Can I leave exchange accounts, master passwords, or seed phrase shards for my heirs?",
    answer:
      "Yes. Cadence provides an Off-Chain Legacy Box (Encrypted Vault Box). You can attach credentials, emergency recovery seeds, 1Password emergency kits, exchange login details, and 2FA Authenticator setup keys. Everything is sealed client-side inside browser RAM using hybrid AES-256-GCM + ECIES-secp256k1 envelope encryption under each heir's public key. The encrypted payload is uploaded to decentralized storage (IPFS/Pinata) where only the designated heir can decrypt it upon vault finalization.",
  },

  // 6. CONTEST WINDOW
  {
    id: "cw-01",
    category: "CONTEST WINDOW",
    question: "What is the Contest Window?",
    answer:
      "The Contest Window is Cadence's sovereign emergency safety valve. When guardian consensus detects a missed heartbeat, the Locker enters a temporary challenge state (typically 72 hours). Absolutely NO funds can be distributed during this window.",
  },
  {
    id: "cw-02",
    category: "CONTEST WINDOW",
    question: "How long does the Contest Window last?",
    answer:
      "The default recommended duration is 72 hours (48 hours on testnet setups), but you can customize it during Locker creation from 24 hours up to 30 days depending on your travel habits and operational profile.",
  },
  {
    id: "cw-03",
    category: "CONTEST WINDOW",
    question: "Can anyone trigger the Contest Window maliciously?",
    answer:
      "No. The smart contract strictly prohibits opening a Contest Window unless the owner's check-in interval has genuinely elapsed on-chain AND the required quorum of guardians have cryptographically signed inactivity attestations.",
  },

  // 7. CLAIMS
  {
    id: "c-01",
    category: "CLAIMS",
    question: "How does an heir claim their inheritance?",
    answer:
      "Once both the Heartbeat interval and Contest Window have fully elapsed, the Locker state transitions to FINALIZED. The heir navigates to the Claim Portal (/claim), connects their wallet, signs once to decrypt their allocation locally, and executes the claim transaction.",
  },
  {
    id: "c-02",
    category: "CLAIMS",
    question: "What is Cadence Streaming vs. Lump-Sum claim?",
    answer:
      "Heirs can choose instant lump-sum settlement or continuous per-second streaming (Cadence Streams). Cadence Streams integrates production-ready Aave v3 lending interfaces alongside a modeled 7.00% yield formula pegged to published Robinhood Earn USDG APY. Unvested principal is lent to liquidity pools, never staked.",
  },
  {
    id: "c-03",
    category: "CLAIMS",
    question: "Does an heir ever need to share their private key?",
    answer:
      "Never. Decryption of the allocation voucher happens entirely in-memory inside the browser using standard Web Crypto API. Your private keys never touch Cadence servers or any external API.",
  },
  {
    id: "c-04",
    category: "CLAIMS",
    question: "What happens if an heir's wallet is compromised?",
    answer:
      "Cadence Streams features on-chain anti-drainer circuit breakers. If an heir's keys are stolen, designated guardians or registered backup addresses can call pauseStream() and redirectStream() on-chain, freezing outflows and redirecting remaining streams to a secure cold hardware wallet.",
  },
  {
    id: "c-05",
    category: "CLAIMS",
    question: "How do heirs bypass Google Authenticator (2FA) when logging into inherited exchange accounts?",
    answer:
      "When an heir unlocks their inherited Legacy Box, Cadence's built-in RFC-6238 TOTP Authenticator Engine automatically detects any attached 2FA setup keys. It renders a synchronized, live Google Authenticator card directly in the browser with real-time 6-digit codes and an animated 30-second countdown bar. The heir simply copies the live code to log in, eliminating permanent exchange account lockouts.",
  },

  // 8. SECURITY
  {
    id: "s-01",
    category: "SECURITY",
    question: "What cryptographic standards does Cadence use?",
    answer:
      "Cadence implements peer-reviewed industry-standard cryptography: AES-GCM-256 for symmetric encryption, client-side ECIES-secp256k1 for share privacy, Keccak-256 double-hashed Merkle trees, EIP-712 structured typed signatures, and Arbitrum Stylus Rust WASM verification (stylus_merkle) for sub-cent on-chain proof execution.",
  },
  {
    id: "s-02",
    category: "SECURITY",
    question: "How does the protocol defend against front-running and MEV?",
    answer:
      "Reset signatures use private EIP-712 stealth payloads transmitted via private RPC relays directly to block builders. Merkle claim leaves include random blinding salts, preventing mempool searchers from identifying beneficiaries or stealing payouts.",
  },
  {
    id: "s-03",
    category: "SECURITY",
    question: "Are the smart contracts verified and audited?",
    answer:
      "Yes. All contracts are verified across Arbitrum Sepolia Arbiscan, Robinhood Explorer, and Sepolia Etherscan. The codebase features 252 / 252 passing Foundry tests across 18 suites and a clean Slither 0.11.6 static analysis pass (0 Critical, 0 High, 0 Medium across 55 contracts).",
  },
  {
    id: "s-04",
    category: "SECURITY",
    question: "Are decrypted passwords, private seeds, or 2FA keys ever saved to disk or Cadence servers?",
    answer:
      "Never. Cadence enforces strict Volatile RAM Isolation. Decryption occurs purely in-memory using the native browser Web Crypto API (SubtleCrypto). No plaintexts, unencrypted credentials, or TOTP seeds are ever written to localStorage, sessionStorage, IndexedDB, cookies, or sent across any network.",
  },
  {
    id: "s-05",
    category: "SECURITY",
    question: "How does the Assisted QR Deposit protect against exchange credential phishing?",
    answer:
      "The Assisted Deposit system does not require you to link an exchange account, connect via OAuth, or share API read/write keys. It operates purely through standard on-chain deposit addresses and EIP-681 payment URIs. The actual withdrawal execution and security authorization (FaceID, exchange 2FA, biometric authentication) occur exclusively inside your trusted exchange mobile app.",
  },

  // 9. NETWORK
  {
    id: "n-01",
    category: "NETWORK",
    question: "Which networks are supported today?",
    answer:
      "Cadence is deployed across three active testnets: Arbitrum Sepolia (Chain ID: 421614 — Nitro L2 Rollup supporting Stylus WASM and live Aave v3 lending integration), Robinhood Chain Testnet (Chain ID: 46630 — Arbitrum Orbit L2 featuring native Paxos USDG), and Ethereum Sepolia (Chain ID: 11155111 — baseline L1 reference implementation).",
  },
  {
    id: "n-02",
    category: "NETWORK",
    question: "How do I monitor network status and RPC health?",
    answer:
      "You can visit the dedicated Network Status dashboard (/network) and switch between Arbitrum Sepolia, Robinhood Chain, and Ethereum Sepolia to inspect live block numbers, round-trip RPC latency, and verified contract addresses for each network.",
  },
  {
    id: "n-03",
    category: "NETWORK",
    question: "Where can I view the deployed contract addresses?",
    answer:
      "All canonical contract addresses are listed on the Network Status page (/network) with direct links to Arbiscan, Robinhood Explorer, and Etherscan.",
  },
];

const CATEGORIES: HelpCategory[] = [
  "ALL",
  "GETTING STARTED",
  "VAULTS",
  "HEARTBEATS",
  "GUARDIANS",
  "BENEFICIARIES",
  "CONTEST WINDOW",
  "CLAIMS",
  "SECURITY",
  "NETWORK",
];

export default function HelpCenterPanel() {
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("gs-01");

  // Filter items by category and search term
  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;

      const inQuestion = item.question.toLowerCase().includes(query);
      const inAnswer = item.answer.toLowerCase().includes(query);
      const inCategory = item.category.toLowerCase().includes(query);

      return inQuestion || inAnswer || inCategory;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header: Sober Operational Style */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#8A8F98]">
          <span>PROTOCOL DOCUMENTATION</span>
          <span>·</span>
          <span className="text-[#22A06B] font-semibold">OPERATIONAL KNOWLEDGE BASE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
          Documentation & Help
        </h1>
        <p className="text-base sm:text-lg text-[#5F6368] max-w-3xl leading-relaxed">
          Concise operational guides, emergency protocol recovery procedures, and cryptographic specifications.
        </p>
      </div>

      {/* 2. EMERGENCY SAFETY-VALVE SECTION */}
      <section
        id="emergency-reset-guide"
        className="rounded-3xl bg-[#FFFBF0] border-2 border-[#F5B841] p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden"
      >


        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F5B841]/30 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF3D6] text-[#B45309] font-mono text-xs font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
              <span>EMERGENCY PROTOCOL RECOVERY</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              My Locker entered the Contest Window. What do I do?
            </h2>
          </div>
          <Link
            href="/contest"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#111111] text-white font-bold text-xs sm:text-sm hover:bg-black transition-all shadow-sm shrink-0"
          >
            <span>GO TO CONTEST WINDOW →</span>
          </Link>
        </div>

        <div className="space-y-4">
          <p className="text-sm sm:text-base text-[#111111] leading-relaxed font-medium">
            Do not panic. If your Locker has entered the Contest Window, guardians detected inactivity,
            but <span className="underline decoration-[#D97706] decoration-2 underline-offset-2 font-bold">nothing has been distributed yet</span>.
            Cadence provides a sovereign safety window (typically 72 hours) specifically designed for you to prove you are alive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/90 border border-[#F5B841]/40 space-y-2">
              <div className="text-xs font-mono font-bold text-[#B45309]">STEP 01</div>
              <div className="text-sm font-bold text-[#111111]">Open Contest Screen</div>
              <p className="text-xs text-[#5F6368] leading-relaxed">
                Connect your owner wallet and navigate directly to the Contest Window view at <code className="font-mono text-[11px] bg-[#FEF3D6] px-1 py-0.5 rounded">/contest</code>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-[#F5B841]/40 space-y-2">
              <div className="text-xs font-mono font-bold text-[#B45309]">STEP 02</div>
              <div className="text-sm font-bold text-[#111111]">Click Reset Action</div>
              <p className="text-xs text-[#5F6368] leading-relaxed">
                Click the high-contrast button: <strong className="text-[#111111]">RESET PROTOCOL: I&apos;M ALIVE</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-[#F5B841]/40 space-y-2">
              <div className="text-xs font-mono font-bold text-[#B45309]">STEP 03</div>
              <div className="text-sm font-bold text-[#111111]">Sign Stealth Proof</div>
              <p className="text-xs text-[#5F6368] leading-relaxed">
                Sign the typed EIP-712 confirmation in your wallet. It requires <strong className="text-[#111111]">zero on-chain gas</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-[#F5B841]/40 space-y-2">
              <div className="text-xs font-mono font-bold text-[#B45309]">STEP 04</div>
              <div className="text-sm font-bold text-[#111111]">Immediate ACTIVE State</div>
              <p className="text-xs text-[#5F6368] leading-relaxed">
                The pending claim is immediately voided on-chain, guardian alerts are canceled, and your regular timer restarts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Search Bar & Interactive Filter */}
      <div className="space-y-4">
        <div className="relative">
          <input
            id="help-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operational documentation, error codes, contracts, or recovery procedures..."
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white border border-[#E8EAED] text-sm text-[#111111] placeholder:text-[#8A8F98] focus:outline-none focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF] shadow-xs font-sans transition-all"
          />
          <svg
            className="w-5 h-5 text-[#8A8F98] absolute left-4 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8A8F98] hover:text-[#111111] bg-[#F1F3F5] px-2 py-0.5 rounded-md"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* 4. Category Cards / Pills */}
        <div className="flex flex-wrap gap-2 pt-1" role="tablist" aria-label="Documentation categories">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === "ALL"
                ? FAQ_ITEMS.length
                : FAQ_ITEMS.filter((i) => i.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#111111] text-white font-bold shadow-xs"
                    : "bg-white border border-[#E8EAED] text-[#5F6368] hover:border-[#111111] hover:text-[#111111]"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-[#F1F3F5] text-[#8A8F98]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. FAQ Rows & Technical Accordions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-[#8A8F98] px-1">
          <span>SHOWING {filteredFaqs.length} OPERATIONAL GUIDES</span>
          {selectedCategory !== "ALL" && (
            <span>CATEGORY: {selectedCategory}</span>
          )}
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-[#E8EAED] text-center space-y-3">
            <div className="text-sm font-semibold text-[#111111]">
              No guides match &quot;{searchQuery}&quot;
            </div>
            <p className="text-xs text-[#5F6368] max-w-sm mx-auto">
              Try searching for general terms like &quot;heartbeat&quot;, &quot;guardians&quot;, &quot;EIP-712&quot;, or reset your filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
              }}
              className="px-4 py-2 rounded-full bg-[#F1F3F5] text-xs font-mono text-[#111111] hover:bg-[#E8EAED]"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className="rounded-2xl bg-white border border-[#E8EAED] hover:border-[#D1D5DB] transition-all overflow-hidden shadow-2xs"
              >
                {/* Question Row */}
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F1F3F5] text-[#5F6368]">
                        {faq.category}
                      </span>
                      <span className="text-[11px] font-mono text-[#8A8F98]">#{faq.id}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#111111] tracking-tight pr-4">
                      {faq.question}
                    </h3>
                  </div>

                  <div className="shrink-0 pt-1 text-[#8A8F98]">
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-[#111111]" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Answer Content */}
                {isExpanded && (
                  <div className="px-5 pb-6 sm:px-6 border-t border-[#F1F3F5] pt-4 animate-in fade-in duration-150">
                    <p className="text-sm sm:text-base text-[#5F6368] leading-relaxed font-normal">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. Technical Support / Contact Footer Card */}
      <div className="rounded-3xl bg-white border border-[#E8EAED] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-bold text-[#111111]">
            Need verified protocol contracts or direct node telemetry?
          </div>
          <p className="text-xs text-[#5F6368]">
            Inspect live Sepolia contract code, RPC latency, and consensus quorum on the Network Status screen.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Link
            href="/network"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#F1F3F5] text-[#111111] font-mono text-xs font-semibold hover:bg-[#E8EAED] transition-colors"
          >
            VIEW NETWORK STATUS →
          </Link>
        </div>
      </div>
    </div>
  );
}
