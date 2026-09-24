"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useCookieConsent } from "../../context/CookieContext";

export default function CookiePreferencesModal() {
  const { preferences, isPreferencesModalOpen, closePreferencesModal, saveCustom, acceptAll } = useCookieConsent();

  const [sentinelTelemetry, setSentinelTelemetry] = useState(false);
  const [functionalPreferences, setFunctionalPreferences] = useState(false);

  useEffect(() => {
    if (isPreferencesModalOpen) {
      setSentinelTelemetry(preferences.sentinelTelemetry);
      setFunctionalPreferences(preferences.functionalPreferences);
    }
  }, [isPreferencesModalOpen, preferences]);

  if (!isPreferencesModalOpen) {
    return null;
  }

  const handleSave = () => {
    saveCustom({ sentinelTelemetry, functionalPreferences });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#E8EAED] bg-white p-6 shadow-2xl text-[#111111]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E8EAED]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#22A06B]" />
              <h2 id="cookie-modal-title" className="text-lg font-semibold tracking-tight text-[#111111]">
                Cookie &amp; Storage Preferences
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#5F6368]">
              Control how Cadence uses client-side storage on your device.
            </p>
          </div>
          <button
            type="button"
            onClick={closePreferencesModal}
            aria-label="Close preferences"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F3F0] text-[#5F6368] hover:bg-[#E8EAED] hover:text-[#111111] transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Categories */}
        <div className="my-5 flex flex-col gap-4 text-xs">
          {/* Strictly Necessary */}
          <div className="rounded-xl border border-[#E8EAED] bg-[#F7F8FA] p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-sm text-[#111111]">Strictly Necessary Storage</span>
                <p className="mt-1 text-[#5F6368] leading-relaxed">
                  Required for EVM provider connections, session caching, and active network synchronization. Cannot be
                  disabled.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#E8EAED] px-2.5 py-1 text-[11px] font-medium text-[#5F6368]">
                Always Active
              </span>
            </div>
          </div>

          {/* Sentinel Health Telemetry */}
          <div className="rounded-xl border border-[#E8EAED] bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="font-semibold text-sm text-[#111111]">Sentinel Health Telemetry</span>
                <p className="mt-1 text-[#5F6368] leading-relaxed">
                  Allows anonymous health checks with the decentralized sentinel daemon to monitor proof-of-life countdowns and
                  grace period alerts.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sentinelTelemetry}
                onClick={() => setSentinelTelemetry(!sentinelTelemetry)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sentinelTelemetry ? "bg-[#111111]" : "bg-[#D9DCE1]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    sentinelTelemetry ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Functional Preferences */}
          <div className="rounded-xl border border-[#E8EAED] bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="font-semibold text-sm text-[#111111]">Functional UI Preferences</span>
                <p className="mt-1 text-[#5F6368] leading-relaxed">
                  Remembers your preferred asset denominations (USDG vs ETH), dashboard layout density, and network explorer
                  shortcuts.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={functionalPreferences}
                onClick={() => setFunctionalPreferences(!functionalPreferences)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  functionalPreferences ? "bg-[#111111]" : "bg-[#D9DCE1]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    functionalPreferences ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E8EAED]">
          <Link
            href="/privacy"
            onClick={closePreferencesModal}
            className="text-xs text-[#5F6368] hover:text-[#111111] underline underline-offset-4"
          >
            Review Privacy Policy
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-full bg-[#F4F3F0] px-4 py-2 text-xs font-medium text-[#111111] hover:bg-[#E8EAED] transition-colors cursor-pointer"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-[#111111] px-4 py-2 text-xs font-medium text-white hover:bg-black transition-colors cursor-pointer shadow-xs"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
