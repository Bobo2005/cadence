"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useWalletModal } from "./ConnectWalletModal";
import { useUserRole } from "../../hooks/useUserRole";

export interface WalletButtonProps {
  className?: string;
  onClick?: () => void;
}

export default function WalletButton({ className = "", onClick }: WalletButtonProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { openWalletModal } = useWalletModal();
  const { roleBadge } = useUserRole();

  if (isConnecting) {
    return (
      <button
        type="button"
        disabled
        className={`px-4 py-1.5 rounded-full bg-[#F7F8FA] border border-[#E8EAED] text-xs font-mono text-[#5F6368] ${className}`}
      >
        Connecting...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={onClick || openWalletModal}
        className={`px-4 py-1.5 rounded-full bg-[#111111] text-white text-xs font-medium hover:bg-black transition-colors cursor-pointer ${className}`}
      >
        Connect Wallet
      </button>
    );
  }

  const formattedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F8FA] border border-[#E8EAED] hover:border-[#111111] transition-all text-xs font-mono text-[#111111] cursor-pointer ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
      <span className="font-semibold">{formattedAddress}</span>
      {roleBadge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F7F8FA] border border-[#E8EAED] text-[#5F6368] font-semibold">
          {roleBadge}
        </span>
      )}
    </button>
  );
}
