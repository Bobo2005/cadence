"use client";

import React from "react";

export interface BalanceDisplayProps {
  amount: string | number;
  symbol?: string;
  usdValue?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function BalanceDisplay({
  amount,
  symbol = "ETH",
  usdValue,
  size = "md",
  className = "",
}: BalanceDisplayProps) {
  const sizeStyles = {
    sm: "text-sm",
    md: "text-xl sm:text-2xl",
    lg: "text-3xl sm:text-4xl",
  }[size];

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className={`font-bold font-mono text-[#111111] flex items-baseline gap-1.5 ${sizeStyles}`}>
        <span>{amount}</span>
        <span className="text-xs font-semibold text-[#5F6368] uppercase">{symbol}</span>
      </div>
      {usdValue && (
        <div className="text-xs font-mono text-[#8A8F98]">
          ≈ {usdValue}
        </div>
      )}
    </div>
  );
}
