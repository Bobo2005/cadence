"use client";

import React from "react";

export interface ProofStatusProps {
  rootHash: string;
  isRootVerified: boolean;
  isInclusionVerified: boolean;
  isAllocationAuthenticated: boolean;
  salt?: string;
  className?: string;
}

export default function ProofStatus({
  rootHash,
  isRootVerified,
  isInclusionVerified,
  isAllocationAuthenticated,
  salt,
  className = "",
}: ProofStatusProps) {
  const steps = [
    { label: "ROOT FOUND", verified: isRootVerified },
    { label: "INCLUSION VERIFIED", verified: isInclusionVerified },
    { label: "ALLOCATION AUTHENTICATED", verified: isAllocationAuthenticated },
  ];

  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-[#E8EAED] space-y-3 font-mono text-xs shadow-2xs ${className}`}
    >
      <div className="flex items-center justify-between text-[11px] text-[#8A8F98] uppercase tracking-wider">
        <span>CRYPTOGRAPHIC MERKLE PROOF</span>
        <span className="text-[#22A06B] font-bold">● AUDITED</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`p-2.5 rounded-xl border flex items-center justify-between ${
              s.verified
                ? "bg-[#E6F4EA]/60 border-[#CEEAD6] text-[#137333]"
                : "bg-[#F7F8FA] border-[#E8EAED] text-[#8A8F98]"
            }`}
          >
            <span className="font-semibold text-[11px]">{s.label}</span>
            <span>{s.verified ? "✓" : "○"}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-[11px] text-[#5F6368] pt-1 border-t border-[#F1F3F5]">
        <div className="break-all">
          <strong className="text-[#111111]">Root Hash:</strong> {rootHash}
        </div>
        {salt && (
          <div className="break-all">
            <strong className="text-[#111111]">Blinding Salt:</strong> {salt}
          </div>
        )}
      </div>
    </div>
  );
}
