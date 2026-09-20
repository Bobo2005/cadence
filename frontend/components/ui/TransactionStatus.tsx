"use client";

import React from "react";

export interface TransactionStatusProps {
  status: "idle" | "pending" | "confirmed" | "failed";
  txHash?: string;
  label?: string;
  errorMessage?: string;
  className?: string;
}

export default function TransactionStatus({
  status,
  txHash,
  label,
  errorMessage,
  className = "",
}: TransactionStatusProps) {
  if (status === "idle") return null;

  const config = {
    pending: {
      bg: "bg-[#F7F8FA] border-[#E8EAED]",
      text: "text-[#5F6368]",
      icon: (
        <svg className="animate-spin h-4 w-4 text-[#111111]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ),
      title: label || "Transaction Pending Confirmation",
    },
    confirmed: {
      bg: "bg-[#E6F4EA] border-[#CEEAD6]",
      text: "text-[#137333]",
      icon: <span className="font-bold">✓</span>,
      title: label || "Transaction Confirmed On-Chain",
    },
    failed: {
      bg: "bg-[#FDECEC] border-[#FAD2CF]",
      text: "text-[#D64545]",
      icon: <span className="font-bold">✕</span>,
      title: label || "Transaction Failed",
    },
  }[status];

  return (
    <div
      className={`p-4 rounded-2xl border text-xs font-mono space-y-1.5 shadow-2xs ${config.bg} ${config.text} ${className}`}
    >
      <div className="flex items-center gap-2 font-bold">
        {config.icon}
        <span>{config.title}</span>
      </div>

      {errorMessage && (
        <div className="text-[11px] text-[#111111] font-sans">{errorMessage}</div>
      )}

      {txHash && (
        <div className="text-[11px] break-all pt-1">
          <span>Hash: </span>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold hover:opacity-80"
          >
            {txHash} ↗
          </a>
        </div>
      )}
    </div>
  );
}
