"use client";

import React, { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import CadenceLogo from "./ui/CadenceLogo";
import { useWalletModal } from "./ui/ConnectWalletModal";

interface AuthGuardProps {
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const { openWalletModal } = useWalletModal();
  const router = useRouter();
  const hasMounted = useHasMounted();

  // During SSR or initial hydration wait
  if (!hasMounted) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-[#8993A6]">
          <svg className="animate-spin h-4 w-4 text-[#2EE6A8]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Initializing protocol state...</span>
        </div>
      </div>
    );
  }

  // If disconnected: show Connect Wallet screen instead of rendering dummy data
  if (!isConnected && !isConnecting && !isReconnecting) {
    return (
      <div className="w-full max-w-lg mx-auto my-12 p-8 rounded-2xl bg-[#12161F] border border-[#232838] shadow-2xl text-center space-y-6 animate-in fade-in duration-200">
        <div className="inline-flex p-3 rounded-2xl bg-[#0A0E14] border border-[#232838] shadow-[0_0_20px_rgba(46,230,168,0.1)]">
          <CadenceLogo size={40} showWordmark={false} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#E8ECF1]">Wallet Connection Required</h2>
          <p className="text-xs text-[#8993A6] max-w-sm mx-auto leading-relaxed">
            This protocol screen requires an active Ethereum Sepolia connection to load cryptographic commitments and guardian status.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={openWalletModal}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-[#2EE6A8] text-[#0A0E14] hover:bg-[#3bf5b6] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(46,230,168,0.3)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m4-5h-7a1 1 0 00-1 1v2a1 1 0 001 1h7a1 1 0 001-1v-2a1 1 0 00-1-1zm-3 2h.01" />
            </svg>
            <span>Connect Wallet to Begin</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-mono text-xs text-[#8993A6] hover:text-[#E8ECF1] hover:bg-[#1A1F2B] transition-colors border border-[#232838] cursor-pointer"
          >
            Return to Landing
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
