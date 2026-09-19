"use client";

import React, { useState } from "react";

export interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
}

export default function AddressDisplay({
  address,
  truncate = true,
  showCopy = true,
  showExplorer = true,
  className = "",
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const display = truncate && address.length > 10
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-xs ${className}`}>
      <span className="font-semibold text-[#111111]">{display}</span>

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="text-[#7C5CFF] hover:text-[#5B39E0] transition-colors cursor-pointer text-[11px]"
          title="Copy address"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      )}

      {showExplorer && (
        <a
          href={`https://sepolia.etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8A8F98] hover:text-[#111111] transition-colors text-[11px]"
          title="View on Etherscan"
        >
          ↗
        </a>
      )}
    </div>
  );
}
