"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useConnect, useAccount } from "wagmi";
import CadenceLogo from "./CadenceLogo";

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
  const modalRef = useRef<HTMLDivElement>(null);

  // Automatically close on successful connection
  useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected, onClose]);

  // Keyboard focus trap — keep Tab cycling inside modal
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    // Focus the first focusable element on open
    first?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const injectedConnector = connectors.find((c) => c.id === "injected");
  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect");

  const handleConnectInjected = () => {
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} className="w-full max-w-md rounded-2xl bg-[#12161F] border border-[#232838] p-6 shadow-2xl relative text-left font-sans">
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-[#0A0E14] border border-[#232838]">
            <CadenceLogo size={28} showWordmark={false} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#E8ECF1] tracking-tight">Connect Wallet</h3>
            <p className="text-xs text-[#8993A6]">Connect your Web3 wallet on Ethereum Sepolia</p>
          </div>
        </div>

        {/* Wallet Options */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleConnectInjected}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#1A1F2B]/60 border border-[#232838] hover:border-[#2EE6A8]/50 hover:bg-[#1A1F2B] transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0A0E14] border border-[#232838] flex items-center justify-center text-[#F6851B]">
                {/* MetaMask fox SVG icon */}
                <svg className="w-5 h-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32.9 1L19.3 10.7l2.4-5.7L32.9 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.1 1l13.5 9.8-2.3-5.8L2.1 1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28.2 23.5l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1z" fill="#E27625" stroke="#E27625" strokeWidth=".25"/>
                  <path d="M1.5 23.6l2.2 7.5 7.7-2.1-3.6-5.5-6.3.1z" fill="#E27625" stroke="#E27625" strokeWidth=".25"/>
                  <path d="M10.9 14.5l-2.1 3.2 7.6.3-.3-8.2-5.2 4.7z" fill="#E27625" stroke="#E27625" strokeWidth=".25"/>
                  <path d="M24.1 14.5l-5.3-4.8-.2 8.3 7.6-.3-2.1-3.2z" fill="#E27625" stroke="#E27625" strokeWidth=".25"/>
                  <path d="M11.4 29l4.6-2.2-4-3.1-.6 5.3z" fill="#E27625" stroke="#E27625" strokeWidth=".25"/>
                  <path d="M19 26.8l4.6 2.2-.5-5.3-4.1 3.1z" fill="#E27625" stroke="#E27625" strokeWidth=".25"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#E8ECF1] group-hover:text-[#2EE6A8] transition-colors">
                  Browser Wallet
                </div>
                <div className="text-[11px] text-[#8993A6]">
                  MetaMask, Rabby, Coinbase, Brave, or other Web3 extension
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
                <div className="w-9 h-9 rounded-lg bg-[#0A0E14] border border-[#232838] flex items-center justify-center">
                  {/* WalletConnect official logo SVG */}
                  <svg className="w-5 h-5" viewBox="0 0 300 185" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M61.4 36c49-48 128.6-48 177.7 0l5.9 5.8a6 6 0 010 8.6l-20.2 19.8a3 3 0 01-4.3 0l-8.1-7.9c-34.2-33.5-89.7-33.5-123.9 0l-8.7 8.5a3 3 0 01-4.3 0L55.2 51a6 6 0 010-8.6L61.4 36zm219.5 40.9l17.9 17.6a6 6 0 010 8.6l-80.7 79.2a6 6 0 01-8.5 0l-57.3-56.2a1.5 1.5 0 00-2.1 0l-57.3 56.2a6 6 0 01-8.5 0L3.7 163a6 6 0 010-8.6l18-17.6a6 6 0 018.5 0l57.3 56.2a1.5 1.5 0 002.1 0l57.3-56.2a6 6 0 018.5 0l57.3 56.2a1.5 1.5 0 002.1 0l57.3-56.2a6 6 0 018.4 0z" fill="#3B99FC"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#E8ECF1] group-hover:text-[#2EE6A8] transition-colors">
                    WalletConnect
                  </div>
                  <div className="text-[11px] text-[#8993A6]">
                    Scan QR code with mobile wallet
                  </div>
                </div>
              </div>
              <svg className="w-4 h-4 text-[#8993A6] group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="p-3.5 rounded-xl bg-[#0A0E14]/70 border border-[#232838] text-[11px] text-[#8993A6] leading-relaxed">
            <span className="text-[#2EE6A8] font-semibold">Sepolia Required:</span> Ensure your wallet network is set to Ethereum Sepolia Testnet (Chain ID 11155111).
          </div>
        </div>

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
                  ? "No Web3 wallet extension detected in this browser. Please install MetaMask, Rabby, or a Web3 wallet extension."
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

