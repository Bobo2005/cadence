import React from "react";
import Link from "next/link";
import { type VaultRoleMatch } from "../hooks/useUserRole";

interface DashboardEmptyStateProps {
  beneficiaryVaults?: VaultRoleMatch[];
  guardianVaults?: VaultRoleMatch[];
}

export default function DashboardEmptyState({
  beneficiaryVaults = [],
  guardianVaults = [],
}: DashboardEmptyStateProps) {
  const isBeneficiary = beneficiaryVaults.length > 0;
  const isGuardian = guardianVaults.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Editorial Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
          Vault Pulse
        </h1>
        <p className="text-sm text-[#5F6368] mt-1">
          Your inheritance protocol is standby ready.
        </p>
      </div>

      {/* Hero Welcome Card */}
      <div className="rounded-3xl bg-white border border-[#E8EAED] p-8 md:p-12 relative overflow-hidden shadow-sm">
        {/* Soft atmospheric gradient */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-[#CFFBF7]/40 via-[#D8DEFF]/30 to-transparent rounded-full blur-3xl" />

        <div className="max-w-2xl space-y-6 relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] leading-snug">
            Protect your digital assets with decentralized Proof-of-Life consensus.
          </h2>

          <p className="text-sm md:text-base text-[#5F6368] leading-relaxed">
            You do not currently own any inheritance lockers. With Cadence, your assets remain non-custodial and entirely under your control. If your on-chain heartbeat stops, assets are autonomously released to your nominated beneficiaries after a reversible 72-hour contest window.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/vault/create"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#111111] text-white font-semibold text-sm hover:bg-black transition-all shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Your First Vault</span>
            </Link>

            {isBeneficiary && (
              <Link
                href="/claim"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-[#D9DCE1] text-[#111111] hover:bg-[#F7F8FA] text-sm font-medium transition-all"
              >
                <span>View Eligible Claims ({beneficiaryVaults.length})</span>
                <span className="text-xs">→</span>
              </Link>
            )}

            {isGuardian && (
              <Link
                href="/contest"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-[#D9DCE1] text-[#111111] hover:bg-[#F7F8FA] text-sm font-medium transition-all"
              >
                <span>Guardian Attestations ({guardianVaults.length})</span>
                <span className="text-xs">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Feature Explainer Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-[#E8EAED] shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#F7F8FA] border border-[#E8EAED] flex items-center justify-center text-[#7C5CFF] font-bold text-xs">
            1
          </div>
          <h3 className="font-bold text-sm text-[#111111]">Non-Custodial Deposit</h3>
          <p className="text-xs text-[#5F6368] leading-relaxed">
            Assets reside in your dedicated smart contract locker. You hold exclusive withdrawal and deposit rights.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8EAED] shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#F7F8FA] border border-[#E8EAED] flex items-center justify-center text-[#22A06B] font-bold text-xs">
            2
          </div>
          <h3 className="font-bold text-sm text-[#111111]">Cryptographic Heartbeat</h3>
          <p className="text-xs text-[#5F6368] leading-relaxed">
            Submit periodic proof-of-life check-ins gaslessly or via wallet. Countdown resets immediately.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8EAED] shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#F7F8FA] border border-[#E8EAED] flex items-center justify-center text-[#F58A78] font-bold text-xs">
            3
          </div>
          <h3 className="font-bold text-sm text-[#111111]">Reversible Contest Window</h3>
          <p className="text-xs text-[#5F6368] leading-relaxed">
            72-hour delay safeguards against premature claims. A single heartbeat aborts invalid guardian attestations.
          </p>
        </div>
      </div>
    </div>
  );
}
