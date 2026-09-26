"use client";

import React, { useState } from "react";
import type { SecretBoxItem, CredentialType } from "../types/secretBox";

interface OffChainLegacyBoxBuilderProps {
  beneficiaryName: string;
  beneficiaryAddress: string;
  items: SecretBoxItem[];
  personalMessage: string;
  onChange: (items: SecretBoxItem[], personalMessage: string) => void;
}

const CREDENTIAL_TYPE_OPTIONS: { value: CredentialType; label: string; icon: string }[] = [
  { value: "centralized_exchange", label: "Centralized Exchange (Coinbase, Binance)", icon: "🏦" },
  { value: "password_manager", label: "Password Manager (1Password, Bitwarden)", icon: "🔑" },
  { value: "hardware_wallet_seed", label: "Hardware Seed Shard (Ledger, Trezor, Coldcard)", icon: "🛡️" },
  { value: "email_recovery", label: "Master Email / Recovery Account", icon: "✉️" },
  { value: "personal_note", label: "Personal Note / Will / Safe Combination", icon: "📝" },
];

export default function OffChainLegacyBoxBuilder({
  beneficiaryName,
  items,
  personalMessage,
  onChange,
}: OffChainLegacyBoxBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addItem = () => {
    const newItem: SecretBoxItem = {
      id: `secret-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "centralized_exchange",
      title: "",
      identifier: "",
      secret: "",
      totpSecret: "",
      instructions: "",
    };
    onChange([...items, newItem], personalMessage);
    if (!isOpen) setIsOpen(true);
  };

  const updateItem = (id: string, updates: Partial<SecretBoxItem>) => {
    const updated = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    onChange(updated, personalMessage);
  };

  const removeItem = (id: string) => {
    const filtered = items.filter((item) => item.id !== id);
    onChange(filtered, personalMessage);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(items, e.target.value);
  };

  const totalSecretsCount = items.length + (personalMessage.trim() ? 1 : 0);

  return (
    <div className="mt-3 border border-[#ECE9EF] rounded-xl overflow-hidden bg-[#FAFAFC] transition-all">
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#F2F1F5] transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-base">🔐</span>
          <span className="text-xs sm:text-sm font-semibold text-[#0F172A]">
            Off-Chain Legacy Box (Optional)
          </span>
          {totalSecretsCount > 0 && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#2EE6A8]/20 text-[#0E7A53] border border-[#2EE6A8]/40">
              {totalSecretsCount} {totalSecretsCount === 1 ? "secret" : "secrets"} attached
            </span>
          )}
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
            Client-Side AES-256-GCM
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Zero Cloud Plaintext
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>{isOpen ? "Collapse" : "Configure"}</span>
          <span className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 border-t border-[#ECE9EF] bg-white space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Securely attach exchange accounts, hardware seed shards, and master passwords for{" "}
            <span className="font-semibold text-slate-700">{beneficiaryName || "this beneficiary"}</span>.
            Everything is encrypted in your browser with your heir&apos;s public key before leaving your computer.
          </p>

          {/* List of Secrets */}
          {items.map((item, index) => (
            <div
              key={item.id}
              className="p-3.5 border border-slate-200 rounded-lg bg-[#F8FAFC] space-y-3 relative group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>#{index + 1}</span>
                  <span>Credential / Secret</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-0.5 rounded hover:bg-rose-50 transition-colors"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Type Selection */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Credential Type
                  </label>
                  <select
                    value={item.type}
                    onChange={(e) => updateItem(item.id, { type: e.target.value as CredentialType })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-[#2EE6A8]"
                  >
                    {CREDENTIAL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Account / Asset Title
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    placeholder="e.g. Coinbase Family Reserve"
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EE6A8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Identifier / Username */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Account Email / Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    value={item.identifier || ""}
                    placeholder="e.g. father@investments.com"
                    onChange={(e) => updateItem(item.id, { identifier: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EE6A8]"
                  />
                </div>

                {/* Secret / Key (Masked with Eye Button) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Secret / Master Password / Seed Shard
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets[item.id] ? "text" : "password"}
                      value={item.secret}
                      placeholder="Enter private credential..."
                      onChange={(e) => updateItem(item.id, { secret: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 pr-12 border border-slate-200 rounded bg-white text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-[#2EE6A8]"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility(item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 px-1 font-medium"
                    >
                      {showSecrets[item.id] ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Special Instructions & 2FA Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 2FA Authenticator Backup Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                      <span>🔐 2FA / Authenticator Backup Key (Optional)</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">TOTP Seed</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showSecrets[`totp-${item.id}`] ? "text" : "password"}
                      value={item.totpSecret || ""}
                      placeholder="e.g. JBSWY3DPEHPK3PXP"
                      onChange={(e) =>
                        updateItem(item.id, {
                          totpSecret: e.target.value.toUpperCase().replace(/[\s-]/g, ""),
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 pr-12 border border-slate-200 rounded bg-white text-slate-800 placeholder-slate-400 font-mono uppercase focus:outline-none focus:border-[#2EE6A8]"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility(`totp-${item.id}`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 px-1 font-medium cursor-pointer"
                    >
                      {showSecrets[`totp-${item.id}`] ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    TOTP Seed from exchange &apos;Set up 2FA&apos; screen (e.g. JBSWY3DPEHPK3PXP). Enables your heir to generate live 6-digit Google Authenticator codes in Cadence.
                  </p>
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Access Instructions / Physical Location
                  </label>
                  <input
                    type="text"
                    value={item.instructions || ""}
                    placeholder="e.g. Hardware YubiKey #2 is inside the master bedroom safe"
                    onChange={(e) => updateItem(item.id, { instructions: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EE6A8]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Specific notes or physical instructions to help your heir locate devices or accounts.
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Add Item Button */}
          <button
            type="button"
            onClick={addItem}
            className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-[#2EE6A8] rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors flex items-center justify-center gap-1.5 bg-[#F8FAFC]"
          >
            <span>+ Add Credential / Secret</span>
          </button>

          {/* Personal Message / Will Letter */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">
                Personal Letter / Legacy Will Instructions (Markdown Supported)
              </label>
              <span className="text-[10px] text-slate-400">
                {personalMessage.length} characters
              </span>
            </div>
            <textarea
              rows={3}
              value={personalMessage}
              placeholder="Write a private letter or specific legal estate instructions to your heir..."
              onChange={handleMessageChange}
              className="w-full text-xs p-2.5 border border-slate-200 rounded bg-[#F8FAFC] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EE6A8] focus:bg-white transition-all resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}
