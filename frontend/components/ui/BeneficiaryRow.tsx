"use client";

import React from "react";
import AddressDisplay from "./AddressDisplay";

export interface BeneficiaryRowProps {
  index: number;
  address: string;
  sharePercent: number;
  allocatedEth?: string;
  onShareChange?: (share: number) => void;
  onRemove?: () => void;
  className?: string;
}

export default function BeneficiaryRow({
  index,
  address,
  sharePercent,
  allocatedEth,
  onShareChange,
  onRemove,
  className = "",
}: BeneficiaryRowProps) {
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white border border-[#E8EAED] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs text-xs font-mono ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#F1F3F5] text-[#111111] flex items-center justify-center font-bold text-[10px]">
            {index + 1}
          </span>
          <span className="font-bold text-[#111111]">HEIR DESIGNATION</span>
        </div>
        <AddressDisplay address={address} />
      </div>

      <div className="flex items-center gap-4 self-start sm:self-auto">
        <div className="text-right">
          <div className="font-bold text-[#111111] text-sm">
            {sharePercent.toFixed(2)}%
          </div>
          {allocatedEth && (
            <div className="text-[11px] text-[#5F6368]">{allocatedEth} ETH</div>
          )}
        </div>

        {onShareChange && (
          <input
            type="number"
            min={1}
            max={100}
            value={sharePercent}
            onChange={(e) => onShareChange(Number(e.target.value))}
            className="w-16 px-2 py-1 rounded-lg border border-[#D9DCE1] text-center font-mono text-xs focus:outline-none focus:border-[#7C5CFF]"
          />
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[#D64545] hover:underline cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
