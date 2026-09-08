"use client";

import React from "react";
import AppShell from "../../components/AppShell";
import AuthGuard from "../../components/AuthGuard";
import ClaimPortal from "../../components/ClaimPortal";

export default function ClaimPage() {
  return (
    <AppShell activeTab="Claim Portal">
      <AuthGuard>
        <ClaimPortal />
      </AuthGuard>
    </AppShell>
  );
}
