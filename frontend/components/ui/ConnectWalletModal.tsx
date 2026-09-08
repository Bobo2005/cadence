"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useConnect, useAccount } from "wagmi";
import CadenceLogo from "./CadenceLogo";
import { DEMO_WALLETS } from "../../lib/wagmi";

interface WalletModalContextType {
  isOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
}

const WalletModalContext = createContext<WalletModalContextType>({
  isOpen: false,
  openWalletModal: () => {},
  closeWalletModal: () => {},
});

export function useWalletModal() {
  return useContext(WalletModalContext);
}

export function WalletModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openWalletModal = () => setIsOpen(true);
  const closeWalletModal = () => setIsOpen(false);

  return (
    <WalletModalContext.Provider value={{ isOpen, openWalletModal, closeWalletModal }}>
      {children}
      {isOpen && <ConnectWalletModal onClose={closeWalletModal} />}
    </WalletModalContext.Provider>
  );
}

export function ConnectWalletModal({ onClose }: { onClose: () => void }) {
  const { connectors, connect, isPending, error } = useConnect();
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"injected" | "demo">("injected");

  // Automatically close on successful connection
  useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected, onClose]);

  const injectedConnector = connectors.find((c) => c.id === "injected");
  const mockConnector = connectors.find((c) => c.id === "mock");
  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect");

  const handleConnectInjected = () => {
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const handleConnectMock = (targetPersonaId?: string) => {
    const personaConnector =
      (targetPersonaId && connectors.find((c) => c.id === `mock-${targetPersonaId}`)) ||
      mockConnector;
    if (personaConnector) {
      connect({
        connector: personaConnector,
      });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-2xl relative text-left font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8993A6] hover:text-[#E8ECF1] transition-colors p-1 rounded-lg hover:bg-[#1A1F2B]"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-[#0A0E14] border border-[#232838]">
            <CadenceLogo size={28} showWordmark={false} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#E8ECF1] tracking-tight">Connect to Cadence</h3>
            <p className="text-xs text-[#8993A6]">Select your wallet on Ethereum Sepolia</p>
          </div>
        </div>

        {/* Tab switcher: Browser Extension vs Demo Personas */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0A0E14] border border-[#232838] mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("injected")}
            className={`py-2 rounded-lg transition-all text-center ${
              activeTab === "injected"
                ? "bg-[#1A1F2B] text-[#2EE6A8] shadow-sm font-semibold"
                : "text-[#8993A6] hover:text-[#E8ECF1]"
            }`}
          >
            Browser Wallet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("demo")}
            className={`py-2 rounded-lg transition-all text-center ${
              activeTab === "demo"
                ? "bg-[#1A1F2B] text-[#2EE6A8] shadow-sm font-semibold"
                : "text-[#8993A6] hover:text-[#E8ECF1]"
            }`}
          >
            Demo Personas
          </button>
        </div>

        {/* Tab 1: Browser Extension (MetaMask / Injected / WalletConnect) */}
        {activeTab === "injected" && (
          <div className="space-y-3">
            <button
              type="button"
              disabled={isPending}
              onClick={handleConnectInjected}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#1A1F2B]/60 border border-[#232838] hover:border-[#2EE6A8]/50 hover:bg-[#1A1F2B] transition-all group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0A0E14] border border-[#232838] flex items-center justify-center text-lg">
                  🦊
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#E8ECF1] group-hover:text-[#2EE6A8] transition-colors">
                    MetaMask / Injected
                  </div>
                  <div className="text-[11px] text-[#8993A6]">
                    Connect installed browser extension
                  </div>
                </div>
              </div>
              <svg className="w-4 h-4 text-[#8993A6] group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {walletConnectConnector && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => connect({ connector: walletConnectConnector })}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#1A1F2B]/60 border border-[#232838] hover:border-[#2EE6A8]/50 hover:bg-[#1A1F2B] transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0A0E14] border border-[#232838] flex items-center justify-center text-lg">
                    📱
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#E8ECF1] group-hover:text-[#2EE6A8] transition-colors">
                      WalletConnect
                    </div>
                    <div className="text-[11px] text-[#8993A6]">
                      Scan QR with mobile wallet
                    </div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-[#8993A6] group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <div className="p-3 rounded-xl bg-[#0A0E14]/70 border border-[#232838] text-[11px] text-[#8993A6] leading-relaxed">
              <span className="text-[#2EE6A8] font-semibold">Sepolia Required:</span> Ensure your wallet network is set to Ethereum Sepolia Testnet (Chain ID 11155111).
            </div>
          </div>
        )}

        {/* Tab 2: Demo / Presentation Personas */}
        {activeTab === "demo" && (
          <div className="space-y-2">
            <p className="text-[11px] text-[#8993A6] mb-2">
              Select a pre-configured protocol persona to test without needing a browser extension:
            </p>
            {DEMO_WALLETS.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                disabled={isPending}
                onClick={() => handleConnectMock(wallet.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1A1F2B]/40 border border-[#232838] hover:border-[#2EE6A8]/40 hover:bg-[#1A1F2B] transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-semibold text-[#E8ECF1]">{wallet.label}</div>
                  <div className="text-[10px] font-mono text-[#8993A6]">
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A0E14] border border-[#232838] text-[#2EE6A8]">
                  {wallet.role}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Error message display if connection fails */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#F5484A]/10 border border-[#F5484A]/30 text-xs text-[#F5484A] flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="space-y-1">
              <div className="font-semibold">Connection Error</div>
              <div className="text-[11px] leading-relaxed text-[#F5484A]/90">
                {error.message.includes("Connector not found") || error.message.includes("not found")
                  ? "No Web3 wallet extension detected in this browser. Try MetaMask or choose a Demo Persona above."
                  : error.message}
              </div>
            </div>
          </div>
        )}

        {/* Pending Spinner */}
        {isPending && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-[#2EE6A8]">
            <svg className="animate-spin h-4 w-4 text-[#2EE6A8]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Awaiting signature in wallet...</span>
          </div>
        )}
      </div>
    </div>
  );
}
