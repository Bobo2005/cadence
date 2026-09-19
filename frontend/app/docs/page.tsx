"use client";

import React from "react";
import AppShell from "../../components/AppShell";
import HelpCenterPanel from "../../components/HelpCenterPanel";

export default function DocsPage() {
  return (
    <AppShell activeTab="Help">
      <HelpCenterPanel />
    </AppShell>
  );
}
