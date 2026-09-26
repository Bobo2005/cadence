"use client";

import React, { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";

export type DepositSource = "coinbase" | "binance" | "kraken" | "mobile_wallet";

export interface AssistedDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAddress: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  networkName?: string;
  chainId?: number;
  isVaultAddress?: boolean;
}

interface SourceConfig {
  id: DepositSource;
  name: string;
  icon: string;
  badgeClass: string;
  instructions: string[];
}

const SOURCES: SourceConfig[] = [
  {
    id: "coinbase",
    name: "Coinbase",
    icon: "🔵",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    instructions: [
      "Open your Coinbase mobile app.",
      "Tap the Pay / Transfer icon, then select Send.",
      "Select your asset and tap the QR Scanner icon in the address field.",
      "Scan this QR code and confirm with FaceID or 2FA.",
    ],
  },
  {
    id: "binance",
    name: "Binance",
    icon: "🟡",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    instructions: [
      "Open your Binance mobile app.",
      "Navigate to Wallets → Withdraw, then select your cryptocurrency.",
      "Tap Send via Crypto Network.",
      "Tap the QR Code scanner icon in the Address field and scan this code.",
      "Approve the withdrawal with your Binance Authenticator or biometric login.",
    ],
  },
  {
    id: "kraken",
    name: "Kraken / Other CEX",
    icon: "🐙",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    instructions: [
      "Open your Kraken app or web exchange dashboard.",
      "Go to Funding / Withdraw and select your token.",
      "Scan this address QR code or copy the address below.",
      "Verify the network matches before approving the transfer.",
    ],
  },
  {
    id: "mobile_wallet",
    name: "Mobile Web3 Wallet",
    icon: "📱",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    instructions: [
      "Open MetaMask, Rainbow, Rabby, or Coinbase Wallet on your phone.",
      "Tap Send or Scan.",
      "Scan this interactive Web3 payment QR code.",
      "The address and amount will pre-populate automatically for 1-tap confirmation.",
    ],
  },
];

export default function AssistedDepositModal({
  isOpen,
  onClose,
  targetAddress,
  tokenSymbol = "ETH",
  tokenAmount = "0.05",
  networkName = "Arbitrum Sepolia",
  chainId = 421614,
  isVaultAddress = false,
}: AssistedDepositModalProps) {
  const [selectedSource, setSelectedSource] = useState<DepositSource>("coinbase");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedField, setCopiedField] = useState<"address" | "amount" | null>(null);

  // Generate QR Code dynamically
  useEffect(() => {
    if (!isOpen || !targetAddress) return;

    let payload = targetAddress;

    // For Web3 mobile wallets, use standard EIP-681 payment URI
    // For centralized exchanges, use clean 0x address so exchange scanners don't throw syntax errors
    if (selectedSource === "mobile_wallet") {
      if (tokenSymbol === "ETH") {
        payload = `ethereum:${targetAddress}${tokenAmount ? `?value=${tokenAmount}` : ""}`;
      } else {
        payload = `ethereum:${targetAddress}`;
      }
    }

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("Failed to generate QR code:", err));
  }, [isOpen, targetAddress, selectedSource, tokenSymbol, tokenAmount]);

  const handleCopy = useCallback((text: string, field: "address" | "amount") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((curr) => (curr === field ? null : curr));
      }, 2000);
    }
  }, []);

  if (!isOpen || !targetAddress) return null;

  const currentSource = SOURCES.find((s) => s.id === selectedSource) || SOURCES[0];
  const formattedAddress = `${targetAddress.slice(0, 10)}...${targetAddress.slice(-8)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-[#ECE9EF] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#ECE9EF] bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">⚡</span>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
                Instant Deposit from Exchange
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                ● Non-Custodial QR
              </span>
            </div>
            <p className="text-xs text-[#5F6368]">
              Scan with your mobile exchange app to fund {isVaultAddress ? "your Cadence Vault" : "your wallet"} without typing passwords.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shadow-xs"
            aria-label="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* Source Selector Tabs */}
        <div className="p-3 bg-slate-50 border-b border-[#ECE9EF] flex items-center gap-1.5 overflow-x-auto">
          {SOURCES.map((src) => {
            const isSelected = selectedSource === src.id;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => setSelectedSource(src.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-[#111111] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{src.icon}</span>
                <span>{src.name}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Network Safety Badge */}
          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <span className="text-base shrink-0">⚠️</span>
            <div className="space-y-0.5">
              <span className="font-bold">Required Network: {networkName} (Chain ID: {chainId})</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Ensure you select the <strong className="font-semibold">{networkName}</strong> network on your exchange when initiating this transfer.
              </p>
            </div>
          </div>

          {/* QR Code & Transfer Details Grid */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col items-center justify-center shrink-0">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Deposit QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 text-xs font-mono">
                  Generating QR...
                </div>
              )}
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-2 font-semibold">
                Scan with {currentSource.name} App
              </span>
            </div>

            {/* Recipient Details & Action Cards */}
            <div className="flex-1 w-full space-y-3">
              {/* Recipient Address */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                  {isVaultAddress ? "Cadence Vault Address" : "Destination Wallet Address"}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 truncate" title={targetAddress}>
                    {formattedAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(targetAddress, "address")}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    {copiedField === "address" ? "✓ Copied!" : "📋 Copy Address"}
                  </button>
                </div>
              </div>

              {/* Amount to Send */}
              {tokenAmount && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                      Target Amount
                    </span>
                    <span className="font-mono text-sm font-extrabold text-slate-900">
                      {tokenAmount} {tokenSymbol}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(tokenAmount, "amount")}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    {copiedField === "amount" ? "✓ Copied!" : "📋 Copy Amount"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EBE3D5] space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8C7B65] uppercase tracking-wider font-mono">
              <span>📋</span>
              <span>How to Transfer via {currentSource.name}</span>
            </div>
            <ol className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
              {currentSource.instructions.map((inst, idx) => (
                <li key={idx} className="text-slate-600">
                  <span className="text-slate-800 font-medium">{inst}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#ECE9EF] bg-slate-50 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 font-mono">
            Zero Passwords · Native FaceID / 2FA Approved
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
