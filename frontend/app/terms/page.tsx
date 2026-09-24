"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import CadenceLogo from "../../components/ui/CadenceLogo";
import { useWalletModal } from "../../components/ui/ConnectWalletModal";
import { useCookieConsent } from "../../context/CookieContext";

export default function TermsPage() {
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

      {/* Main Legal Container */}
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
              <span className="font-medium tracking-wide uppercase text-xs">Legal &amp; Compliance</span>
              <span className="h-px flex-1 bg-[#E8EAED]" />
            </div>

            <h1 className="mt-8 max-w-3xl text-4xl leading-[1.1] tracking-[-0.02em] md:text-5xl font-normal text-[#111111]">
              Terms of Service
            </h1>

            <div className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F6368]">
              Governing terms and operational conditions for interacting with Cadence self-custodial smart contracts,
              decentralized consensus engines, and protocol interfaces. Last updated: September 2026.
            </div>
          </div>

          {/* Content Column */}
          <div className="flex max-w-3xl flex-col gap-12 text-[#111111]">
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">1. Nature of the Protocol</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  Cadence is an autonomous, non-custodial decentralized software protocol deployed on Arbitrum Sepolia,
                  Robinhood Chain Testnet, and Ethereum Sepolia. Cadence does not operate as an exchange, custodian, broker-dealer,
                  or trust company.
                </p>
                <p>
                  <strong>Self-Custodial Guarantee:</strong> Users interact directly with immutable smart contracts. At no point
                  does Cadence, its core contributors, or affiliates take possession, custody, or control of your cryptographic
                  private keys, account credentials, or deposited assets.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">2. Protocol Mechanics &amp; User Responsibilities</h2>
              <div className="mt-3 flex flex-col gap-4 text-[15px] leading-relaxed text-[#5F6368]">
                <p>
                  Users who deploy a smart vault through <code>VaultFactory.sol</code> are solely responsible for configuring and
                  maintaining the integrity of their estate parameters:
                </p>
                <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Proof-of-Life Check-Ins</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Vault owners must invoke <code>checkIn()</code> within their chosen heartbeat interval. Failure to check in
                      enables guardian quorum verification.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Guardian Selection</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Users are solely responsible for vetting and designating trusted guardians. Cadence is not liable for guardian
                      negligence, collusion, or loss of guardian access.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Gasless Dismissal Key</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      During the 14-day grace period, the owner must preserve wallet access to sign off-chain EIP-712 dismissal
                      messages if guardians trigger a false alarm.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">3. No Fiduciary, Legal, or Financial Advice</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  <strong>No Attorney-Client or Fiduciary Relationship:</strong> Cadence is algorithmic code providing cryptographic
                  automation tools. Cadence does not provide legal, tax, estate planning, or fiduciary services. Interacting with
                  Cadence contracts does not replace a statutory last will and testament, living trust, or probate compliance in
                  your jurisdiction.
                </p>
                <p>
                  Users must independently seek licensed legal and tax advice to ensure compliance with local inheritance tax laws,
                  probate statutes, and transfer regulations.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">4. Paxos USDG &amp; Third-Party DeFi Integrations</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  Cadence supports Paxos USDG tokens and native ETH. Paxos USDG is an independent stablecoin issued and managed
                  by Paxos. Cadence does not issue, back, guarantee, or peg USDG tokens.
                </p>
                <p>
                  <strong>Yield Generation:</strong> Unvested Cadence Streams lend assets directly to Aave v3 on Arbitrum Sepolia
                  to generate borrower-paid interest. Cadence has no control over Aave liquidity pool utilization, borrow rates, or
                  third-party smart contract risks. Assets are strictly lent, never staked.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">5. Assumption of Risk &amp; Disclaimers</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2.5 [&_ul]:pl-5 [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-[#111111]">
                <ul>
                  <li>
                    <strong>Smart Contract &amp; Blockchain Risk:</strong> You acknowledge that software contains risks of bugs,
                    blockchain forks, network reorgs, validator delays, or testnet deprecation. All software is provided &quot;as is&quot;
                    without warranty.
                  </li>
                  <li>
                    <strong>Irreversibility of Distributed Streams:</strong> Once the grace period elapses and Merkle proofs are
                    executed, released funds cannot be refunded or revoked by Cadence contributors.
                  </li>
                  <li>
                    <strong>Regulatory Uncertainty:</strong> Digital asset laws and estate regulations are evolving rapidly across
                    international borders. You bear sole responsibility for your regulatory compliance.
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
                <Link href="/terms" className="text-[#111111] font-medium underline underline-offset-4">
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
