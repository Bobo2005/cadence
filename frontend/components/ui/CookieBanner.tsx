"use client";

import React from "react";
import Link from "next/link";
import { useCookieConsent } from "../../context/CookieContext";

export default function CookieBanner() {
  const { preferences, isMounted, acceptAll, rejectNonEssential, openPreferencesModal } = useCookieConsent();

  if (!isMounted || preferences.hasConsented) {
    return null;
  }

  return (
    <aside
      aria-label="Cookie and privacy consent"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-50"
    >
      <div className="bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-5 shadow-xl text-[#111111]">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#22A06B]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
              Privacy &amp; Client Storage
            </span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F4F3F0] text-[#5F6368]">
            Zero Tracking
          </span>
        </div>

        <p className="text-xs leading-relaxed text-[#5F6368] mb-4">
          Cadence uses essential local storage to cache RPC states and wallet sessions, plus optional telemetry for sentinel vault
          heartbeat monitoring. We never log your personal identity or store unencrypted heir data.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="inline-flex items-center justify-center rounded-full bg-[#111111] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-black cursor-pointer shadow-xs"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={rejectNonEssential}
            className="inline-flex items-center justify-center rounded-full bg-[#F4F3F0] px-4 py-2 text-xs font-medium text-[#111111] transition-colors hover:bg-[#E8EAED] cursor-pointer"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={openPreferencesModal}
            className="ml-auto text-xs text-[#5F6368] hover:text-[#111111] underline underline-offset-4 cursor-pointer transition-colors"
          >
            Customize
          </button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#E8EAED] flex items-center justify-between text-[11px] text-[#8A8F98]">
          <span>Self-custodial &amp; ECIES zero-leak</span>
          <Link href="/privacy" className="hover:text-[#111111] underline underline-offset-2">
            Read Policy
          </Link>
        </div>
      </div>
    </aside>
  );
}
