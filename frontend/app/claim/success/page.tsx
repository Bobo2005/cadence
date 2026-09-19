"use client";

import React, { Suspense } from "react";
import AppShell from "../../../components/AppShell";
import ClaimSuccessPanel from "../../../components/ClaimSuccessPanel";

export default function ClaimSuccessPage() {
  return (
    <AppShell activeTab="Claim Portal">
      <Suspense
        fallback={
          <div className="w-full h-96 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-mono text-[#5F6368]">
              <svg
                className="animate-spin h-4 w-4 text-[#111111]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading settlement record...</span>
            </div>
          </div>
        }
      >
        <ClaimSuccessPanel />
      </Suspense>
    </AppShell>
  );
}
