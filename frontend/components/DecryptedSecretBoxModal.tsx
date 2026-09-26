"use client";

import React, { useState, useCallback } from "react";
import type { SecretBoxPayload, CredentialType } from "../types/secretBox";

interface DecryptedSecretBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: SecretBoxPayload | null;
  vaultNumber?: string;
  vaultAddress?: string;
  benefactorAddress?: string;
  beneficiaryAddress?: string;
}

const TYPE_CONFIG: Record<
  CredentialType,
  { label: string; icon: string; badgeClass: string }
> = {
  centralized_exchange: {
    label: "Centralized Exchange",
    icon: "🏦",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  password_manager: {
    label: "Password Manager",
    icon: "🔑",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  hardware_wallet_seed: {
    label: "Hardware Seed Shard",
    icon: "🛡️",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  email_recovery: {
    label: "Master / Recovery Email",
    icon: "✉️",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  personal_note: {
    label: "Personal Note / Will",
    icon: "📝",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

export default function DecryptedSecretBoxModal({
  isOpen,
  onClose,
  payload,
  vaultNumber = "DEMO",
  vaultAddress,
  benefactorAddress,
  beneficiaryAddress,
}: DecryptedSecretBoxModalProps) {
  const [activeTab, setActiveTab] = useState<"accounts" | "letter">("accounts");
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);

  const toggleReveal = useCallback((id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setRevealExplicit = useCallback((id: string, isRevealed: boolean) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: isRevealed }));
  }, []);

  const handleCopy = useCallback((text: string, fieldId: string) => {
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedFieldId(fieldId);
      setTimeout(() => {
        setCopiedFieldId((current) => (current === fieldId ? null : current));
      }, 2000);
    }
  }, []);

  // Export Offline JSON
  const handleExportJson = useCallback(() => {
    if (!payload) return;
    const exportData = {
      ...payload,
      exportedAt: new Date().toISOString(),
      disclaimer:
        "CONFIDENTIAL — This file contains decrypted private credentials exported from Cadence Protocol. Store in an encrypted volume or cold storage.",
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cadence-legacy-box-${vaultNumber.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [payload, vaultNumber]);

  // Export / Print PDF
  const handlePrintPdf = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  if (!isOpen || !payload) return null;

  const items = payload.items || [];
  const hasLetter = Boolean(payload.personalMessage && payload.personalMessage.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-[#ECE9EF] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#ECE9EF] bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">📦</span>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
                Inherited Legacy Box — Decrypted
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                ● Decrypted in RAM
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                AES-256-GCM
              </span>
            </div>
            <p className="text-xs text-[#5F6368] font-mono">
              Vault #{vaultNumber} {vaultAddress ? `· ${vaultAddress.slice(0, 8)}...${vaultAddress.slice(-6)}` : ""}
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

        {/* Ephemeral Volatile Memory Notice */}
        <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 font-sans">
          <span className="text-sm shrink-0">🛡️</span>
          <div>
            <span className="font-bold">Ephemeral Browser Memory:</span> These credentials were decrypted locally in your browser memory and will vanish when you refresh this page. Cadence never writes decrypted credentials to disk, LocalStorage, or cookies.
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 flex items-center gap-2 border-b border-[#ECE9EF]">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "accounts"
                ? "border-[#111111] text-[#111111]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <span>🔑</span>
            <span>Accounts & Credentials</span>
            <span className="ml-1 text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("letter")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "letter"
                ? "border-[#111111] text-[#111111]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <span>📝</span>
            <span>Personal Letter / Will</span>
            {hasLetter && (
              <span className="w-2 h-2 rounded-full bg-[#2EE6A8] animate-pulse" />
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === "accounts" && (
            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                  No individual account credentials were included in this legacy box. Check the Personal Letter tab for benefactor instructions.
                </div>
              ) : (
                items.map((item, idx) => {
                  const conf = TYPE_CONFIG[item.type] || TYPE_CONFIG.personal_note;
                  const isRevealed = Boolean(revealedSecrets[item.id]);

                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-[#ECE9EF] hover:border-slate-300 transition-all shadow-xs space-y-3"
                    >
                      {/* Card Top: Type & Title */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{conf.icon}</span>
                          <div>
                            <h3 className="text-sm font-bold text-[#0F172A]">
                              {item.title || "Untitled Credential"}
                            </h3>
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${conf.badgeClass}`}
                            >
                              {conf.label}
                            </span>
                          </div>
                        </div>

                        {item.secret && (
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {/* Toggle Reveal Button */}
                            <button
                              type="button"
                              onClick={() => toggleReveal(item.id)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            >
                              {isRevealed ? "Hide Secret" : "Show Secret"}
                            </button>
                            {/* Hold to Reveal */}
                            <button
                              type="button"
                              onMouseDown={() => setRevealExplicit(item.id, true)}
                              onMouseUp={() => setRevealExplicit(item.id, false)}
                              onMouseLeave={() => setRevealExplicit(item.id, false)}
                              onTouchStart={() => setRevealExplicit(item.id, true)}
                              onTouchEnd={() => setRevealExplicit(item.id, false)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer select-none"
                              title="Hold to reveal password"
                            >
                              Hold to Reveal
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Identifier / Username / Email */}
                      {item.identifier && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                              Account / Identifier / Email
                            </span>
                            <span className="font-mono text-slate-800 font-semibold truncate block">
                              {item.identifier}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.identifier!, `id-${item.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                          >
                            {copiedFieldId === `id-${item.id}` ? "✓ Copied!" : "📋 Copy"}
                          </button>
                        </div>
                      )}

                      {/* Secret / Key */}
                      {item.secret && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                              Secret / Key / Password
                            </span>
                            <span className="font-mono text-slate-800 font-bold break-all block">
                              {isRevealed ? (
                                <span className="bg-amber-100 px-1 rounded">{item.secret}</span>
                              ) : (
                                "••••••••••••••••••••••••"
                              )}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.secret, `sec-${item.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer shrink-0 shadow-xs"
                          >
                            {copiedFieldId === `sec-${item.id}` ? "✓ Copied!" : "📋 Copy Secret"}
                          </button>
                        </div>
                      )}

                      {/* Instructions */}
                      {item.instructions && (
                        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 leading-relaxed space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 block">
                            Special Instructions / Hints
                          </span>
                          <p>{item.instructions}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "letter" && (
            <div className="p-6 sm:p-8 rounded-2xl bg-[#FCFAF7] border border-[#EBE3D5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EBE3D5] pb-3 text-xs font-mono text-[#8C7B65]">
                <div className="flex items-center gap-2">
                  <span className="text-base">📜</span>
                  <span className="font-bold uppercase tracking-wider">Benefactor Testament / Letter</span>
                </div>
                <span>
                  {payload.createdAt ? new Date(payload.createdAt).toLocaleDateString(undefined, { dateStyle: "long" }) : "Finalized"}
                </span>
              </div>

              {hasLetter ? (
                <div className="text-sm text-[#2C2416] leading-relaxed whitespace-pre-wrap font-serif italic space-y-3 pt-1">
                  {payload.personalMessage}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-6 text-center">
                  No written personal message was attached to this legacy box.
                </p>
              )}

              <div className="pt-4 border-t border-[#EBE3D5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-[#8C7B65]">
                <div>Benefactor: {benefactorAddress || payload.vaultAddress.slice(0, 10) + "..."}</div>
                <div>Beneficiary: {beneficiaryAddress || payload.beneficiaryAddress.slice(0, 10) + "..."}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#ECE9EF] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>📄</span>
              <span>Export Offline JSON</span>
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>🖨️</span>
              <span>Print / Save PDF</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer self-end sm:self-auto shadow-sm"
          >
            Done Viewing
          </button>
        </div>
      </div>
    </div>
  );
}
