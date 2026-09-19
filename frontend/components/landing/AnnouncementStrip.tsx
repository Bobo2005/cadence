"use client";

import React from "react";
import Link from "next/link";

export default function AnnouncementStrip() {
  return (
    <div className="w-full bg-[#FFF0EC] border-b border-[#F58A78]/25 py-2 px-4 transition-colors">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F58A78]/20 text-[#D64545] font-semibold text-[11px]">
            NEW
          </span>
          <span className="text-[#5F6368] font-medium hidden sm:inline">
            Cadence Protocol v1.0 is live on Ethereum Sepolia Testnet
          </span>
          <span className="text-[#5F6368] font-medium sm:hidden">
            v1.0 live on Ethereum Sepolia
          </span>
          <span className="text-[#8A8F98] hidden md:inline">·</span>
          <span className="text-[#5F6368] hidden md:inline">
            Self-custodial inheritance with reversible contest windows
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111111] text-white text-[11px] font-medium hover:bg-black transition-colors"
          >
            <span>Read Spec</span>
            <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
