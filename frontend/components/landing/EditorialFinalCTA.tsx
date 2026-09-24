"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useWalletModal } from "../ui/ConnectWalletModal";
import { useCookieConsent } from "../../context/CookieContext";

export default function EditorialFinalCTA() {
  const { isConnected } = useAccount();
  const { openWalletModal } = useWalletModal();
  const { openPreferencesModal } = useCookieConsent();

  return (
    <section className="py-24 bg-white border-t border-[#E8EAED]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Main CTA Panel — inverted dark, no gradients */}
        <div className="relative rounded-3xl bg-[#111111] border border-[#222222] p-8 md:p-16 overflow-hidden text-center space-y-6">
          <div className="relative max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Keep the signal alive.
            </h2>

            <p className="text-base text-[#8A8F98] leading-relaxed max-w-lg mx-auto">
              Cadence secures regulated, yield-bearing family wealth for the next generation of retail investors — not speculative crypto for DeFi natives.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              {isConnected ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#111111] text-sm font-semibold hover:bg-[#F7F8FA] transition-colors shadow-sm"
                >
                  Enter Protocol Dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openWalletModal}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#111111] text-sm font-semibold hover:bg-[#F7F8FA] transition-colors shadow-sm cursor-pointer"
                >
                  CONNECT WALLET TO BEGIN
                </button>
              )}

              <Link
                href="/docs"
                className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-transparent border border-[#333333] text-[#8A8F98] text-sm font-medium hover:border-[#555555] hover:text-white transition-colors"
              >
                VIEW ARCHITECTURE SPEC
              </Link>
            </div>
          </div>
        </div>

        {/* Public Editorial Footer */}
        <footer className="mt-16 pt-8 border-t border-[#E8EAED] flex flex-col gap-4 text-xs text-[#5F6368]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#111111]">Cadence Protocol</span>
              <span>·</span>
              <span>Arbitrum Sepolia &amp; Robinhood Testnets (Testnet-Only)</span>
              <span>·</span>
              <span>252 / 252 Tests &amp; Slither 0.11.6 Verified</span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://sepolia.arbiscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#111111] transition-colors"
              >
                Arbiscan
              </a>
              <a
                href="https://explorer.testnet.chain.robinhood.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#111111] transition-colors"
              >
                Robinhood Explorer
              </a>
              <a
                href="https://sepolia.etherscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#111111] transition-colors"
              >
                Etherscan
              </a>
              <a
                href="https://github.com/Bobo2005/cadence"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#111111] transition-colors"
              >
                GitHub
              </a>
              <Link href="/docs" className="hover:text-[#111111] transition-colors">
                Docs
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8EAED]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8A8F98]">
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-[#111111] transition-colors">
                Terms of Service
              </Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-[#111111] transition-colors">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link href="/disclosure" className="hover:text-[#111111] transition-colors">
                Responsible Disclosure
              </Link>
              <span>·</span>
              <button
                type="button"
                onClick={openPreferencesModal}
                className="hover:text-[#111111] transition-colors cursor-pointer"
              >
                Cookie Settings
              </button>
            </div>
            <div>© {new Date().getFullYear()} Cadence Protocol. Self-custodial and zero-leak.</div>
          </div>
        </footer>
      </div>
    </section>
  );
}
