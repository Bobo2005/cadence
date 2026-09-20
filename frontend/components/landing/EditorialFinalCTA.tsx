"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useWalletModal } from "../ui/ConnectWalletModal";

export default function EditorialFinalCTA() {
  const { isConnected } = useAccount();
  const { openWalletModal } = useWalletModal();

  return (
    <section className="py-20 bg-white border-t border-[#E8EAED]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Main CTA Panel */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#F7F8FA] via-white to-[#D8DEFF]/25 border border-[#E8EAED] p-8 md:p-16 shadow-md overflow-hidden text-center space-y-6">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 bg-[#CFFBF7]/40 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 w-96 h-96 bg-[#D8DEFF]/30 rounded-full blur-3xl" />

          <div className="relative max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111111]">
              Keep the signal alive.
            </h2>

            <p className="text-base text-[#5F6368] leading-relaxed max-w-lg mx-auto">
              Deploy your self-custodial inheritance locker on Ethereum Sepolia in under 3 minutes.
              No third-party custodian, zero plaintext stored on-chain, and guaranteed contest windows.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              {isConnected ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-black transition-all shadow-sm"
                >
                  Enter Protocol Dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openWalletModal}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-black transition-all shadow-sm cursor-pointer"
                >
                  CONNECT WALLET TO BEGIN
                </button>
              )}

              <Link
                href="/docs"
                className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-white border border-[#D9DCE1] text-[#111111] text-sm font-medium hover:border-[#AEB3BB] hover:bg-[#F7F8FA] transition-all"
              >
                VIEW ARCHITECTURE SPEC
              </Link>
            </div>
          </div>
        </div>

        {/* Public Editorial Footer */}
        <footer className="mt-16 pt-8 border-t border-[#E8EAED] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5F6368]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#111111]">Cadence Protocol</span>
            <span>·</span>
            <span>Ethereum Sepolia Testnet</span>
            <span>·</span>
            <span>Slither 0 High / Critical</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#111111] transition-colors"
            >
              Explorer
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
        </footer>
      </div>
    </section>
  );
}
