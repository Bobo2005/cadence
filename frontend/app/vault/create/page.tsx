"use client";

import React from "react";
import AppShell from "../../../components/AppShell";
import AuthGuard from "../../../components/AuthGuard";
import CreateVaultForm from "../../../components/CreateVaultForm";

export default function CreateVaultPage() {
  return (
    <AppShell activeTab="Create Vault">
      <AuthGuard>
        <CreateVaultForm />
      </AuthGuard>
    </AppShell>
  );
}
