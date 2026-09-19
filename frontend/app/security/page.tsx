"use client";

import React from "react";
import AppShell from "../../components/AppShell";
import SecurityProtocolPanel from "../../components/SecurityProtocolPanel";

export default function SecurityPage() {
  return (
    <AppShell activeTab="Security">
      <SecurityProtocolPanel />
    </AppShell>
  );
}
