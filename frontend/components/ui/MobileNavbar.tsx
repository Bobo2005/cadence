"use client";

import React from "react";
import Link from "next/link";
import CadenceLogo from "./CadenceLogo";
import { type NavItem } from "./Sidebar";
import WalletButton from "./WalletButton";

export interface MobileNavbarProps {
  isOpen: boolean;
  onClose: () => void;
  overviewItems: NavItem[];
  systemItems: NavItem[];
  activeId?: string;
}

export default function MobileNavbar({
  isOpen,
  onClose,
  overviewItems,
  systemItems,
  activeId,
}: MobileNavbarProps) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200 font-sans">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <nav
        className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-left duration-250 p-6 space-y-6"
        aria-label="Mobile navigation"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8EAED] pb-4">
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-[#F7F8FA] border border-[#E8EAED]">
                <CadenceLogo size={22} showWordmark={false} />
              </div>
              <span className="text-base font-bold tracking-tight text-[#111111]">
                CADENCE
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#5F6368] hover:text-[#111111] hover:bg-[#F1F3F5] transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98] mb-2">
              WALLET
            </div>
            <WalletButton className="w-full justify-center" />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3 pb-1">
              OVERVIEW
            </div>
            {overviewItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                      : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-1 border-t border-[#E8EAED] pt-4">
            <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3 pb-1">
              SYSTEM
            </div>
            {systemItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                      : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-[#E8EAED] text-xs text-[#8A8F98] font-mono">
          <div>CADENCE PROTOCOL v1.0</div>
          <div className="mt-1 text-[11px] text-[#22A06B] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
            HEALTHY HEARTBEAT
          </div>
        </div>
      </nav>
    </div>
  );
}
