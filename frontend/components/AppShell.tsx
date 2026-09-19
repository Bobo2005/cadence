"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CadenceLogo from "./ui/CadenceLogo";

import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useWalletModal } from "./ui/ConnectWalletModal";
import { useUserRole } from "../hooks/useUserRole";
import { publicClient } from "../lib/contracts";

export type NavTabId = "Vault Pulse" | "Create Vault" | "Contest Window" | "Claim Portal" | "Network" | "Security" | "Help";

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: NavTabId | string;
}

export default function AppShell({ children, activeTab: propActiveTab }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { address, isConnected, isConnecting, isReconnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { openWalletModal } = useWalletModal();
  const { roleBadge, recommendedRoute } = useUserRole();

  const isWrongNetwork = Boolean(isConnected && chain && chain.id !== 11155111);

  // Determine current active tab
  const currentTab: NavTabId = React.useMemo(() => {
    if (propActiveTab === "Vault Pulse" || propActiveTab === "Dashboard") return "Vault Pulse";
    if (propActiveTab === "Create Vault") return "Create Vault";
    if (propActiveTab === "Contest Window" || propActiveTab === "Contest") return "Contest Window";
    if (propActiveTab === "Claim Portal") return "Claim Portal";
    if (propActiveTab === "Network") return "Network";
    if (propActiveTab === "Security") return "Security";
    if (propActiveTab === "Help" || propActiveTab === "Documentation") return "Help";

    if (pathname?.startsWith("/vault/create")) return "Create Vault";
    if (pathname?.startsWith("/contest")) return "Contest Window";
    if (pathname?.startsWith("/claim")) return "Claim Portal";
    if (pathname?.startsWith("/network")) return "Network";
    if (pathname?.startsWith("/security")) return "Security";
    if (pathname?.startsWith("/help") || pathname?.startsWith("/docs")) return "Help";
    return "Vault Pulse";
  }, [pathname, propActiveTab]);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(12);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Live polling of on-chain Sepolia block height
  useEffect(() => {
    let isMounted = true;
    const fetchBlock = async () => {
      try {
        const bn = await publicClient.getBlockNumber();
        if (isMounted) {
          setBlockNumber(bn);
          setSecondsAgo(0);
        }
      } catch {
        // Fallback
      }
    };
    fetchBlock();
    const pollInterval = setInterval(fetchBlock, 12000);
    const tickInterval = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, []);

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer on route change or Escape
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    disconnect();
    router.push("/");
  };

  const formattedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connect Wallet";

  const overviewNavItems = [
    {
      id: "Vault Pulse" as NavTabId,
      label: "Vault Pulse",
      href: "/dashboard",
    },
    {
      id: "Create Vault" as NavTabId,
      label: "Create Vault",
      href: "/vault/create",
    },
    {
      id: "Contest Window" as NavTabId,
      label: "Contest Window",
      href: "/contest",
    },
    {
      id: "Claim Portal" as NavTabId,
      label: "Claim Portal",
      href: "/claim",
    },
  ];

  const systemNavItems = [
    {
      id: "Help" as NavTabId,
      label: "Help & Docs",
      href: "/help",
      external: false,
    },
    {
      id: "Security" as NavTabId,
      label: "Security",
      href: "/security",
      external: false,
    },
    {
      id: "Network" as NavTabId,
      label: "Network",
      href: "/network",
      external: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111111] flex flex-col font-sans selection:bg-[#7C5CFF]/15 selection:text-[#111111]">
      {/* Top Header Bar */}
      <header className="h-16 bg-white border-b border-[#E8EAED] sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        {/* Left: Mobile menu toggle + Telemetry Network Pill */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            id="mobile-menu-drawer-toggle"
            type="button"
            className="md:hidden p-2 rounded-xl text-[#5F6368] hover:text-[#111111] hover:bg-[#F1F3F5] transition-colors cursor-pointer"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open mobile navigation drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Network and Sync Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E9F8F1] text-[#22A06B] font-mono font-medium text-xs">
              SEPOLIA
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#5F6368]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse" />
              <span className="hidden sm:inline">SYNCED {secondsAgo}s AGO</span>
              <span className="sm:hidden">{secondsAgo}s</span>
            </div>
            {blockNumber && (
              <span className="hidden lg:inline text-xs font-mono text-[#8A8F98]">
                #{blockNumber.toString()}
              </span>
            )}
          </div>
        </div>

        {/* Right: Wallet control & Account menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isWrongNetwork && (
            <button
              type="button"
              onClick={() => switchChain?.({ chainId: 11155111 })}
              className="px-2.5 sm:px-3 py-1 rounded-full bg-[#FDECEC] border border-[#D64545]/30 text-[11px] sm:text-xs font-medium text-[#D64545] hover:bg-[#FDECEC]/80 transition-colors"
            >
              Switch to Sepolia
            </button>
          )}

          <div className="relative" ref={accountMenuRef}>
            {isConnected ? (
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#F7F8FA] border border-[#E8EAED] hover:border-[#111111] transition-all text-xs font-mono text-[#111111] cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
                <span className="font-semibold">{formattedAddress}</span>
                <svg
                  className={`w-3.5 h-3.5 text-[#8A8F98] transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : isConnecting || isReconnecting ? (
              <button
                type="button"
                disabled
                className="px-3 sm:px-4 py-1.5 rounded-full bg-[#F7F8FA] border border-[#E8EAED] text-xs font-mono text-[#5F6368]"
              >
                Connecting...
              </button>
            ) : (
              <button
                type="button"
                onClick={openWalletModal}
                className="px-3.5 sm:px-4 py-1.5 rounded-full bg-[#111111] text-white text-xs font-medium hover:bg-black transition-colors cursor-pointer"
              >
                Connect Wallet
              </button>
            )}

            {/* Account dropdown */}
            {isConnected && isAccountMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E8EAED] shadow-xl py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 pb-3 border-b border-[#E8EAED] space-y-1">
                  <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider">
                    Connected Wallet
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[#111111] truncate">{address}</span>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-xs text-[#7C5CFF] hover:underline"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="text-[11px] text-[#5F6368] pt-1">
                    Role: <span className="font-semibold text-[#111111]">{roleBadge}</span>
                  </div>
                </div>

                {recommendedRoute && pathname !== recommendedRoute && (
                  <div className="px-4 py-2 border-b border-[#E8EAED]">
                    <Link
                      href={recommendedRoute}
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="text-xs text-[#7C5CFF] hover:underline flex items-center justify-between"
                    >
                      <span>Go to your recommended view</span>
                      <span>→</span>
                    </Link>
                  </div>
                )}

                <div className="px-4 pt-2.5 flex items-center justify-between text-xs">
                  <a
                    href={`https://sepolia.etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5F6368] hover:text-[#111111] transition-colors"
                  >
                    View on Etherscan
                  </a>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[#D64545] hover:underline font-medium cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="w-64 shrink-0 bg-white border-r border-[#E8EAED] p-6 hidden md:flex flex-col justify-between">
          <div className="space-y-8">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-[#F7F8FA] border border-[#E8EAED]">
                <CadenceLogo size={22} showWordmark={false} />
              </div>
              <span className="text-base font-bold tracking-tight text-[#111111]">
                CADENCE
              </span>
            </Link>

            {/* Section: OVERVIEW */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3">
                OVERVIEW
              </div>
              <nav className="space-y-1" aria-label="Overview navigation">
                {overviewNavItems.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                        isActive
                          ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                          : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Section: SYSTEM */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3">
                SYSTEM
              </div>
              <nav className="space-y-1" aria-label="System navigation">
                {systemNavItems.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                        isActive
                          ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                          : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer Status */}
          <div className="pt-6 border-t border-[#E8EAED] text-xs text-[#8A8F98] font-mono">
            <div>CADENCE PROTOCOL v1.0</div>
            <div className="mt-1 text-[11px] text-[#22A06B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
              HEALTHY HEARTBEAT
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* MOBILE NAVIGATION DRAWER (Page 11 Responsive Adaption)                     */}
        {/* ========================================================================= */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
            {/* Backdrop Blur Overlay */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Slide-out Drawer Panel */}
            <nav
              className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-left duration-250 p-6 space-y-6"
              aria-label="Mobile navigation drawer"
            >
              <div className="space-y-6">
                {/* 1. Cadence Logo & Close Action */}
                <div className="flex items-center justify-between border-b border-[#E8EAED] pb-4">
                  <Link
                    href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5"
                  >
                    <div className="p-1.5 rounded-xl bg-[#F7F8FA] border border-[#E8EAED]">
                      <CadenceLogo size={22} showWordmark={false} />
                    </div>
                    <span className="text-base font-bold tracking-tight text-[#111111]">
                      CADENCE
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-[#5F6368] hover:text-[#111111] hover:bg-[#F1F3F5] transition-colors"
                    aria-label="Close navigation drawer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 2. Mobile Network State */}
                <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98]">
                    NETWORK TELEMETRY
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
                      <span className="font-bold text-[#111111]">Sepolia (11155111)</span>
                    </div>
                    <span className="text-[#22A06B] font-medium">● SYNCED</span>
                  </div>
                  {blockNumber && (
                    <div className="text-[11px] font-mono text-[#5F6368]">
                      Block #{blockNumber.toString()} · {secondsAgo}s ago
                    </div>
                  )}
                </div>

                {/* 3. Mobile Wallet State */}
                <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F98]">
                    WALLET STATE
                  </div>
                  {isConnected ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-[#111111]">{formattedAddress}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0ECFF] text-[#7C5CFF] font-semibold">
                          {roleBadge}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          className="flex-1 py-1.5 rounded-lg bg-white border border-[#E8EAED] text-xs font-mono text-[#111111] hover:bg-[#F1F3F5] transition-colors text-center"
                        >
                          {copied ? "✓ Copied" : "Copy Address"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          className="py-1.5 px-3 rounded-lg bg-[#FDECEC] border border-[#D64545]/20 text-xs font-mono text-[#D64545] hover:bg-[#FDECEC]/80 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openWalletModal();
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-black transition-colors text-center cursor-pointer shadow-xs"
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>

                {/* 4. Navigation Links: Overview */}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3 pb-1">
                    OVERVIEW
                  </div>
                  {overviewNavItems.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                          isActive
                            ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                            : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                          }`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* 5. Navigation Links: System */}
                <div className="space-y-1 border-t border-[#E8EAED] pt-4">
                  <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3 pb-1">
                    SYSTEM
                  </div>
                  {systemNavItems.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                          isActive
                            ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                            : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                          }`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-[#E8EAED] text-xs text-[#8A8F98] font-mono">
                <div>CADENCE PROTOCOL v1.0</div>
                <div className="mt-1 text-[11px] text-[#22A06B] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
                  HEALTHY HEARTBEAT
                </div>
              </div>
            </nav>
          </div>
        )}

        {/* Main Spacious Workspace */}
        <main className="flex-1 min-w-0 bg-[#F7F8FA] p-4 sm:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

