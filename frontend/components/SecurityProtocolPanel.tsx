"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CONTRACT_ADDRESSES } from "../lib/contracts";

interface SecuritySection {
  id: string;
  number: string;
  title: string;
  whatItDoes: string;
  whyItMatters: string;
  technicalDetail: {
    overview: string;
    contracts?: string[];
    primitives?: string[];
    invariants?: string[];
    codeSnippet?: string;
  };
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
    technicalDetail: {
      overview:
        "InheritanceVault is a non-custodial smart contract deployed per locker. Deposited ETH or ERC-20 tokens are held directly in contract storage and can be withdrawn by the designated owner via ownerWithdraw().",
      contracts: ["InheritanceVault.sol"],
      primitives: ["Solidity msg.sender verification", "ReentrancyGuard", "SafeERC20"],
      invariants: [
        "ownerWithdraw() requires msg.sender == owner and consensusState == Active",
        "Zero protocol admin withdrawal keys or backdoor upgrade proxies",
      ],
      codeSnippet: `function ownerWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
    require(consensus.getConsensusState(address(this)) == ConsensusState.Active, "Locker not active");
    if (token == address(0)) {
        (bool s, ) = payable(owner()).call{value: amount}("");
        require(s, "Transfer failed");
    } else {
        IERC20(token).safeTransfer(owner(), amount);
    }
}`,
    },
  },
  {
    id: "client-side-encryption",
    number: "02",
    title: "Client-Side Encryption",
    whatItDoes:
      "All allocation percentages, heir identities, and blinding salts are encrypted inside your browser before any data is broadcast to the network or smart contracts.",
    whyItMatters:
      "Your estate plans and family inheritance arrangements remain completely confidential. Validators, indexers, block explorers, and RPC nodes cannot read your beneficiaries or their share distributions.",
    technicalDetail: {
      overview:
        "Cadence utilizes ECIES (Elliptic Curve Integrated Encryption Scheme) on secp256k1 with ephemeral key generation, AES-256-CBC payload encryption, and HMAC-SHA256 authentication.",
      contracts: ["lib/encryption.ts", "lib/merkle.ts"],
      primitives: ["secp256k1 ECIES", "AES-256-CBC", "HMAC-SHA256", "In-memory key derivation"],
      invariants: [
        "Plaintext allocation data is never transmitted across HTTP or RPC endpoints",
        "Decryption keys are ephemeral in-memory and derived locally via EIP-191 personal_sign",
      ],
      codeSnippet: `// Ephemeral ECIES Encryption per Beneficiary
const encryptedAllocation = await EthCrypto.encryptWithPublicKey(
    beneficiaryPublicKey,
    JSON.stringify({ address, shareBps, salt })
);`,
    },
  },
  {
    id: "guardian-consensus",
    number: "03",
    title: "Guardian Consensus",
    whatItDoes:
      "An independent, multi-party network of guardian nodes monitors heartbeat timers and must reach a cryptographic quorum before an inheritance claim window can open.",
    whyItMatters:
      "Guarantees that no single compromised server, rogue oracle, or corrupt watcher can prematurely release your assets. Quorum requires coordinated attestations matching strict threshold criteria.",
    technicalDetail: {
      overview:
        "ProofOfLifeConsensus.sol enforces an M-of-N threshold signature scheme. Each guardian submits an ECDSA attestation of heartbeat expiration. When quorum (e.g., 2 of 3) is attained, the locker transitions to ClaimPending.",
      contracts: ["ProofOfLifeConsensus.sol", "GuardianRegistry.sol"],
      primitives: ["ECDSA signature recovery", "Quorum threshold tracking", "Deadline verification"],
      invariants: [
        "assertLapse() requires block.timestamp >= lastCheckIn + checkInInterval",
        "Attestation count must satisfy validAttestations >= quorumThreshold",
      ],
      codeSnippet: `function assertLapse(address vault, bytes[] calldata guardianSigs) external {
    require(block.timestamp >= vault.lastCheckIn() + vault.checkInInterval(), "Heartbeat valid");
    uint256 validCount = _verifyGuardianSignatures(vault, guardianSigs);
    require(validCount >= quorumThreshold, "Quorum not reached");
    vaultState[vault] = ConsensusState.ClaimPending;
}`,
    },
  },
  {
    id: "merkle-commitments",
    number: "04",
    title: "Merkle Commitments",
    whatItDoes:
      "The complete inheritance schedule is compressed into a single 32-byte cryptographic Merkle root stored on the blockchain, keeping individual distribution details off-chain.",
    whyItMatters:
      "Prevents on-chain disclosure of the beneficiary roster while mathematically ensuring that no allocations can be altered, reordered, or forged after commitment.",
    technicalDetail: {
      overview:
        "Each allocation leaf is computed as keccak256(abi.encodePacked(beneficiary, shareBps, salt)). Random 256-bit salts prevent dictionary attacks and rainbow table lookups.",
      contracts: ["lib/merkle.ts", "InheritanceVault.sol"],
      primitives: ["Keccak-256 cryptographic hash", "Cryptographic blinding salts", "Merkle proof verification"],
      invariants: [
        "Sum of leaf shareBps must equal exactly 10,000 basis points (100.00%)",
        "Single leaf proof verification via MerkleProof.verify() with O(log n) complexity",
      ],
      codeSnippet: `// Leaf Computation with Blinding Salt
bytes32 leaf = keccak256(abi.encodePacked(beneficiary, shareBps, salt));
require(MerkleProof.verify(merkleProof, allocationRoot, leaf), "Invalid Merkle proof");`,
    },
  },
  {
    id: "heartbeat-mechanism",
    number: "05",
    title: "Heartbeat Mechanism",
    whatItDoes:
      "Locker owners periodically confirm they are alive by sending a simple heartbeat signal, resetting the countdown timer for another period.",
    whyItMatters:
      "Provides reliable, autonomous estate succession without requiring third-party custody, court filings, or invasive continuous surveillance of your daily life.",
    technicalDetail: {
      overview:
        "The heartbeat timer is recorded on-chain as a timestamp. Owners can check in directly via on-chain transaction or submit an off-chain EIP-712 beacon relayed gaslessly.",
      contracts: ["InheritanceVault.sol"],
      primitives: ["Block timestamp comparison", "EIP-712 signed beacons", "Gasless relayer support"],
      invariants: [
        "checkIn() resets lastCheckIn = block.timestamp",
        "Heartbeat countdown is deterministic and publicly verifiable on-chain",
      ],
      codeSnippet: `function checkIn() external onlyOwner {
    require(consensus.getConsensusState(address(this)) == ConsensusState.Active, "Locker not active");
    lastCheckIn = block.timestamp;
    emit HeartbeatPulsed(msg.sender, block.timestamp);
}`,
    },
  },
  {
    id: "contest-window",
    number: "06",
    title: "Contest Window",
    whatItDoes:
      "When a heartbeat lapse is asserted, an emergency time delay (e.g. 72 hours) activates before any beneficiary claim can be executed.",
    whyItMatters:
      "Serves as a safety valve against false alarms, brief hospitalizations, temporary connectivity loss, or accidental guardian triggers. Nothing is distributed until this window expires.",
    technicalDetail: {
      overview:
        "During the Contest Window, the locker enters ConsensusState.ClaimPending. The smart contract strictly forbids token withdrawals or claim executions until block.timestamp >= lapseTime + contestDuration.",
      contracts: ["ProofOfLifeConsensus.sol", "InheritanceVault.sol"],
      primitives: ["Time-locked state machine", "ConsensusState enumeration", "Reversion guards"],
      invariants: [
        "Claim execution reverts if block.timestamp < lapseAssertedAt + contestWindow",
        "Owner reset action immediately cancels the pending claim and voids the window",
      ],
      codeSnippet: `function claim(uint256 shareBps, bytes32 salt, bytes32[] calldata proof) external {
    ConsensusState state = consensus.getConsensusState(address(this));
    require(state == ConsensusState.ClaimFinalized, "Contest window still active");
    // Execution continues only when contest window has fully elapsed
}`,
    },
  },
  {
    id: "eip-712-emergency-reset",
    number: "07",
    title: "EIP-712 Emergency Reset",
    whatItDoes:
      "If a claim is mistakenly initiated, the locker owner can immediately void the claim and restore the locker to ACTIVE status using a gasless structured signature.",
    whyItMatters:
      "Allows the owner to reset the protocol instantly even if their wallet has zero ETH for gas fees or if the network is experiencing severe gas price spikes.",
    technicalDetail: {
      overview:
        "The owner signs an EIP-712 typed structured message (ResetProtocol) specifying locker address, nonce, and deadline. The signature can be relayed by any node or guardian service.",
      contracts: ["ProofOfLifeConsensus.sol", "lib/stealth.ts"],
      primitives: ["EIP-712 structured hashing", "EIP-1271 contract signatures", "Gasless relayer architecture"],
      invariants: [
        "Reset requires signature recovery equal to the registered locker owner",
        "Instantly sets consensus state back to Active and cancels all pending attestations",
      ],
      codeSnippet: `bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
    RESET_TYPEHASH,
    vault,
    nonces[vault]++,
    deadline
)));
address signer = ECDSA.recover(digest, signature);
require(signer == vault.owner(), "Invalid reset signature");
vaultState[vault] = ConsensusState.Active;`,
    },
  },
  {
    id: "beneficiary-privacy",
    number: "08",
    title: "Beneficiary Privacy",
    whatItDoes:
      "Each beneficiary can only view and decrypt their own assigned allocation. Co-heirs and siblings cannot discover other beneficiaries' shares.",
    whyItMatters:
      "Protects family privacy and prevents interpersonal disputes, coercion, or premature expectations before protocol settlement.",
    technicalDetail: {
      overview:
        "Every allocation record is encrypted under its recipient's individual public key. Even with full access to the contract state and encrypted data, only the holder of the specific private key can decrypt a given allocation.",
      contracts: ["lib/encryption.ts", "components/ClaimPortal.tsx"],
      primitives: ["Dual ECIES payload isolation", "Individual blinding salt blinding", "Zero shared secrets"],
      invariants: [
        "Decrypting allocation A with private key B mathematically yields an authentication error",
        "Sibling addresses and shares are masked in client discovery queries",
      ],
      codeSnippet: `// Verified: Bob's private key cannot decrypt Alice's ciphertext
try {
    await decryptAllocation(bobPrivateKey, aliceEncryptedCiphertext);
    throw new Error("Violation: Cross-decryption succeeded");
} catch {
    // ECIES MAC integrity check correctly rejects unauthorized keys
}`,
    },
  },
  {
    id: "on-chain-settlement",
    number: "09",
    title: "On-Chain Settlement",
    whatItDoes:
      "When all protocol criteria are satisfied and the Contest Window has elapsed, beneficiaries verify their inclusion proof to settle their allocation directly to their wallets.",
    whyItMatters:
      "Removes human executors, probate delays, and legal intermediaries. Execution is handled trustlessly and automatically by decentralized code.",
    technicalDetail: {
      overview:
        "Beneficiaries submit their share percentage, blinding salt, and Merkle path. The contract computes the leaf, validates the Merkle root, verifies hasClaimed[beneficiary] == false, and executes either immediate lump-sum settlement or initializes a continuous linear token stream.",
      contracts: ["InheritanceVault.sol"],
      primitives: ["Merkle leaf membership verification", "Double-claim guard", "Linear streaming yield accrual"],
      invariants: [
        "Double-claims revert with AlreadyClaimed()",
        "Tokens transfer directly to msg.sender; no intermediary withdrawal pool",
      ],
      codeSnippet: `require(!hasClaimed[msg.sender], "Already claimed");
bytes32 leaf = keccak256(abi.encodePacked(msg.sender, shareBps, salt));
require(MerkleProof.verify(proof, allocationRoot, leaf), "Invalid proof");
hasClaimed[msg.sender] = true;

uint256 amount = (address(this).balance * shareBps) / 10000;
(bool s, ) = payable(msg.sender).call{value: amount}("");
require(s, "Transfer failed");`,
    },
  },
];

export default function SecurityProtocolPanel() {
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredSections = SECURITY_SECTIONS.filter((section) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(q) ||
      section.whatItDoes.toLowerCase().includes(q) ||
      section.whyItMatters.toLowerCase().includes(q) ||
      section.technicalDetail.overview.toLowerCase().includes(q)
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
            <span>9 ARCHITECTURAL LAYERS</span>
          </div>
        </div>

        <p className="text-sm sm:text-base text-[#5F6368] max-w-3xl leading-relaxed">
          Understand what Cadence protects, what it does not expose, and how the protocol moves inheritance from signal to settlement.
        </p>

        {/* Search / Filter Filter */}
        <div className="pt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search security architecture (e.g. Merkle, EIP-712, ECIES, Quorum)..."
            className="w-full sm:max-w-md px-4 py-2.5 rounded-2xl bg-white border border-[#E8EAED] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECURITY POSTURE DISCLOSURE NOTICE                                     */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8EAED] shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#5F6368]">
          <span>🛡</span>
          <span>Security Philosophy & Verification Posture</span>
        </div>
        <p className="text-xs sm:text-sm text-[#5F6368] leading-relaxed">
          Cadence is engineered using defense-in-depth cryptographic primitives and non-custodial smart contracts. We do not claim any software system is &ldquo;unhackable&rdquo; or immune to protocol risks. All smart contracts are open-source and bytecode-verified on Ethereum Sepolia for independent review and validation.
        </p>
        <div className="pt-1 flex items-center gap-4 text-xs font-mono text-[#137333]">
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESSES.vault}#code`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 font-semibold"
          >
            <span>View Verified Contracts on Etherscan</span>
            <span>↗</span>
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
        {filteredSections.map((section) => {
          const isOpen = Boolean(openAccordions[section.id]);

          return (
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

              {/* TECHNICAL DETAIL (COLLAPSIBLE ACCORDION, COLLAPSED BY DEFAULT) */}
              <div className="border-t border-[#E8EAED] pt-4">
                <button
                  type="button"
                  onClick={() => toggleAccordion(section.id)}
                  className="w-full flex items-center justify-between text-xs font-mono font-semibold text-[#5F6368] hover:text-[#111111] py-1 transition-colors cursor-pointer select-none group"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base group-hover:translate-x-0.5 transition-transform">
                      {isOpen ? "▾" : "▸"}
                    </span>
                    <span className="uppercase tracking-wider">TECHNICAL DETAIL</span>
                  </span>
                  <span className="text-[11px] text-[#8A8F98] font-normal">
                    {isOpen ? "Collapse specifications" : "Expand cryptographic mechanics"}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-4 p-5 rounded-2xl bg-[#F8FAF9] border border-[#E8EAED] space-y-4 font-mono text-xs animate-in fade-in duration-150">
                    <div className="text-xs text-[#111111] leading-relaxed font-sans">
                      {section.technicalDetail.overview}
                    </div>

                    {/* Cryptographic Primitives & Contracts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      {section.technicalDetail.contracts && (
                        <div className="p-3 rounded-xl bg-white border border-[#E8EAED] space-y-1">
                          <span className="text-[#8A8F98] uppercase text-[10px] block">
                            Contracts / Modules
                          </span>
                          <div className="text-[#111111] font-semibold">
                            {section.technicalDetail.contracts.join(", ")}
                          </div>
                        </div>
                      )}

                      {section.technicalDetail.primitives && (
                        <div className="p-3 rounded-xl bg-white border border-[#E8EAED] space-y-1">
                          <span className="text-[#8A8F98] uppercase text-[10px] block">
                            Cryptographic Primitives
                          </span>
                          <div className="text-[#111111] font-semibold">
                            {section.technicalDetail.primitives.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Security Invariants */}
                    {section.technicalDetail.invariants && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-[#8A8F98] uppercase tracking-wider block">
                          Security Invariants Enforced
                        </span>
                        <ul className="space-y-1 text-[11px] text-[#5F6368]">
                          {section.technicalDetail.invariants.map((inv, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#137333] font-bold">✓</span>
                              <span>{inv}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Verifiable Code Reference */}
                    {section.technicalDetail.codeSnippet && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-[#8A8F98] uppercase tracking-wider block">
                          Implementation Reference
                        </span>
                        <pre className="p-3 rounded-xl bg-[#111111] text-[#E8EAED] text-[11px] overflow-x-auto leading-relaxed">
                          <code>{section.technicalDetail.codeSnippet}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
