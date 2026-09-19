"use client";

import React from "react";
import StatusBadge, { type StatusVariant } from "./StatusBadge";
import AddressDisplay from "./AddressDisplay";

export interface VaultCardProps {
  name: string;
  vaultId: string;
  vaultAddress: string;
  balanceEth: string;
  status: string;
  statusVariant?: StatusVariant;
  onClick?: () => void;
  className?: string;
}

export default function VaultCard({
  name,
  vaultId,
  vaultAddress,
  balanceEth,
  status,
  statusVariant = "active",
  onClick,
  className = "",
}: VaultCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-3xl bg-white border border-[#E8EAED] hover:border-[#111111] transition-all cursor-pointer shadow-xs space-y-4 font-sans ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-[11px] font-mono text-[#8A8F98] uppercase tracking-wider">
            {vaultId}
          </div>
          <h4 className="text-base font-bold text-[#111111]">{name}</h4>
        </div>
        <StatusBadge status={status} variant={statusVariant} />
      </div>

      <div className="flex items-baseline justify-between border-t border-[#F1F3F5] pt-3">
        <div className="space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-[#8A8F98]">DEPOSITED ASSETS</div>
          <div className="text-lg font-bold font-mono text-[#111111]">{balanceEth}</div>
        </div>
        <AddressDisplay address={vaultAddress} showCopy={false} showExplorer={false} />
      </div>
    </div>
  );
}
