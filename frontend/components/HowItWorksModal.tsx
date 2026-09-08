"use client";

import React, { useState, useEffect } from "react";
import { CADENCE_VAULT_ADDRESS, DEMO_VAULT_ADDRESS } from "../lib/contracts";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPillar?: 1 | 2 | 3 | "overview";
}

export default function HowItWorksModal({
  isOpen,
  onClose,
  defaultPillar = "overview",
}: HowItWorksModalProps) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | "overview">(defaultPillar);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(defaultPillar);
  }, [defaultPillar]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0F131C] border border-[#232838] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] text-[#E8ECF1] p-6 sm:p-8 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1E2330] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2EE6A8] shadow-[0_0_10px_#2EE6A8] animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#2EE6A8]">
                Cryptographic Architecture & Proof-of-Life Primitives
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[#E8ECF1]">
              How Cadence Works
            </h2>
            <p className="text-xs text-[#8993A6] max-w-xl">
              Cadence eliminates custodial risk and single-point-of-failure dead man&apos;s switches with Merkle-committed inheritance, M-of-N guardians, and gasless stealth recovery.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#8993A6] hover:text-[#E8ECF1] hover:bg-[#1A1F2B] rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0A0E14] p-1.5 rounded-2xl border border-[#1E2330]">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "overview"
                ? "bg-[#1A1F2B] text-[#2EE6A8] border border-[#2EE6A8]/30 shadow-[0_0_12px_rgba(46,230,168,0.1)]"
                : "text-[#8993A6] hover:text-[#E8ECF1]"
            }`}
          >
            <span>Overview Flow</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(1)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 1
                ? "bg-[#1A1F2B] text-[#2EE6A8] border border-[#2EE6A8]/30 shadow-[0_0_12px_rgba(46,230,168,0.1)]"
                : "text-[#8993A6] hover:text-[#E8ECF1]"
            }`}
          >
            <span className="font-mono text-[10px] bg-[#2EE6A8]/10 px-1.5 py-0.5 rounded text-[#2EE6A8]">01</span>
            <span>Merkle + ECIES</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(2)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 2
                ? "bg-[#1A1F2B] text-[#2EE6A8] border border-[#2EE6A8]/30 shadow-[0_0_12px_rgba(46,230,168,0.1)]"
                : "text-[#8993A6] hover:text-[#E8ECF1]"
            }`}
          >
            <span className="font-mono text-[10px] bg-[#2EE6A8]/10 px-1.5 py-0.5 rounded text-[#2EE6A8]">02</span>
            <span>Proof of Life</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(3)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 3
                ? "bg-[#1A1F2B] text-[#2EE6A8] border border-[#2EE6A8]/30 shadow-[0_0_12px_rgba(46,230,168,0.1)]"
                : "text-[#8993A6] hover:text-[#E8ECF1]"
            }`}
          >
            <span className="font-mono text-[10px] bg-[#2EE6A8]/10 px-1.5 py-0.5 rounded text-[#2EE6A8]">03</span>
            <span>72h Contest + EIP-712</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* OVERVIEW FLOW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[#12161F] border border-[#232838] space-y-4">
                <h3 className="text-sm font-bold text-[#E8ECF1] flex items-center gap-2">
                  <span className="text-[#2EE6A8]">◈</span> End-to-End Execution Lifecycle
                </h3>

                {/* Visual Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-1.5">
                    <div className="font-mono text-[10px] text-[#2EE6A8] font-bold">STAGE 1: COMMIT</div>
                    <div className="font-semibold text-[#E8ECF1]">Merkle Vault Setup</div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      Owner locks assets and commits a Merkle root of beneficiary allocations. Metadata is encrypted client-side via ECIES.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-1.5">
                    <div className="font-mono text-[10px] text-[#F5B841] font-bold">STAGE 2: CADENCE</div>
                    <div className="font-semibold text-[#E8ECF1]">Heartbeat Monitoring</div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      Owner sends regular on-chain heartbeats. If interval lapses, optional M-of-N guardians can verify inactivity.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-1.5">
                    <div className="font-mono text-[10px] text-[#F5484A] font-bold">STAGE 3: BUFFER</div>
                    <div className="font-semibold text-[#E8ECF1]">72-Hour Contest Window</div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      Safe buffer prevents false positives. Owner can cancel anytime or execute gasless EIP-712 stealth recovery.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-1.5">
                    <div className="font-mono text-[10px] text-[#2EE6A8] font-bold">STAGE 4: UNLOCK</div>
                    <div className="font-semibold text-[#E8ECF1]">Decentralized Claim</div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      After 72h contest window finalizes, beneficiaries generate Merkle inclusion proofs to claim their exact shares.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verified Contracts on Sepolia */}
              <div className="p-4 rounded-2xl bg-[#0A0E14] border border-[#232838] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#E8ECF1] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2EE6A8]" />
                    Verified On-Chain on Sepolia Testnet
                  </div>
                  <div className="text-[11px] text-[#8993A6]">
                    Both standard (90-day) and accelerated (5-minute test) vaults are active.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(CADENCE_VAULT_ADDRESS, "standard")}
                    className="px-3 py-1.5 rounded-xl bg-[#12161F] border border-[#232838] text-[11px] font-mono text-[#8993A6] hover:text-[#2EE6A8] hover:border-[#2EE6A8]/40 transition-colors flex items-center gap-1.5"
                  >
                    <span>Main Vault: {CADENCE_VAULT_ADDRESS.slice(0, 6)}...{CADENCE_VAULT_ADDRESS.slice(-4)}</span>
                    <span className="text-[10px] text-[#2EE6A8]">{copiedAddress === "standard" ? "✓" : "Copy"}</span>
                  </button>

                  <a
                    href={`https://sepolia.etherscan.io/address/${CADENCE_VAULT_ADDRESS}#code`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 text-[11px] font-mono text-[#2EE6A8] hover:bg-[#2EE6A8]/20 transition-colors flex items-center gap-1"
                  >
                    <span>View on Etherscan</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* PILLAR 1: MERKLE ALLOCATION COMMITMENT & ECIES */}
          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[#12161F] border border-[#232838] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#E8ECF1] flex items-center gap-2">
                    <span className="text-[#2EE6A8]">Pillar 01:</span> Merkle Allocation Commitment & ECIES Encryption
                  </h3>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/20">
                      Merkle Trees
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2EE6A8]/10 text-[#2EE6A8] border border-[#2EE6A8]/20">
                      ECIES-secp256k1
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#8993A6] leading-relaxed">
                  Traditional inheritance protocols leak sensitive allocation data (e.g. who receives what percentage) on-chain for anyone to inspect. Cadence resolves this with cryptographic commitments:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-2">
                    <div className="font-semibold text-[#E8ECF1] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2EE6A8]" />
                      On-Chain Merkle Root Only
                    </div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      Only the 32-byte Merkle root is stored in the contract. Even if an attacker monitors contract state, they cannot deduce how many beneficiaries exist, their addresses, or their share distributions.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-2">
                    <div className="font-semibold text-[#E8ECF1] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2EE6A8]" />
                      Client-Side ECIES Encryption
                    </div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      Allocation amounts and Merkle sibling proofs are encrypted client-side using each beneficiary&apos;s secp256k1 public key. Only the beneficiary holding the corresponding private key can decrypt their allocation.
                    </p>
                  </div>
                </div>

                {/* Mathematical representation */}
                <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] font-mono text-[11px] text-[#8993A6] space-y-1">
                  <div className="text-[#2EE6A8] font-semibold">// Leaf Node Construction:</div>
                  <div>leaf = keccak256(abi.encodePacked(beneficiaryAddress, basisPoints, salt))</div>
                  <div className="text-[#2EE6A8] font-semibold pt-1">// Merkle Verification:</div>
                  <div>MerkleProof.verify(proof, root, leaf) == true</div>
                </div>
              </div>
            </div>
          )}

          {/* PILLAR 2: PROOF-OF-LIFE CONSENSUS */}
          {activeTab === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[#12161F] border border-[#232838] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#E8ECF1] flex items-center gap-2">
                    <span className="text-[#2EE6A8]">Pillar 02:</span> Proof-of-Life Consensus Primitive
                  </h3>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5B841]/10 text-[#F5B841] border border-[#F5B841]/20">
                      Heartbeat Pulse
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5B841]/10 text-[#F5B841] border border-[#F5B841]/20">
                      M-of-N Guardians
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#8993A6] leading-relaxed">
                  Single-trigger dead man switches are fragile: an owner might go on vacation, lose internet access, or have a medical emergency. Cadence uses a multi-layered inactivity consensus model:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-2">
                    <div className="font-semibold text-[#E8ECF1] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F5B841]" />
                      Configurable Cadence Interval
                    </div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      Owners choose their check-in cadence (e.g. 90 days for standard estate planning, or 5 minutes for rapid hackathon testing). Any on-chain heartbeat resets the timestamp.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-2">
                    <div className="font-semibold text-[#E8ECF1] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F5B841]" />
                      Guardian Affirmation Quorum
                    </div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      To prevent premature transitions, the owner can require M-of-N designated guardians (trusted family, attorneys, or institutional signers) to confirm inactivity before entering contest.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] font-mono text-[11px] text-[#8993A6] space-y-1">
                  <div className="text-[#F5B841] font-semibold">// State Transition Condition:</div>
                  <div>isInactive = (block.timestamp &gt; lastCheckIn + checkInInterval) &amp;&amp; (guardianApprovals &gt;= quorum)</div>
                </div>
              </div>
            </div>
          )}

          {/* PILLAR 3: 72H CONTEST + EIP-712 STEALTH CANCEL */}
          {activeTab === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[#12161F] border border-[#232838] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#E8ECF1] flex items-center gap-2">
                    <span className="text-[#2EE6A8]">Pillar 03:</span> 72-Hour Contest Window & EIP-712 Stealth Cancel
                  </h3>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5484A]/10 text-[#F5484A] border border-[#F5484A]/20">
                      EIP-712
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5484A]/10 text-[#F5484A] border border-[#F5484A]/20">
                      Zero Gas-Linkage
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#8993A6] leading-relaxed">
                  The most dangerous moment in an inheritance protocol is a false positive or key compromise. Cadence provides ironclad protection against both:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-2">
                    <div className="font-semibold text-[#E8ECF1] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F5484A]" />
                      Mandatory 72h Grace Period
                    </div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      Zero funds can move when inactivity is triggered. An immutable 72-hour contest window starts, during which notifications are dispatched to all registered channels.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0A0E14] border border-[#232838] space-y-2">
                    <div className="font-semibold text-[#E8ECF1] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2EE6A8]" />
                      EIP-712 Gasless Stealth Cancel
                    </div>
                    <p className="text-[11px] text-[#8993A6] leading-relaxed">
                      If the owner&apos;s main account is drained of ETH or under attacker surveillance, they sign an off-chain EIP-712 typed digest. Any relayer can broadcast it without funding or linking the owner&apos;s wallet.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0A0E14] border border-[#232838] font-mono text-[11px] text-[#8993A6] space-y-1">
                  <div className="text-[#2EE6A8] font-semibold">// EIP-712 Domain & Type Digest:</div>
                  <div>digest = _hashTypedDataV4(keccak256(abi.encode(CANCEL_TYPEHASH, vaultId, nonce, deadline)))</div>
                  <div>recoveredSigner = ECDSA.recover(digest, v, r, s);</div>
                  <div>require(recoveredSigner == owner, &quot;InvalidStealthSignature&quot;);</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1E2330] pt-4 text-xs text-[#8993A6]">
          <span>Built for Ethereum Security & Zero-Custody Inheritance</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1A1F2B] hover:bg-[#232838] text-[#E8ECF1] font-semibold transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
