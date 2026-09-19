"use client";

import React, { useState } from "react";
import AppShell from "../../components/AppShell";
import {
  LoadingSkeleton,
  WalletDisconnectedState,
  NetworkMismatchState,
  TransactionPendingState,
  SuccessConfirmationState,
  FailureRecoveryState,
  EmptyClaimState,
} from "../../components/ui/GlobalStates";
import Tabs from "../../components/ui/Tabs";

export default function GlobalStatesShowcasePage() {
  const [activeState, setActiveState] = useState("all");

  const stateTabs = [
    { id: "all", label: "ALL STATES" },
    { id: "loading", label: "01 LOADING" },
    { id: "disconnected", label: "02 WALLET DISCONNECTED" },
    { id: "wrong-network", label: "03 WRONG NETWORK" },
    { id: "pending", label: "04 TRANSACTION PENDING" },
    { id: "success", label: "05 SUCCESS" },
    { id: "failure", label: "06 FAILURE" },
    { id: "empty", label: "07 EMPTY CLAIM STATE" },
  ];

  return (
    <AppShell activeTab="Global States">
      <div className="space-y-8 pb-16 font-sans">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#8A8F98]">
            <span>DESIGN SYSTEM AUDIT</span>
            <span>·</span>
            <span className="text-[#22A06B] font-semibold">PAGE 12: GLOBAL STATES</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            Standardized Global States
          </h1>
          <p className="text-base sm:text-lg text-[#5F6368] max-w-3xl leading-relaxed">
            Consistent system states implemented across Cadence: light shimmer skeletons, connection gates, network mismatch alerts, pending confirmations, success, failure recovery, and empty claim displays.
          </p>
        </div>

        {/* State Filter Tabs */}
        <Tabs
          tabs={stateTabs}
          activeTabId={activeState}
          onChange={setActiveState}
        />

        {/* State Displays */}
        <div className="space-y-12 pt-4">
          {/* 1. LOADING SKELETON */}
          {(activeState === "all" || activeState === "loading") && (
            <section className="space-y-3">
              <div className="text-xs font-mono font-bold text-[#8A8F98] uppercase tracking-wider">
                01 · LOADING (LIGHT SKELETON & RESTRAINED SHIMMER — ZERO DARK LOADING SCREENS)
              </div>
              <LoadingSkeleton
                label="Synchronizing Merkle proof inclusion leaves from Sepolia..."
                rows={4}
              />
            </section>
          )}

          {/* 2. WALLET DISCONNECTED */}
          {(activeState === "all" || activeState === "disconnected") && (
            <section className="space-y-3">
              <div className="text-xs font-mono font-bold text-[#8A8F98] uppercase tracking-wider">
                02 · WALLET DISCONNECTED (EXACT TEXT: CONNECT WALLET)
              </div>
              <WalletDisconnectedState
                title="CONNECT WALLET"
                description="Connect your Ethereum wallet to inspect active Lockers, sign stealth heartbeat renewals, or decrypt inheritance shares."
              />
            </section>
          )}

          {/* 3. WRONG NETWORK */}
          {(activeState === "all" || activeState === "wrong-network") && (
            <section className="space-y-3">
              <div className="text-xs font-mono font-bold text-[#8A8F98] uppercase tracking-wider">
                03 · WRONG NETWORK (EXACT TEXT: NETWORK MISMATCH / Cadence currently requires Sepolia. / [ SWITCH NETWORK ])
              </div>
              <NetworkMismatchState
                targetNetworkName="Sepolia"
                onSwitchNetwork={() => alert("Simulated switch to Ethereum Sepolia")}
              />
            </section>
          )}

          {/* 4. TRANSACTION PENDING */}
          {(activeState === "all" || activeState === "pending") && (
            <section className="space-y-3">
              <div className="text-xs font-mono font-bold text-[#8A8F98] uppercase tracking-wider">
                04 · TRANSACTION PENDING (EXACT TEXT: TRANSACTION PENDING / AWAITING NETWORK CONFIRMATION)
              </div>
              <TransactionPendingState
                actionTitle="Relaying EIP-712 stealth reset signature to ProofOfLifeConsensus..."
                txHash="0x8f4b23c91a0293847562819203948572615243bcdaef01928374650192837465"
                onCancel={() => alert("Dismissed")}
              />
            </section>
          )}

          {/* 5. SUCCESS */}
          {(activeState === "all" || activeState === "success") && (
            <section className="space-y-3">
              <div className="text-xs font-mono font-bold text-[#8A8F98] uppercase tracking-wider">
                05 · SUCCESS (WHITE SURFACE + SUCCESS ACCENT + EXPLICIT CONFIRMATION)
              </div>
              <SuccessConfirmationState
                title="INHERITANCE CLAIM SETTLED"
                amount="0.8400 ETH"
                recipient="0x7099...79C8"
                txHash="0x4b78c902e817a94df6b18923a9d182740bc189283749021a8b92817409281234"
                actionText="RETURN TO CLAIM PORTAL"
                actionHref="/claim"
              />
            </section>
          )}

          {/* 6. FAILURE */}
          {(activeState === "all" || activeState === "failure") && (
            <section className="space-y-3">
              <div className="text-xs font-mono font-bold text-[#8A8F98] uppercase tracking-wider">
                06 · FAILURE (PALE ERROR SURFACE + EXPLANATION + RECOVERY ACTION)
              </div>
              <FailureRecoveryState
                title="Attestation Quorum Unmet"
                errorMessage="Execution reverted on Sepolia: Insufficient guardian signatures (1/2 received). Please await sentinel sync before submitting challenge."
                recoveryActionText="RETRY ON-CHAIN VERIFICATION"
                onRecoveryClick={() => alert("Retrying verification...")}
                secondaryActionText="Return to Dashboard"
                onSecondaryClick={() => alert("Returning to Dashboard...")}
              />
            </section>
          )}

          {/* 7. EMPTY CLAIM STATE */}
          {(activeState === "all" || activeState === "empty") && (
            <section className="space-y-3">
              <div className="text-xs font-mono font-bold text-[#8A8F98] uppercase tracking-wider">
                07 · EMPTY CLAIM STATE (EXACT TEXT: NO LOCKERS FOUND / No finalized inheritance allocations are associated with this wallet. — NO GENERIC ILLUSTRATION)
              </div>
              <EmptyClaimState
                connectedAddress="0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E"
                onSwitchPersona={(addr) => alert(`Switched persona to: ${addr}`)}
              />
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
