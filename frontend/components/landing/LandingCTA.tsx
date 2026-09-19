"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useWalletModal } from "../ui/ConnectWalletModal";

export default function LandingCTA() {
  const { isConnected, address } = useAccount();
  const { openWalletModal } = useWalletModal();

  return (
    <section className="relative border-t border-[#232838] bg-[#0A0E14] px-4 py-20 lg:px-8">
      {/* Decorative hairline grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #F5F7FA 1px, transparent 1px), linear-gradient(to bottom, #F5F7FA 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Main CTA Container */}
        <div className="border border-[#232838] bg-[#12161F] p-8 md:p-12">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="inline-flex items-center gap-2 border border-[#232838] bg-[#0A0E14] px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-[#2EE6A8]">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#2EE6A8]" />
                TELEMETRY PROTOCOL READY
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-[#F5F7FA] sm:text-3xl md:text-4xl font-mono uppercase">
                Keep the signal alive.
              </h2>

              <p className="max-w-xl text-sm leading-relaxed text-[#A6AFBC]">
                Deploy your self-custodial inheritance locker on Ethereum Sepolia in under 3 minutes.
                No third-party custodian, no plaintext stored on-chain, and guaranteed reversible
                contest periods.
              </p>

              {/* Security invariant badges */}
              <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono text-[#A6AFBC]">
                <span className="border border-[#232838] bg-[#0A0E14] px-2 py-0.5">
                  NON-CUSTODIAL ERC-4337
                </span>
                <span className="border border-[#232838] bg-[#0A0E14] px-2 py-0.5">
                  AES-GCM-256 CLIENT-SIDE
                </span>
                <span className="border border-[#232838] bg-[#0A0E14] px-2 py-0.5">
                  72H REVERSIBLE CONTEST
                </span>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 lg:col-span-4">
              {isConnected ? (
                <div className="space-y-3">
                  <div className="border border-[#2EE6A8]/30 bg-[#2EE6A8]/5 p-3 text-center">
                    <div className="text-[10px] font-mono text-[#A6AFBC] uppercase">CONNECTED AS</div>
                    <div className="text-xs font-mono text-[#2EE6A8] truncate mt-0.5">
                      {address}
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex h-12 w-full items-center justify-center border border-[#2EE6A8] bg-[#2EE6A8] px-6 text-xs font-mono font-bold tracking-wider text-[#0A0E14] transition-colors hover:bg-[#2EE6A8]/90 focus:outline-none focus:ring-1 focus:ring-[#2EE6A8]"
                  >
                    [ ENTER PROTOCOL DASHBOARD ]
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openWalletModal}
                  className="flex h-12 w-full items-center justify-center border border-[#2EE6A8] bg-[#2EE6A8] px-6 text-xs font-mono font-bold tracking-wider text-[#0A0E14] transition-colors hover:bg-[#2EE6A8]/90 focus:outline-none focus:ring-1 focus:ring-[#2EE6A8]"
                >
                  [ CONNECT WALLET TO BEGIN ]
                </button>
              )}

              <Link
                href="/docs"
                className="flex h-11 w-full items-center justify-center border border-[#232838] bg-[#0A0E14] px-6 text-xs font-mono text-[#A6AFBC] transition-colors hover:border-[#F5F7FA]/40 hover:text-[#F5F7FA] focus:outline-none"
              >
                [ VIEW ARCHITECTURE SPEC ]
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom micro-terminal info */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#232838] pt-6 text-[11px] font-mono text-[#A6AFBC] sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-[#2EE6A8]">CADENCE PROTOCOL v1.0</span>
            <span className="text-[#232838]">|</span>
            <span>CONTRACTS: VERIFIED SEPOLIA</span>
            <span className="text-[#232838]">|</span>
            <span>SLITHER AUDIT: 0 HIGH / CRITICAL</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[#F5F7FA]"
            >
              EXPLORER
            </a>
            <a
              href="https://github.com/Bobo2005/cadence"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[#F5F7FA]"
            >
              GITHUB
            </a>
            <Link href="/docs" className="transition-colors hover:text-[#F5F7FA]">
              DOCS
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
