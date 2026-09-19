"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useWalletModal } from "../ui/ConnectWalletModal";
import CadenceLogo from "../ui/CadenceLogo";

export default function PublicNavbar() {
  const { isConnected, address } = useAccount();
  const { openWalletModal } = useWalletModal();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-[#E8EAED] transition-colors">
      <div className="max-w-[1200px] mx-auto px-6 h-18 flex items-center justify-between">
        {/* Brand with Cadence Heart Pulse Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-xl bg-[#F7F8FA] border border-[#E8EAED] group-hover:border-[#AEB3BB] transition-colors flex items-center justify-center">
            <CadenceLogo size={22} showWordmark={false} />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#111111]">
            Cadence
          </span>
        </Link>

        {/* Center navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#5F6368]">
          <a href="#product" className="hover:text-[#111111] transition-colors">
            Product
          </a>
          <a href="#how-it-works" className="hover:text-[#111111] transition-colors">
            How it works
          </a>
          <a href="#security" className="hover:text-[#111111] transition-colors">
            Security
          </a>
          <Link href="/docs" className="hover:text-[#111111] transition-colors">
            Docs
          </Link>
        </nav>

        {/* Right CTA / Wallet status */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111111] text-white text-sm font-medium hover:bg-black transition-all shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
              <span>
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Dashboard"}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={openWalletModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111111] text-white text-sm font-medium hover:bg-black transition-all shadow-sm cursor-pointer"
            >
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
