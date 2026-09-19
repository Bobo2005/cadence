"use client";

import React from "react";
import AddressDisplay from "./AddressDisplay";

export interface GuardianRowProps {
  label: string;
  address: string;
  hasAttested: boolean;
  attestedTime?: string;
  attestedBlock?: string;
  onRemove?: () => void;
  className?: string;
}

export default function GuardianRow({
  label,
  address,
  hasAttested,
  attestedTime,
  attestedBlock,
  onRemove,
  className = "",
}: GuardianRowProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-[#E8EAED] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-2xs ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#111111]">{label}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hasAttested
                ? "bg-[#E6F4EA] text-[#137333]"
                : "bg-[#F1F3F5] text-[#8A8F98]"
            }`}
          >
            {hasAttested ? "✓ ATTESTED" : "PENDING"}
          </span>
        </div>
        <AddressDisplay address={address} />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-[#5F6368] self-start sm:self-auto">
        {attestedTime && <span>Time: {attestedTime}</span>}
        {attestedBlock && <span>{attestedBlock}</span>}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[#D64545] hover:underline cursor-pointer ml-2"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
