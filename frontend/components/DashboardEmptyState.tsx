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
      {/* Hero Welcome Card */}
      <div className="rounded-[22px] bg-[#12161F] border border-[#232838] p-8 md:p-10 relative overflow-hidden">
        {/* Subtle background pulse glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#2EE6A8]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2EE6A8]/10 border border-[#2EE6A8]/20 text-[#2EE6A8] text-xs font-mono tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#2EE6A8] animate-pulse" />
            No Active Lockers Detected
          </div>

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#E8ECF1]">
            Protect your digital assets with decentralized Proof-of-Life consensus
          </h2>

          <p className="text-sm md:text-base text-[#8993A6] leading-relaxed">
            You do not currently own any inheritance lockers. With Cadence, your assets remain non-custodial and entirely under your control. If your on-chain heartbeat stops, assets are autonomously released to your nominated beneficiaries.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/vault/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2EE6A8] text-[#0A0E14] font-semibold text-sm hover:bg-[#2EE6A8]/90 transition-all shadow-[0_0_20px_rgba(46,230,168,0.25)] hover:shadow-[0_0_28px_rgba(46,230,168,0.4)] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Your First Vault</span>
            </Link>

            {isBeneficiary && (
              <Link
                href="/claim"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A1F2B] border border-[#232838] text-[#2EE6A8] hover:border-[#2EE6A8]/50 text-sm font-medium transition-all"
              >
                <span>View Eligible Claims ({beneficiaryVaults.length})</span>
                <span className="text-xs">→</span>
              </Link>
            )}

            {isGuardian && (
              <Link
                href="/contest"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A1F2B] border border-[#232838] text-[#F5B841] hover:border-[#F5B841]/50 text-sm font-medium transition-all"
              >
                <span>Guardian Attestations ({guardianVaults.length})</span>
                <span className="text-xs">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Role Notice Banners if user has other roles */}
      {(isBeneficiary || isGuardian) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isBeneficiary && (
            <div className="p-5 rounded-xl bg-[#12161F] border border-[#2EE6A8]/30 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-[#2EE6A8]/10 text-[#2EE6A8]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase text-[#2EE6A8] tracking-wider font-semibold">
                  Beneficiary Role Detected
                </div>
                <div className="text-sm text-[#E8ECF1]">
                  You are a listed heir on {beneficiaryVaults.length} locker{beneficiaryVaults.length > 1 ? "s" : ""}.
                </div>
                <Link
                  href="/claim"
                  className="inline-block text-xs font-mono text-[#2EE6A8] hover:underline pt-1"
                >
                  Go to Claim Portal →
                </Link>
              </div>
            </div>
          )}

          {isGuardian && (
            <div className="p-5 rounded-xl bg-[#12161F] border border-[#F5B841]/30 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-[#F5B841]/10 text-[#F5B841]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase text-[#F5B841] tracking-wider font-semibold">
                  Guardian Role Detected
                </div>
                <div className="text-sm text-[#E8ECF1]">
                  You are a nominated consensus guardian node on {guardianVaults.length} locker{guardianVaults.length > 1 ? "s" : ""}.
                </div>
                <Link
                  href="/contest"
                  className="inline-block text-xs font-mono text-[#F5B841] hover:underline pt-1"
                >
                  Go to Contest Window →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Protocol Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-[#12161F] border border-[#232838] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#2EE6A8]/10 text-[#2EE6A8] flex items-center justify-center font-mono font-bold text-sm">
            1
          </div>
          <h3 className="font-semibold text-sm text-[#E8ECF1]">Shielded Allocation Privacy</h3>
          <p className="text-xs text-[#8993A6] leading-relaxed">
            Shares are ECIES-encrypted client-side. The blockchain only commits a cryptographic Merkle root — zero plaintext allocations are readable on-chain.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#12161F] border border-[#232838] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#2EE6A8]/10 text-[#2EE6A8] flex items-center justify-center font-mono font-bold text-sm">
            2
          </div>
          <h3 className="font-semibold text-sm text-[#E8ECF1]">Sponsored Gasless Check-Ins</h3>
          <p className="text-xs text-[#8993A6] leading-relaxed">
            Record proof-of-life heartbeats at zero gas cost via Pimlico ERC-4337 verifying paymaster sponsorship directly from your wallet.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#12161F] border border-[#232838] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#2EE6A8]/10 text-[#2EE6A8] flex items-center justify-center font-mono font-bold text-sm">
            3
          </div>
          <h3 className="font-semibold text-sm text-[#E8ECF1]">72-Hour Contest Window</h3>
          <p className="text-xs text-[#8993A6] leading-relaxed">
            If a lapse is declared, a 72-hour challenge period opens. The owner can cancel anytime with an anonymous EIP-712 stealth signature.
          </p>
        </div>
      </div>
    </div>
  );
}
