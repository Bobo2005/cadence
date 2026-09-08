"use client";

import React from "react";
import AppShell from "../../components/AppShell";
import AuthGuard from "../../components/AuthGuard";
import ContestWindowPanel from "../../components/ContestWindowPanel";

export default function ContestPage() {
  return (
    <AppShell activeTab="Contest">
      <AuthGuard>
        <ContestWindowPanel />
      </AuthGuard>
    </AppShell>
  );
}
