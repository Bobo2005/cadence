"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import CadenceLogo from "../../components/ui/CadenceLogo";
import { useWalletModal } from "../../components/ui/ConnectWalletModal";
import { useCookieConsent } from "../../context/CookieContext";

export default function DisclosurePage() {
  const { isConnected, address } = useAccount();
  const { openWalletModal } = useWalletModal();
  const { openPreferencesModal } = useCookieConsent();

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
              <Link href="/docs" className="inline-block py-2 hover:text-[#111111] transition-colors">
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

      {/* Main Disclosure Container */}
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
              <span className="font-medium tracking-wide uppercase text-xs">Security &amp; Verification</span>
              <span className="h-px flex-1 bg-[#E8EAED]" />
            </div>

            <h1 className="mt-8 max-w-3xl text-4xl leading-[1.1] tracking-[-0.02em] md:text-5xl font-normal text-[#111111]">
              Responsible Disclosure &amp; Security
            </h1>

            <div className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F6368]">
              Security architecture, smart contract audit posture, and guidelines for ethical vulnerability submissions to
              safeguard generational user wealth. Last updated: September 2026.
            </div>
          </div>

          {/* Content Column */}
          <div className="flex max-w-3xl flex-col gap-12 text-[#111111]">
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">1. Security Architecture &amp; Invariants</h2>
              <div className="mt-3 flex flex-col gap-4 text-[15px] leading-relaxed text-[#5F6368]">
                <p>
                  Cadence is architected to eliminate the primary vulnerability vectors of traditional estate planning and on-chain
                  dead man&#39;s switches:
                </p>
                <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Zero Plaintext Storage</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      All beneficiary identities and split percentages are encrypted client-side using ECIES-secp256k1 before committing
                      the double-hashed Merkle root (<code>allocationRoot</code>).
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Quorum Attestation</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      A 2-of-3 threshold is enforced in <code>GuardianRegistry.sol</code>. No single guardian or rogue signer can
                      initiate vault settlement.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Gasless EIP-712 Dismissal</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Living owners can abort false-alarm triggers during the 14-day grace period with zero gas cost, eliminating
                      forensic on-chain wallet linkage.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Stylus WASM Verification</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Merkle allocation verification in Rust compiled to WASM delivers sub-cent gas execution with bit-for-bit
                      equivalence to OpenZeppelin Solidity.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">2. Smart Contract Scope</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  The following production smart contracts are in-scope for responsible disclosure submissions:
                </p>
                <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px]">
                  <li>
                    <code>VaultFactory.sol</code> &amp; <code>CadenceVault.sol</code> (Deterministic vault deployment &amp; deposit custody)
                  </li>
                  <li>
                    <code>GuardianRegistry.sol</code> &amp; <code>ConsensusEngine.sol</code> (Proof-of-life attestations &amp; quorum logic)
                  </li>
                  <li>
                    <code>CadenceStream.sol</code> &amp; Aave v3 yield integration (Autonomous per-second stream distribution)
                  </li>
                  <li>
                    <code>stylus_merkle</code> (Arbitrum Stylus WASM Merkle verification module)
                  </li>
                  <li>
                    <code>notifications/</code> (Sentinel proof-of-life daemon &amp; EIP-712 notification webhook relays)
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">3. Anti-Drainer Protections</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  To protect grieving families from phishing drainers, Cadence Streams provide on-chain circuit breakers:
                </p>
                <p>
                  Designated guardians or pre-registered cold backup addresses can call <code>pauseStream()</code> or{" "}
                  <code>redirectStream()</code>. If an heir&#39;s wallet is compromised after settlement begins, unvested funds are
                  immediately frozen or routed to cold storage without protocol loss.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">4. Reporting Guidelines &amp; Response SLA</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  If you discover a potential vulnerability in Cadence contracts or frontend infrastructure:
                </p>
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px]">
                  <li>
                    <strong>Email Securely:</strong> Submit vulnerability details and reproduction steps to{" "}
                    <code>security@cadenceprotocol.io</code>.
                  </li>
                  <li>
                    <strong>SLA Commitment:</strong> The core engineering team will acknowledge your report within{" "}
                    <strong>24 hours</strong> and provide triage status within 72 hours.
                  </li>
                  <li>
                    <strong>Coordinated Disclosure:</strong> Do not publicly disclose or exploit vulnerabilities until a patch is
                    verified and deployed across active testnets.
                  </li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">5. Safe Harbor Guarantee</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  Cadence considers security researchers who submit vulnerability reports in compliance with these guidelines to be
                  acting in good faith. Cadence commits not to pursue legal action, law enforcement referrals, or DMCA copyright
                  claims against white-hat researchers who adhere to responsible disclosure.
                </p>
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
                <Link href="/docs" className="text-[#5F6368] hover:text-[#111111] transition-colors">
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
                <Link href="/disclosure" className="text-[#111111] font-medium underline underline-offset-4">
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
