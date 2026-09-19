"use client";

import React from "react";

export interface AllocationValidatorProps {
  totalPercent: number;
  className?: string;
}

export default function AllocationValidator({
  totalPercent,
  className = "",
}: AllocationValidatorProps) {
  const isValid = totalPercent === 100;
  const remaining = 100 - totalPercent;

  return (
    <div className={`p-4 rounded-2xl border text-xs font-mono space-y-2 ${
      isValid
        ? "bg-[#E6F4EA]/50 border-[#CEEAD6] text-[#137333]"
        : "bg-[#FFF6D8] border-[#F5B841]/50 text-[#B45309]"
    } ${className}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider">
          {isValid ? "✓ Total Allocation Valid" : "Allocation Must Equal 100%"}
        </span>
        <span className="font-bold">{totalPercent}% / 100%</span>
      </div>

      <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isValid ? "bg-[#22A06B]" : totalPercent > 100 ? "bg-[#D64545]" : "bg-[#D99A00]"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, totalPercent))}%` }}
        />
      </div>

      {!isValid && (
        <div className="text-[11px] font-sans">
          {remaining > 0
            ? `Please allocate the remaining ${remaining}% among beneficiaries.`
            : `Allocations exceed 100% by ${Math.abs(remaining)}%. Please reduce shares.`}
        </div>
      )}
    </div>
  );
}
