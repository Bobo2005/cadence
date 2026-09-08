"use client";

import React, { use } from "react";
import AppShell from "../../../components/AppShell";
import AuthGuard from "../../../components/AuthGuard";
import VaultPulseDashboard from "../../../components/VaultPulseDashboard";

/**
 * /vault/[id] — Vault Pulse Dashboard (hero screen) wrapped in persistent AppShell & AuthGuard
 */
export default function VaultDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <AppShell activeTab="Dashboard">
      <AuthGuard>
        <VaultPulseDashboard vaultId={resolvedParams.id} />
      </AuthGuard>
    </AppShell>
  );
}
