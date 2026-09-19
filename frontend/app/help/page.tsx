"use client";

import React from "react";
import AppShell from "../../components/AppShell";
import HelpCenterPanel from "../../components/HelpCenterPanel";

export default function HelpPage() {
  return (
    <AppShell activeTab="Help">
      <HelpCenterPanel />
    </AppShell>
  );
}
