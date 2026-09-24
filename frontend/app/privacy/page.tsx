"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import CadenceLogo from "../../components/ui/CadenceLogo";
import { useWalletModal } from "../../components/ui/ConnectWalletModal";
import { useCookieConsent } from "../../context/CookieContext";

export default function PrivacyPage() {
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

      {/* Main Privacy Container */}
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
              Privacy Policy
            </h1>

            <div className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F6368]">
              How Cadence guarantees cryptographic confidentiality, zero-plaintext storage, and zero-knowledge heir protection.
              Last updated: September 2026.
            </div>
          </div>

          {/* Content Column */}
          <div className="flex max-w-3xl flex-col gap-12 text-[#111111]">
            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">1. Zero Plaintext On-Chain Storage Guarantee</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  Traditional dead man&#39;s switches store beneficiary Ethereum addresses and percentage allocations in plaintext
                  contract storage slots, exposing family net worth to anyone reading public blockchain state.
                </p>
                <p>
                  <strong>Cadence Cryptographic Invariant:</strong> Beneficiary identities and split ratios are never written to
                  blockchain storage in plaintext. The Cadence frontend encrypts all heir allocation manifests client-side using
                  asymmetric <strong>ECIES-secp256k1</strong>. Only the double-hashed cryptographic Merkle root (
                  <code>allocationRoot</code>) is committed on-chain. Third parties inspect zero details regarding your heirs or
                  asset distribution.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">2. No IP Logging, Analytics, or Tracking</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  Cadence respects Web3 privacy fundamentals:
                </p>
                <dl className="divide-y divide-[#E8EAED] rounded-xl border border-[#E8EAED] bg-white">
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">Zero IP Tracking</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Our web servers and sentinel APIs do not record, store, or profile incoming user IP addresses or browser
                      fingerprints.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">No Ad Trackers</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      We do not embed Google Analytics, Meta Pixel, advertising scripts, or data broker beacons.
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-[#111111]">No Doxxing</dt>
                    <dd className="text-sm leading-relaxed text-[#5F6368]">
                      Wallet addresses are used strictly to query on-chain balance commitments and never associated with real-world
                      identities.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">3. Sentinel Webhooks &amp; Notification Privacy</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  If you bind guardian email addresses for automated proof-of-life alerts:
                </p>
                <ul className="flex list-disc flex-col gap-2.5 pl-5 text-[15px]">
                  <li>
                    <strong>EIP-712 Cryptographic Binding:</strong> Registrations via <code>POST /api/bind</code> require an off-chain
                    EIP-712 structured signature proving wallet ownership.
                  </li>
                  <li>
                    <strong>Public Masking:</strong> The public sentinel monitoring feed (<code>GET /api/monitored-vaults</code>)
                    cryptographically redacts and masks all guardian email handles (e.g. <code>g***n@example.com</code>).
                  </li>
                  <li>
                    <strong>Zero Spam Policy:</strong> Email channels are exclusively triggered when a vault heartbeat enters the final
                    countdown or the 14-day grace period is initiated.
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">4. Public Blockchain Immutability</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  You acknowledge that transactions submitted to Arbitrum Sepolia, Robinhood Chain, or Ethereum Sepolia (such as
                  calling <code>checkIn()</code>, depositing assets, or claiming streams) are publicly and permanently recorded on
                  decentralized blockchains. Cadence contributors have no technical ability to delete, edit, or reverse public
                  on-chain transaction records.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">5. Client-Side Storage &amp; Cookies</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5F6368] [&_strong]:font-medium [&_strong]:text-[#111111]">
                <p>
                  We store minimal local state strictly in your browser&#39;s <code>localStorage</code> (e.g.{" "}
                  <code>cadence_cookie_consent_v1</code>) to remember your privacy choices, network preferences, and cached RPC
                  responses. You can clear this data at any time via your browser settings or adjust preferences via{" "}
                  <button
                    type="button"
                    onClick={openPreferencesModal}
                    className="text-[#111111] underline underline-offset-4 cursor-pointer font-medium"
                  >
                    Cookie Settings
                  </button>
                  .
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
                <Link href="/privacy" className="text-[#111111] font-medium underline underline-offset-4">
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
