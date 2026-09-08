"use client";

import React, { useState } from "react";
import AppShell from "../../components/AppShell";
import AuthGuard from "../../components/AuthGuard";
import VaultPulseDashboard from "../../components/VaultPulseDashboard";
import DashboardEmptyState from "../../components/DashboardEmptyState";
import { useUserRole } from "../../hooks/useUserRole";
import { type Address } from "viem";

function DashboardContent() {
  const { isOwner, isNewUser, ownedVaults, beneficiaryVaults, guardianVaults, isLoading } = useUserRole();
  const [selectedVaultAddress, setSelectedVaultAddress] = useState<Address | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[22px] bg-[#12161F] border border-[#232838] p-10 flex flex-col items-center justify-center min-h-[300px] space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#2EE6A8] border-t-transparent animate-spin" />
          <div className="text-xs font-mono text-[#8993A6] tracking-wider uppercase">
            Scanning on-chain locker registries...
          </div>
        </div>
      </div>
    );
  }

  // If the connected user is a new user or has zero owned vaults, show genuine empty state
  if (isNewUser || (!isOwner && ownedVaults.length === 0) || ownedVaults.length === 0) {
    return (
      <DashboardEmptyState
        beneficiaryVaults={beneficiaryVaults}
        guardianVaults={guardianVaults}
      />
    );
  }

  // Owner view: Render real on-chain active locker pulse dashboard
  return (
    <VaultPulseDashboard
      initialVaultAddress={selectedVaultAddress || ownedVaults[0]?.vaultAddress}
      ownedVaults={ownedVaults}
      onSelectVault={(addr) => setSelectedVaultAddress(addr)}
    />
  );
}

export default function DashboardPage() {
  return (
    <AppShell activeTab="Dashboard">
      <AuthGuard>
        <DashboardContent />
      </AuthGuard>
    </AppShell>
  );
}
