"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import CadenceLogo from "../../components/ui/CadenceLogo";
import { useWalletModal } from "../../components/ui/ConnectWalletModal";
import { useCookieConsent } from "../../context/CookieContext";

export default function DocsPage() {
  const { isConnected, address } = useAccount();
  const { openWalletModal } = useWalletModal();
  const { openPreferencesModal } = useCookieConsent();
  const [selectedNetwork, setSelectedNetwork] = useState<"arbitrum" | "robinhood" | "sepolia">("arbitrum");

  return (
    <div className="min-h-dvh bg-white text-[#111111] flex flex-col selection:bg-[#E8EAED]">
      {/* Sticky Editorial Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E8EAED] bg-white/95 backdrop-blur-md">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5 text-xl tracking-[-0.02em] text-[#111111]">
            <div className="flex items-center justify-center p-1 rounded-lg bg-[#F7F8FA] border border-[#E8EAED]">
              <CadenceLogo size={20} showWordmark={false} />
            </div>
            <span className="font-semibold tracking-tight text-[#111111]">Cadence</span>
          </Link>

          <ul className="hidden items-center gap-7 text-sm font-medium text-[#5F6368] md:flex">
            <li>
              <Link href="/dashboard" className="inline-block py-2 hover:text-[#111111] transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/vault" className="inline-block py-2 hover:text-[#111111] transition-colors">
                Vaults
              </Link>
            </li>
            <li>
              <Link
                href="/docs"
                aria-current="page"
                className="inline-block py-2 text-[#111111] underline decoration-[#111111] decoration-2 underline-offset-8"
              >
                Docs
              </Link>
            </li>
            <li>
              <Link href="/security" className="inline-block py-2 hover:text-[#111111] transition-colors">
                Security
              </Link>
            </li>
          </ul>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#111111] px-5 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-black"
              >
                <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
                <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Dashboard"}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={openWalletModal}
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#111111] px-5 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-black cursor-pointer"
              >
                <span>Connect wallet</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main Documentation Container */}
      <main id="main" tabIndex={-1} className="flex-1">
        <section className="mx-auto max-w-[1200px] px-4 pt-8 pb-24 md:px-6">
          {/* Back Pill Button */}
          <div className="mb-10">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#F4F3F0] px-4 text-sm font-medium text-[#111111] transition-colors duration-150 hover:bg-[#E8EAED]"
            >
              <span aria-hidden="true">←</span> Back to Dashboard
            </Link>
          </div>

          {/* Eyebrow & Title Banner */}
          <div className="mb-10 md:mb-14">
            <div className="flex items-center gap-4 text-sm text-[#5F6368]">
              <span className="h-px flex-1 bg-[#E8EAED]" />
              <span className="font-medium tracking-wide uppercase text-xs">Documentation</span>
              <span className="h-px flex-1 bg-[#E8EAED]" />
            </div>

            <h1 className="mt-8 max-w-3xl text-4xl leading-[1.1] tracking-[-0.02em] md:text-5xl font-normal text-[#111111]">
              Using Cadence
            </h1>

            <div className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F6368]">
              Cadence is a self-custodial digital inheritance and wealth preservation protocol. It secures Paxos USDG and crypto
              wealth across generations through multi-signal proof-of-life consensus, zero-knowledge Merkle allocations, and
              automated yield-bearing streams.
            </div>
          </div>

          {/* Editorial Content Stream */}
          <div className="flex max-w-3xl flex-col gap-12 text-[#111111]">
            {/* Section 1: Before you start */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">Before you start</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_a]:text-[#111111] [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-medium [&_strong]:text-[#111111] [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:pl-1">
                <ul>
                  <li>
                    <strong>EVM-Compatible Wallet:</strong> MetaMask, Rabby, Coinbase Wallet, or any wallet supporting Arbitrum
                    Sepolia (Chain ID <code>421614</code>) or Robinhood Chain Testnet (Chain ID <code>46630</code>).
                  </li>
                  <li>
                    <strong>Testnet Gas & Assets:</strong> Native testnet ETH for contract interaction gas, and Paxos USDG testnet
                    tokens to deposit into your vault.
                  </li>
                  <li>
                    <strong>Designated Guardians:</strong> Prepare 2 or 3 trusted Ethereum addresses or email contacts to participate
                    in the decentralized proof-of-life consensus quorum.
                  </li>
                  <li>
                    <strong>Self-Custodial Guarantee:</strong> Tokens remain exclusively in your own smart vault until the consensus
                    quorum and grace period countdown have both irreversibly elapsed. Living owners retain 100% control at all times.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2: Core concepts & parameters */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">Core concepts &amp; parameters</h2>
              <div className="mt-3 flex flex-col gap-4 text-[15px] leading-relaxed text-[#5F6368]">
                <p>The core protocol primitives governing automated proof-of-life, privacy protection, and estate streaming:</p>
                <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Proof-of-Life Heartbeat</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      The periodic on-chain check-in interval (e.g. 90, 180, or 365 days). Calling <code>checkIn()</code> resets
                      the countdown timestamp and confirms owner activity.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Guardian Quorum</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      A 2-of-3 threshold consensus managed by <code>GuardianRegistry.sol</code>. Guardians only attest to
                      incapacitation after a heartbeat lapse; individual guardians cannot execute alone.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">14-Day Grace Period</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      A mandatory buffer initiated after quorum. The owner receives automated sentinel alerts and can dismiss
                      false-alarm claims gaslessly with an off-chain EIP-712 typed signature.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Blinded Merkle Root</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Heir public keys and percentage splits are double-hashed client-side into <code>allocationRoot</code>. Zero
                      plaintext heir identities or balances ever touch on-chain storage.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Cadence Streams</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Autonomous streaming trusts releasing an immediate 10% emergency buffer, streaming the remaining 90%
                      second-by-second to prevent phishing drainers and estate dumping.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Aave v3 Yield Engine</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Unvested streaming balances deposit directly into Aave v3 on Arbitrum Sepolia, generating borrower-paid
                      interest with zero cross-chain bridge exposure.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Anti-Drainer Defense</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Appointed guardians or verified backup cold wallets can call <code>pauseStream()</code> and{" "}
                      <code>redirectStream()</code> if an heir wallet is compromised.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Section 3: Setting up a vault (step-by-step) */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">Setting up a vault</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_a]:text-[#111111] [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-medium [&_strong]:text-[#111111] [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2.5 [&_ul]:pl-5 [&_li]:pl-1">
                <ul>
                  <li>
                    <strong>Deploy Your Vault:</strong> Open the Cadence app, connect your wallet, and deploy your custom non-custodial
                    vault instance via <code>VaultFactory.sol</code>. Configure your desired heartbeat cadence (e.g., 180 days).
                  </li>
                  <li>
                    <strong>Client-Side Heir Encryption:</strong> Add your beneficiaries and percentage splits. The Cadence interface
                    asymmetrically encrypts the manifest using ECIES-secp256k1 and calculates the cryptographic Merkle root.
                  </li>
                  <li>
                    <strong>Register Guardian Quorum:</strong> Nominate 3 trusted guardians. Link email addresses or webhooks so the
                    sentinel service can notify guardians when a heartbeat expires.
                  </li>
                  <li>
                    <strong>Deposit Assets &amp; Activate Stream Terms:</strong> Transfer Paxos USDG or ETH into your vault and define the
                    stream vesting parameters (immediate liquidity unlock + linear vesting duration).
                  </li>
                  <li>
                    <strong>Sign Once to Commit:</strong> Authorize the initial setup transaction. Your assets stay in your control,
                    and you can adjust terms, deposit more capital, or check in at any time.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4: Settlement & claiming */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">Settlement &amp; claiming</h2>
              <div className="mt-3 flex flex-col gap-4 text-[15px] leading-relaxed text-[#5F6368]">
                <p>
                  Cadence replaces fragile on-chain dead man&#39;s switches with a two-phase fail-safe liquidation model designed to
                  prevent accidental triggers during emergencies:
                </p>
                <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">1. Attestation &amp; Grace</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      If a check-in lapses, guardians submit attestations. When 2 of 3 confirm, a 14-day grace window begins. The owner
                      is alerted via multiple channels and can abort the release with zero gas.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">2. Merkle Proof Claim</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Once grace ends, beneficiaries access the Claim Portal, decrypt their allocation package, and submit their
                      cryptographic Merkle proof on-chain to unlock their allotment.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">3. Streaming Release</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      The 10% emergency buffer is released immediately. The remaining 90% streams second-by-second into an autonomous
                      smart contract, shielding heirs from drainers and market dumps.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">4. Guardian Circuit Breaker</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      If an heir&#39;s key is compromised, guardians can call <code>pauseStream()</code> or redirect unvested stream
                      outflows to a pre-registered backup cold storage address.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Section 5: Verified smart contracts */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-2xl font-medium tracking-[-0.01em]">Verified smart contracts</h2>
                {/* Network switcher buttons */}
                <div className="inline-flex rounded-full bg-[#F4F3F0] p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setSelectedNetwork("arbitrum")}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      selectedNetwork === "arbitrum" ? "bg-white text-[#111111] shadow-xs" : "text-[#5F6368] hover:text-[#111111]"
                    }`}
                  >
                    Arbitrum Sepolia
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNetwork("robinhood")}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      selectedNetwork === "robinhood" ? "bg-white text-[#111111] shadow-xs" : "text-[#5F6368] hover:text-[#111111]"
                    }`}
                  >
                    Robinhood Chain
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNetwork("sepolia")}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      selectedNetwork === "sepolia" ? "bg-white text-[#111111] shadow-xs" : "text-[#5F6368] hover:text-[#111111]"
                    }`}
                  >
                    Ethereum Sepolia
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368]">
                <p>
                  Cadence contracts are verified and deterministic across testnet deployments. Inspect the verified source code directly
                  on the respective block explorer:
                </p>

                {selectedNetwork === "arbitrum" && (
                  <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Primary USDG Vault</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.arbiscan.io/address/0x07f9e3f0c0bb2d45300711d4f425917fa493525d"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x07f9...525d
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Paxos USDG Token</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.arbiscan.io/address/0x75ef6c3f8cfa9410c6d45924d96aa5b107f166fb"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x75ef...66fb
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Consensus Engine</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.arbiscan.io/address/0xe340662aad9cce18ffba38449e585fd8d7c78ae1"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0xe340...8ae1
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Guardian Registry</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.arbiscan.io/address/0xe09c19696990fc99c92f8eba070c36ba51cdade7"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0xe09c...ade7
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Vault Factory</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.arbiscan.io/address/0xac0f91C7d7c3537896248C42fc880F6DFF838622"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0xac0f...8622
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Beneficiary Factory</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.arbiscan.io/address/0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0xebbC...EbAf
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Stylus WASM Verifier</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.arbiscan.io/address/0x583eC2de840034478a61EF572cea2904bFD8671E"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x583e...671E
                        </a>
                      </dd>
                    </div>
                  </dl>
                )}

                {selectedNetwork === "robinhood" && (
                  <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Primary USDG Vault</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://explorer.testnet.chain.robinhood.com/address/0x65d7646e9da74e4d537b3f11ebc32acf3a4fe38f"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x65d7...e38f
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Paxos USDG Token</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://explorer.testnet.chain.robinhood.com/address/0x499fc59f8847f4922850e426fbf9e82d2beaf5e3"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x499f...5e3
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Consensus Engine</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://explorer.testnet.chain.robinhood.com/address/0x30454c1dc8d230665b2b6693c11937cc8af7f18b"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x3045...f18b
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Guardian Registry</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://explorer.testnet.chain.robinhood.com/address/0x2d3c214c54a01c13a1e17f1d4112ea95bb3549ee"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x2d3c...49ee
                        </a>
                      </dd>
                    </div>
                  </dl>
                )}

                {selectedNetwork === "sepolia" && (
                  <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Primary ETH Vault</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.etherscan.io/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74#code"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x043d...9e74
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Consensus Engine</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.etherscan.io/address/0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1#code"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0x7819...6Bc1
                        </a>
                      </dd>
                    </div>
                    <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-[#111111]">Guardian Registry</dt>
                      <dd className="text-sm font-mono text-[#5F6368]">
                        <a
                          href="https://sepolia.etherscan.io/address/0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863#code"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#111111] underline underline-offset-4"
                        >
                          0xcFD0...4863
                        </a>
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </section>

            {/* Section 6: Public APIs & sentinel endpoints */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">Public APIs &amp; Sentinel endpoints</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368]">
                <p>
                  Read endpoints return JSON and require no API key. Sensitive actions require cryptographic EIP-712 signatures:
                </p>
                <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">GET /api/vaults</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Active vault configuration, heartbeat countdown, balance commitments, and active stream status for an owner.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">GET /api/monitored-vaults</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Sentinel monitoring feed of vaults nearing heartbeat expiration or currently in grace period. Guardian contact info
                      is cryptographically masked.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">POST /api/bind</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Binds a guardian Ethereum address to an email notification endpoint using an off-chain EIP-712 signature with
                      lockout protection.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">GET /api/proof?vault=</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Generates the verified cryptographic Merkle proof for an authenticated heir to claim on-chain without exposing
                      siblings.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">POST /api/dismiss</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Relays a gasless EIP-712 dismissal signature signed by the vault owner to immediately abort false-alarm grace
                      periods.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Section 7: Security, audits & verification */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">Security &amp; verification</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_a]:text-[#111111] [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-medium [&_strong]:text-[#111111] [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:pl-1">
                <ul>
                  <li>
                    <strong>Zero Plaintext On-Chain:</strong> Family net worth, heir identities, and percentage splits are never stored
                    in plaintext smart contract storage. Double-hashed Merkle trees and ECIES-secp256k1 client-side encryption ensure
                    zero forensic linkage.
                  </li>
                  <li>
                    <strong>Arbitrum Stylus WASM Verification:</strong> Merkle allocation validation implemented in Rust as a compiled
                    WASM contract (<code>stylus_merkle</code>), demonstrating sub-cent gas execution and bit-for-bit equivalence with
                    OpenZeppelin Solidity.
                  </li>
                  <li>
                    <strong>11-Point Security Suite:</strong> The backend and sentinel services are audited with an automated test
                    matrix covering rate limiting, EIP-712 replay resistance, brute-force lockout, timing-safe authorization, and CSP
                    compliance.
                  </li>
                  <li>
                    <strong>Open Source &amp; Verified:</strong> All contract source code is verified on Arbiscan, Robinhood Explorer,
                    and Etherscan. View the full specification on{" "}
                    <a href="https://github.com/Bobo2005/cadence" target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                    .
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="mt-24 border-t border-[#E8EAED] bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-10 px-4 py-12 md:grid-cols-[2fr_1fr_1fr_1fr] md:px-6">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-xl tracking-[-0.02em] text-[#111111]">
              <div className="flex items-center justify-center p-1 rounded-md bg-[#F7F8FA] border border-[#E8EAED]">
                <CadenceLogo size={18} showWordmark={false} />
              </div>
              <span className="font-semibold tracking-tight">Cadence</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-[#5F6368]">
              Preserve and stream family wealth across generations with zero-knowledge security and proof-of-life consensus.
            </p>
          </div>

          <nav aria-label="Product" className="text-sm">
            <p className="font-medium text-[#111111]">Product</p>
            <ul className="mt-2 flex flex-col gap-2">
              <li>
                <Link href="/dashboard" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/vault" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Create Vault
                </Link>
              </li>
              <li>
                <Link href="/claim" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Claim Portal
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-[#111111] font-medium underline underline-offset-4">
                  Docs
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Build" className="text-sm">
            <p className="font-medium text-[#111111]">Build</p>
            <ul className="mt-2 flex flex-col gap-2">
              <li>
                <a
                  href="https://github.com/Bobo2005/cadence"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#5F6368] hover:text-[#111111] transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/security" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Security Protocol
                </Link>
              </li>
              <li>
                <Link href="/network" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Network Status
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal" className="text-sm">
            <p className="font-medium text-[#111111]">Legal</p>
            <ul className="mt-2 flex flex-col gap-2">
              <li>
                <Link href="/terms" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclosure" className="text-[#5F6368] hover:text-[#111111] transition-colors">
                  Responsible Disclosure
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openPreferencesModal}
                  className="text-left text-xs text-[#5F6368] hover:text-[#111111] cursor-pointer transition-colors pt-1"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 border-t border-[#E8EAED] px-4 py-6 text-xs leading-relaxed text-[#5F6368] md:flex-row md:items-center md:justify-between md:gap-10 md:px-6">
          <p className="max-w-2xl">
            Cadence does not custody private keys or manage client investments. Assets remain in self-custodial smart vaults on
            Arbitrum and Robinhood Chain.
          </p>
          <p className="shrink-0 text-[#111111]">© {new Date().getFullYear()} Cadence Protocol.</p>
        </div>
      </footer>
    </div>
  );
}
