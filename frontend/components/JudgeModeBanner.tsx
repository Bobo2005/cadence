"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { DEMO_WALLETS } from "../lib/wagmi";
import { CADENCE_VAULT_ADDRESS, DEMO_VAULT_ADDRESS } from "../lib/contracts";
import { useToast } from "./ToastProvider";
import HowItWorksModal from "./HowItWorksModal";

// Pre-funded or standard test keys for hackathon judges testing via MetaMask / CLI
const TEST_KEYS = [
  {
    role: "Owner (Deployer)",
    address: "0xC09C394336D4Ed967B70a4C1C1110493673f77e4",
    privateKey: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
  },
  {
    role: "Alice (Beneficiary 1 - 40%)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    role: "Bob (Beneficiary 2 - 60%)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    role: "Guardian Node 1",
    address: "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  {
    role: "Guardian Node 2",
    address: "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0",
    privateKey: "0x47e179ec346fe3a7a40ffb0ec6d8e371a52916a9d82454f112eed61deb9de146",
  },
];

const SEPOLIA_FAUCETS = [
  { name: "Google Cloud Web3 Faucet", url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
  { name: "Alchemy Sepolia Faucet", url: "https://sepoliafaucet.com/" },
  { name: "Infura Sepolia Faucet", url: "https://www.infura.io/faucet/sepolia" },
  { name: "Ethereum Ecosystem Faucet", url: "https://sepolia-faucet.pk910.de/" },
];

export default function JudgeModeBanner() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { addToast } = useToast();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isKeysDrawerOpen, setIsKeysDrawerOpen] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [selectedVault, setSelectedVault] = useState<"standard" | "demo">("standard");

  // Load persistent preference
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("cadence_judge_bar_collapsed");
    if (savedCollapsed === "true") {
      setIsCollapsed(true);
    }
    const savedVault = localStorage.getItem("cadence_selected_vault");
    if (savedVault === "demo" || savedVault === "standard") {
      setSelectedVault(savedVault);
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("cadence_judge_bar_collapsed", String(nextState));
  };

  const handleSelectVault = (vaultType: "standard" | "demo") => {
    setSelectedVault(vaultType);
    localStorage.setItem("cadence_selected_vault", vaultType);
    window.dispatchEvent(new CustomEvent("cadence_vault_changed", { detail: vaultType }));
    addToast({
      title: vaultType === "standard" ? "Main Locker (90d Cadence)" : "Fast Demo Locker (5m Test Interval)",
      description: `Active contract: ${vaultType === "standard" ? CADENCE_VAULT_ADDRESS.slice(0, 8) + "..." : DEMO_VAULT_ADDRESS.slice(0, 8) + "..."}`,
      type: "info",
    });
  };

  const handleSwitchPersona = (personaId: string, label: string, personaAddress: string) => {
    const connector =
      connectors.find((c) => c.id === `mock-${personaId}`) ||
      connectors.find((c) => c.id === "mock");

    if (connector) {
      connect({ connector });
      addToast({
        title: `Switched Persona: ${label}`,
        description: `Connected: ${personaAddress.slice(0, 6)}...${personaAddress.slice(-4)}`,
        type: "success",
      });
    } else {
      addToast({
        title: `Persona Connector Unavailable`,
        description: `Please connect using wallet modal.`,
        type: "warning",
      });
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast({
      title: "Copied to Clipboard",
      description: `${label}: ${text.slice(0, 10)}...`,
      type: "success",
      duration: 3000,
    });
  };

  return (
    <>
      {/* If Collapsed: Sleek Floating Top Badge */}
      {isCollapsed ? (
        <aside aria-label="Judge fast track minimized badge" className="fixed top-2 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12161F]/90 backdrop-blur-md border border-[#2EE6A8]/40 hover:border-[#2EE6A8] shadow-[0_0_20px_rgba(46,230,168,0.2)] text-xs font-mono text-[#E8ECF1] transition-all hover:scale-105 cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-[#2EE6A8] shadow-[0_0_8px_#2EE6A8] animate-pulse" />
            <span className="text-[#2EE6A8] font-bold">⚡ Judge Fast-Track</span>
            <span className="text-[10px] text-[#8993A6] group-hover:text-[#E8ECF1]">Expand ▾</span>
          </button>
        </aside>
      ) : (
        /* If Expanded: Sticky Neon-Accented Demo Bar */
        <aside aria-label="Judge Fast-Track Bar" className="sticky top-0 z-50 w-full bg-[#0E121B] border-b border-[#2EE6A8]/25 shadow-[0_4px_24px_rgba(0,0,0,0.5)] text-[#E8ECF1] px-4 py-2 text-xs transition-all">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Left: Judge Title & Fast Persona Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#2EE6A8]/10 border border-[#2EE6A8]/30 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2EE6A8] animate-ping" />
                <span className="font-mono text-[11px] font-bold tracking-wider text-[#2EE6A8] uppercase">
                  Judge Fast-Track
                </span>
              </div>

              {/* Persona Switcher Pills */}
              <div className="flex items-center gap-1 bg-[#0A0E14] p-0.5 rounded-xl border border-[#1E2330]">
                {DEMO_WALLETS.map((p) => {
                  const isCurrent = isConnected && address?.toLowerCase() === p.address.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSwitchPersona(p.id, p.label, p.address)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? "bg-[#2EE6A8] text-[#0A0E14] font-bold shadow-[0_0_12px_rgba(46,230,168,0.4)]"
                          : "text-[#8993A6] hover:text-[#E8ECF1] hover:bg-[#1A1F2B]"
                      }`}
                      title={`${p.label} (${p.role}) - ${p.address}`}
                    >
                      {isCurrent && <span className="w-1 h-1 rounded-full bg-[#0A0E14]" />}
                      <span>{p.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center: Locker Selector (Standard 90d vs Fast Demo 5m) */}
            <div className="flex items-center gap-1.5 bg-[#0A0E14] p-0.5 rounded-xl border border-[#1E2330]">
              <span className="text-[10px] font-mono text-[#8993A6] px-2 uppercase font-semibold">
                Locker:
              </span>
              <button
                type="button"
                onClick={() => handleSelectVault("standard")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors ${
                  selectedVault === "standard"
                    ? "bg-[#1A1F2B] text-[#2EE6A8] border border-[#2EE6A8]/30 font-semibold"
                    : "text-[#8993A6] hover:text-[#E8ECF1]"
                }`}
              >
                Standard (90d)
              </button>
              <button
                type="button"
                onClick={() => handleSelectVault("demo")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors ${
                  selectedVault === "demo"
                    ? "bg-[#1A1F2B] text-[#F5B841] border border-[#F5B841]/30 font-semibold"
                    : "text-[#8993A6] hover:text-[#E8ECF1]"
                }`}
                title="Accelerated 5-minute heartbeat interval for rapid testing"
              >
                Fast Demo (5m)
              </button>
            </div>

            {/* Right: Actions (How It Works Modal, Test Keys Drawer, Collapse) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-[#1A1F2B] border border-[#232838] hover:border-[#2EE6A8]/50 text-[#2EE6A8] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Architecture & Cryptography</span>
                <span className="font-mono text-[9px] bg-[#2EE6A8]/10 px-1 rounded text-[#2EE6A8]">3 Pillars</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsKeysDrawerOpen(!isKeysDrawerOpen)}
                  className="px-2.5 py-1 rounded-lg bg-[#12161F] border border-[#232838] hover:border-[#8993A6] text-[#E8ECF1] text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Keys & Faucets</span>
                  <span className="text-[10px]">{isKeysDrawerOpen ? "▴" : "▾"}</span>
                </button>

                {/* Keys & Faucets Drawer Dropdown */}
                {isKeysDrawerOpen && (
                  <div className="absolute right-0 mt-2 w-84 rounded-2xl bg-[#0F131C] border border-[#232838] shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-4 z-50 space-y-4 font-sans text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                      <span className="font-bold text-[#E8ECF1]">Test Accounts & Private Keys</span>
                      <button
                        type="button"
                        onClick={() => setIsKeysDrawerOpen(false)}
                        className="text-[#8993A6] hover:text-[#E8ECF1] text-xs p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] text-[#8993A6] leading-relaxed">
                        Pre-configured test personas for import into MetaMask or testing scripts:
                      </p>
                      {TEST_KEYS.map((k) => (
                        <div
                          key={k.role}
                          className="p-2 rounded-xl bg-[#0A0E14] border border-[#1E2330] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-[#E8ECF1] truncate">{k.role}</div>
                            <div className="font-mono text-[10px] text-[#8993A6] truncate">
                              {k.address.slice(0, 6)}...{k.address.slice(-4)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText(k.privateKey, `${k.role} Private Key`)}
                            className="px-2 py-1 rounded bg-[#1A1F2B] hover:bg-[#232838] text-[10px] font-mono text-[#2EE6A8] transition-colors shrink-0 cursor-pointer"
                          >
                            Copy Key
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#1E2330] space-y-2">
                      <span className="text-[11px] font-semibold text-[#E8ECF1]">Sepolia Faucets</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SEPOLIA_FAUCETS.map((f) => (
                          <a
                            key={f.name}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-[#0A0E14] border border-[#1E2330] hover:border-[#2EE6A8]/40 text-[10px] text-[#8993A6] hover:text-[#2EE6A8] truncate transition-colors"
                          >
                            {f.name} →
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Minimize bar button */}
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1 text-[#8993A6] hover:text-[#E8ECF1] hover:bg-[#1A1F2B] rounded-lg transition-colors cursor-pointer"
                title="Minimize Judge Bar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Interactive Cryptographic Architecture Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </>
  );
}
