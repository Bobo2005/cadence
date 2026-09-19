"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";

export default function ClaimSuccessPanel() {
  const searchParams = useSearchParams();
  const { address: connectedAddress } = useAccount();

  // URL Query Parameters or Defaults matching Page 7 requirements
  const rawTx = searchParams.get("tx");
  const rawAmount = searchParams.get("amount");
  const rawRecipient = searchParams.get("recipient");
  const rawLocker = searchParams.get("locker");
  const rawSettlement = searchParams.get("settlement");
  const rawNetwork = searchParams.get("network");
  const rawTimestamp = searchParams.get("timestamp");

  // Format defaults
  const txHash =
    rawTx ||
    "0x4b78c902e817a94df6b18923a9d182740bc189283749021a8b92817409281234";
  const amount = rawAmount || "0.8400 ETH";
  const recipient =
    rawRecipient ||
    connectedAddress ||
    "0xABCD0123456789ABCDEF0123456789ABCDEF1234";
  const lockerId = rawLocker ? (rawLocker.startsWith("LOCKER") ? rawLocker : `LOCKER-${rawLocker}`) : "LOCKER-01";
  const settlementType = rawSettlement || "Lump-Sum Settlement";
  const network = rawNetwork || "Ethereum Sepolia (Chain ID: 11155111)";

  const [formattedTimestamp, setFormattedTimestamp] = useState("Sep 19, 2026 · 04:50 UTC");
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedRecipient, setCopiedRecipient] = useState(false);

  useEffect(() => {
    if (rawTimestamp) {
      setFormattedTimestamp(rawTimestamp);
    } else {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
      setFormattedTimestamp(`${dateStr} · ${timeStr}`);
    }
  }, [rawTimestamp]);

  const handleCopy = (text: string, isTx: boolean) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (isTx) {
        setCopiedTx(true);
        setTimeout(() => setCopiedTx(false), 2000);
      } else {
        setCopiedRecipient(true);
        setTimeout(() => setCopiedRecipient(false), 2000);
      }
    }
  };

  const formattedRecipient =
    recipient.length > 14
      ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}`
      : recipient;

  const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;

  return (
    <div className="w-full max-w-2xl mx-auto py-8 sm:py-16 px-4 font-sans text-[#111111] animate-in fade-in duration-300">
      {/* Calm Outer Card with Generous White Space */}
      <div className="bg-white rounded-3xl border border-[#E8EAED] p-8 sm:p-14 shadow-sm space-y-10">
        {/* Header Block: Calm, Dignified, Unhurried */}
        <div className="space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xs font-mono font-bold text-[#5F6368] uppercase tracking-widest">
              INHERITANCE CLAIM SETTLED
            </h1>

            {/* Restrained Success Badge: Steady, Serene */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4EA] border border-[#CEEAD6] text-xs font-mono font-semibold text-[#137333] self-center sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-[#137333]" />
              <span>CONFIRMED</span>
            </div>
          </div>

          <div className="h-px bg-[#E8EAED] w-full" />
        </div>

        {/* Dominant Settlement Figure */}
        <div className="space-y-3 text-center sm:text-left py-2">
          <div className="text-4xl sm:text-6xl font-bold font-mono tracking-tight text-[#111111]">
            {amount}
          </div>

          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#5F6368] block">
              TRANSFERRED TO
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-base sm:text-lg font-mono font-semibold text-[#111111]">
                {formattedRecipient}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(recipient, false)}
                title="Copy full address"
                className="text-xs font-mono text-[#5F6368] hover:text-[#111111] px-1.5 py-0.5 rounded border border-[#E8EAED] hover:border-[#111111] transition-colors cursor-pointer"
              >
                {copiedRecipient ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Verification Metadata Grid */}
        <div className="rounded-2xl bg-[#F8FAF9] border border-[#E8EAED] p-6 space-y-4 text-xs font-mono">
          <div className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider border-b border-[#E8EAED]/80 pb-2">
            Settlement Audit Record
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            {/* Locker ID */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#5F6368] uppercase tracking-wider block">
                Locker ID
              </span>
              <span className="font-semibold text-[#111111] block">
                {lockerId}
              </span>
            </div>

            {/* Settlement Type */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#5F6368] uppercase tracking-wider block">
                Settlement Type
              </span>
              <span className="font-semibold text-[#111111] block">
                {settlementType}
              </span>
            </div>

            {/* Network */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#5F6368] uppercase tracking-wider block">
                Network
              </span>
              <span className="font-semibold text-[#111111] block">
                {network}
              </span>
            </div>

            {/* Timestamp */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#5F6368] uppercase tracking-wider block">
                Timestamp
              </span>
              <span className="font-semibold text-[#111111] block">
                {formattedTimestamp}
              </span>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="pt-3 border-t border-[#E8EAED]/80 space-y-1">
            <span className="text-[10px] text-[#5F6368] uppercase tracking-wider block">
              Transaction Hash
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="break-all text-[11px] text-[#111111] select-all">
                {txHash}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(txHash, true)}
                className="text-[11px] text-[#5F6368] hover:text-[#111111] px-2 py-0.5 rounded border border-[#E8EAED] hover:border-[#111111] shrink-0 transition-colors cursor-pointer"
              >
                {copiedTx ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5">
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 py-3.5 px-6 rounded-full font-bold text-xs font-mono border border-[#E8EAED] text-[#111111] hover:border-[#111111] hover:bg-[#F8FAF9] transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>VIEW TRANSACTION</span>
            <span>↗</span>
          </a>

          <Link
            href="/claim"
            className="w-full sm:flex-1 py-3.5 px-6 rounded-full font-bold text-xs font-mono bg-[#111111] hover:bg-black text-white transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>RETURN TO CLAIM PORTAL</span>
            <span>→</span>
          </Link>
        </div>

        {/* Subtle reassuring footnote */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-[#8A8F98] leading-relaxed">
            All cryptographic proofs have finalized on Ethereum Sepolia. No further beneficiary signatures required.
          </p>
        </div>
      </div>
    </div>
  );
}
