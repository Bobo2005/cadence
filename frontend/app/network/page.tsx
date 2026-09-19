"use client";

import React from "react";
import AppShell from "../../components/AppShell";
import NetworkStatusPanel from "../../components/NetworkStatusPanel";

export default function NetworkPage() {
  return (
    <AppShell activeTab="Network">
      <NetworkStatusPanel />
    </AppShell>
  );
}
