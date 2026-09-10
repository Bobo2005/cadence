"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CadenceLogo from "./ui/CadenceLogo";

import { useAccount, useDisconnect, useConnect, useSwitchChain } from "wagmi";
import { useWalletModal } from "./ui/ConnectWalletModal";
import { useUserRole } from "../hooks/useUserRole";
import { publicClient } from "../lib/contracts";

export type NavTabId = "Dashboard" | "Create Vault" | "Contest" | "Claim Portal";

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: NavTabId;
}

export default function AppShell({ children, activeTab: propActiveTab }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Wagmi wallet state
  const { address, isConnected, isConnecting, isReconnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const { openWalletModal } = useWalletModal();
  const { isOwner, isBeneficiary, isGuardian, isNewUser, roleBadge, recommendedRoute } = useUserRole();

  const isWrongNetwork = Boolean(isConnected && chain && chain.id !== 11155111);

  // Determine active nav item from path or prop
  const currentTab: NavTabId = React.useMemo(() => {
    if (propActiveTab) return propActiveTab;
    if (pathname?.startsWith("/vault/create")) return "Create Vault";
    if (pathname?.startsWith("/contest")) return "Contest";
    if (pathname?.startsWith("/claim")) return "Claim Portal";
    if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/vault")) return "Dashboard";
    return "Dashboard";
  }, [pathname, propActiveTab]);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [isRpcSynced, setIsRpcSynced] = useState<boolean>(true);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Live polling of on-chain Sepolia block height
  useEffect(() => {
    let isMounted = true;
    const fetchBlock = async () => {
      try {
        const bn = await publicClient.getBlockNumber();
        if (isMounted) {
          setBlockNumber(bn);
          setIsRpcSynced(true);
        }
      } catch {
        if (isMounted) setIsRpcSynced(false);
      }
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    disconnect();
    router.push("/");
  };

  // Truncated format matching reference: 0x71C...8b2
  const formattedAddress = address
    ? `${address.slice(0, 5)}...${address.slice(-3)}`
    : "Connect Wallet";

  const navItems: { id: NavTabId; label: string; href: string; badge?: string; icon: React.ReactNode }[] = [
    {
      id: "Dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "Create Vault",
      label: "Create Vault",
      href: "/vault/create",
      badge: isNewUser ? "Start" : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "Contest",
      label: "Contest",
      href: "/contest",
      badge: isGuardian && !isOwner ? "Active" : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: "Claim Portal",
      label: "Claim Portal",
      href: "/claim",
      badge: isBeneficiary && !isOwner ? "Eligible" : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#E8ECF1] flex flex-col font-sans selection:bg-[#2EE6A8]/20 selection:text-[#2EE6A8]">

      {/* ========================================================================= */}
      {/* PERSISTENT TOP BAR (Matches reference screens 2, 3, 4, 5)                  */}
      {/* ========================================================================= */}
      <header className="h-[68px] border-b border-[#1E2330] bg-[#0A0E14]/95 backdrop-blur sticky top-0 z-40 px-6 flex items-center justify-between">
        {/* Left: Logo + Wordmark */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
        >
          <CadenceLogo size={30} showWordmark={true} wordmarkClassName="text-base font-black tracking-widest text-[#E8ECF1]" />
        </Link>

        {/* Center: Horizontal Nav with active dot indicator */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex flex-col items-center py-1 transition-colors relative"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isActive
                        ? "text-[#2EE6A8] font-semibold"
                        : "text-[#8993A6] group-hover:text-[#E8ECF1]"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#2EE6A8]/10 text-[#2EE6A8] font-semibold">
                      {item.badge}
                    </span>
                  )}
                </div>
                {/* Active Indicator Dot under text matching reference mockups */}
                <span
                  className={`w-1 h-1 rounded-full mt-1 transition-all ${
                    isActive ? "bg-[#2EE6A8] shadow-[0_0_6px_#2EE6A8]" : "bg-transparent opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right: Connected Wallet Pill & Network Guard */}
        <div className="flex items-center gap-3">
          {isWrongNetwork && (
            <button
              type="button"
              onClick={() => switchChain?.({ chainId: 11155111 })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/50 hover:bg-[#EF4444]/25 transition-all text-xs font-mono text-[#EF4444] cursor-pointer animate-pulse"
              title="Click to switch your wallet network to Ethereum Sepolia"
            >
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span>Switch to Sepolia</span>
            </button>
          )}

          <div className="relative" ref={accountMenuRef}>
          {isConnected ? (
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12161F] border border-[#232838] hover:border-[#2EE6A8]/40 transition-all text-xs font-mono text-[#E8ECF1] cursor-pointer"
              title="Click to view account"
            >
              <span className="w-2 h-2 rounded-full bg-[#2EE6A8] shadow-[0_0_8px_#2EE6A8] animate-pulse" />
              <span>{formattedAddress}</span>
              <span className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-[#1A1F2B] border border-[#232838] text-[#2EE6A8]">
                {roleBadge}
              </span>
              <svg
                className={`w-3 h-3 text-[#8993A6] transition-transform ${
                  isAccountMenuOpen ? "rotate-180" : ""
                }`}
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
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12161F] border border-[#F5B841]/40 text-xs font-mono text-[#F5B841]"
            >
              <span className="w-2 h-2 rounded-full bg-[#F5B841] animate-pulse" />
              <span>Connecting...</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openWalletModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12161F] border border-[#2EE6A8]/40 hover:bg-[#1A1F2B] hover:border-[#2EE6A8] transition-all text-xs font-mono text-[#2EE6A8] cursor-pointer shadow-[0_0_12px_rgba(46,230,168,0.15)]"
            >
              <span className="w-2 h-2 rounded-full bg-[#8993A6]" />
              <span>Connect Wallet</span>
            </button>
          )}

          {/* Connected Account & Account Switcher Dropdown */}
          {isConnected && isAccountMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#12161F] border border-[#232838] shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
              <div className="px-4 py-2.5 border-b border-[#232838] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8993A6]">
                    Connected Account
                  </span>
                  {isWrongNetwork ? (
                    <button
                      type="button"
                      onClick={() => switchChain?.({ chainId: 11155111 })}
                      className="text-[10px] font-mono text-[#EF4444] bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      title="Click to switch to Ethereum Sepolia"
                    >
                      ⚠️ Switch to Sepolia
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-[#2EE6A8] bg-[#2EE6A8]/10 px-2 py-0.5 rounded">
                      Sepolia Testnet
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[#E8ECF1] truncate">
                    {address}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="p-1 text-[#8993A6] hover:text-[#2EE6A8] transition-colors rounded hover:bg-[#1A1F2B]"
                    title="Copy Address"
                  >
                    {copied ? (
                      <span className="text-[10px] text-[#2EE6A8] font-mono">Copied!</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-[#8993A6]">Detected Role:</span>
                  <span className="font-mono text-[#2EE6A8] font-semibold bg-[#2EE6A8]/10 px-2 py-0.5 rounded text-[11px]">
                    {roleBadge}
                  </span>
                </div>
                {recommendedRoute && pathname !== recommendedRoute && (
                  <div className="pt-1.5 border-t border-[#232838]/60 flex items-center justify-between">
                    <span className="text-[10px] text-[#8993A6]">Recommended:</span>
                    <Link
                      href={recommendedRoute}
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="text-[10px] font-mono text-[#2EE6A8] hover:underline"
                    >
                      {recommendedRoute === "/vault/create" ? "Create Locker →" : recommendedRoute === "/claim" ? "Claim Portal →" : recommendedRoute === "/contest" ? "Contest Window →" : "Dashboard →"}
                    </Link>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#232838] px-4 py-1.5 flex items-center justify-between text-[11px]">
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8993A6] hover:text-[#2EE6A8] transition-colors flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Explorer</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-[#F5484A] hover:underline font-mono text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

      {/* ========================================================================= */}
      {/* MAIN LAYOUT: PERSISTENT SIDEBAR + CONTENT AREA                             */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 border-r border-[#1E2330] bg-[#0A0E14] flex flex-col justify-between p-4 hidden md:flex">
          <div className="space-y-6">
            {/* Header label */}
            <div className="px-3 pt-2">
              <span className="text-[10px] font-bold tracking-[0.14em] text-[#8993A6] uppercase font-sans">
                PROTOCOL NAVIGATION
              </span>
            </div>

            {/* Sidebar nav items */}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#1A1F2B] border border-[#232838] text-[#E8ECF1] shadow-sm"
                        : "text-[#8993A6] hover:text-[#E8ECF1] hover:bg-[#12161F]/60"
                    }`}
                  >
                    <span
                      className={`transition-colors ${
                        isActive
                          ? "text-[#2EE6A8]"
                          : "text-[#8993A6] group-hover:text-[#E8ECF1]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3">
            {/* Bottom Protocol Status Footer in Sidebar: Live Sepolia Block Sync & Dynamic Status */}
            <div className="p-3 rounded-xl bg-[#12161F] border border-[#232838] text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#8993A6]">Consensus:</span>
                <span className={`flex items-center gap-1.5 ${isRpcSynced ? "text-[#2EE6A8]" : "text-[#EF4444]"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRpcSynced ? "bg-[#2EE6A8] animate-ping" : "bg-[#EF4444]"}`} />
                  {blockNumber ? `Synced #${blockNumber.toString()}` : isRpcSynced ? "Connecting..." : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8993A6]">
                <span>Heartbeat:</span>
                <span className={!isConnected ? "text-[#8993A6]" : "text-[#2EE6A8]"}>
                  {!isConnected ? "Standby" : "Active"}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto bg-[#0A0E14]">
          {children}
        </main>
      </div>

    </div>
  );
}
