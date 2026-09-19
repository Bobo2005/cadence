"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useConnect, useAccount } from "wagmi";

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
  const [showNetworkDetails, setShowNetworkDetails] = useState(true);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a wallet"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[420px] rounded-3xl bg-white p-7 sm:p-8 shadow-2xl relative text-left font-sans animate-in zoom-in-95 duration-200 border border-[#E8EAED]"
      >
        {/* Close Button (Circular with light border and 'x') */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full border border-[#E8EAED] text-[#8A8F98] hover:text-[#111111] hover:border-[#AEB3BB] transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Category Label */}
        <div className="text-[11px] font-mono font-semibold tracking-wider text-[#8A8F98] uppercase mb-1.5">
          WALLET
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-[#111111] tracking-tight">
          Choose a wallet
        </h3>

        {/* Subtitle description */}
        <p className="text-xs sm:text-[13px] text-[#5F6368] leading-relaxed mt-2.5 mb-6">
          Connecting only shares your address. It moves no money and costs no fee. You approve every action separately.
        </p>

        {/* Wallet Options matching Reference */}
        <div className="space-y-3">
          {/* Rabby Wallet */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleConnectInjected}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#E8EAED] hover:border-[#111111] bg-white transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-[#5D6BFF] flex items-center justify-center text-white shadow-sm shrink-0">
                {/* Rabby logo icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3.5-3.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#111111]">
                Rabby Wallet
              </span>
            </div>
            <span className="text-[#8A8F98] group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all text-base">
              →
            </span>
          </button>

          {/* MetaMask / Browser Wallet */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleConnectInjected}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#E8EAED] hover:border-[#111111] bg-white transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-[#F6851B]/10 border border-[#F6851B]/20 flex items-center justify-center text-[#F6851B] shrink-0">
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
              <span className="text-sm font-semibold text-[#111111]">
                MetaMask
              </span>
            </div>
            <span className="text-[#8A8F98] group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all text-base">
              →
            </span>
          </button>

          {/* WalletConnect Option */}
          {walletConnectConnector && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => connect({ connector: walletConnectConnector })}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#E8EAED] hover:border-[#111111] bg-white transition-all group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#3B99FC]/10 border border-[#3B99FC]/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 300 185" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M61.4 36c49-48 128.6-48 177.7 0l5.9 5.8a6 6 0 010 8.6l-20.2 19.8a3 3 0 01-4.3 0l-8.1-7.9c-34.2-33.5-89.7-33.5-123.9 0l-8.7 8.5a3 3 0 01-4.3 0L55.2 51a6 6 0 010-8.6L61.4 36zm219.5 40.9l17.9 17.6a6 6 0 010 8.6l-80.7 79.2a6 6 0 01-8.5 0l-57.3-56.2a1.5 1.5 0 00-2.1 0l-57.3 56.2a6 6 0 01-8.5 0L3.7 163a6 6 0 010-8.6l18-17.6a6 6 0 018.5 0l57.3 56.2a1.5 1.5 0 002.1 0l57.3-56.2a6 6 0 018.5 0l57.3 56.2a1.5 1.5 0 002.1 0l57.3-56.2a6 6 0 018.4 0z" fill="#3B99FC"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#111111]">
                  WalletConnect
                </span>
              </div>
              <span className="text-[#8A8F98] group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all text-base">
                →
              </span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[#E8EAED] my-6" />

        {/* Network Details Accordion matching Card 5 */}
        <div>
          <button
            type="button"
            onClick={() => setShowNetworkDetails(!showNetworkDetails)}
            className="text-xs font-medium text-[#8A8F98] hover:text-[#5F6368] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{showNetworkDetails ? "▾" : "▸"} Network details</span>
          </button>

          {showNetworkDetails && (
            <div className="mt-2 text-[11px] font-mono text-[#8A8F98] leading-relaxed break-all select-all">
              Ethereum Sepolia · chain 11155111 · https://rpc.sepolia.org
            </div>
          )}
        </div>

        {/* Error message display if connection fails */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#FDECEC] border border-[#D64545]/20 text-xs text-[#D64545] flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="space-y-0.5">
              <div className="font-semibold">Connection Error</div>
              <div className="text-[11px] leading-relaxed text-[#D64545]/90">
                {error.message.includes("Connector not found") || error.message.includes("not found")
                  ? "No Web3 wallet extension detected in this browser. Please install Rabby, MetaMask, or a Web3 wallet extension."
                  : error.message}
              </div>
            </div>
          </div>
        )}

        {/* Pending Spinner */}
        {isPending && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[#111111]">
            <svg className="animate-spin h-4 w-4 text-[#111111]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Awaiting confirmation in wallet...</span>
          </div>
        )}
      </div>
    </div>
  );
}
