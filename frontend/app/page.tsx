"use client";

import React from "react";
import PublicNavbar from "@/components/landing/PublicNavbar";
import EditorialHero from "@/components/landing/EditorialHero";
import EditorialProductPreview from "@/components/landing/EditorialProductPreview";
import EditorialSecuritySection from "@/components/landing/EditorialSecuritySection";
import EditorialFinalCTA from "@/components/landing/EditorialFinalCTA";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#111111] selection:bg-[#7C5CFF]/15 selection:text-[#111111] font-sans">
      {/* Clean centered public navigation bar */}
      <PublicNavbar />

      <main>
        {/* Editorial Hero with floating live product UI composition and feature callouts */}
        <EditorialHero />

        {/* Large white product panel displaying authenticated telemetry dashboard */}
        <EditorialProductPreview />

        {/* Spacious two-column cryptographic security explanation */}
        <EditorialSecuritySection />

        {/* Final CTA panel and public footer */}
        <EditorialFinalCTA />
      </main>
    </div>
  );
}
