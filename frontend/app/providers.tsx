"use client";

import React, { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../lib/wagmi";
import { WalletModalProvider } from "../components/ui/ConnectWalletModal";
import { ToastProvider } from "../components/ui/Toast";

import { CookieProvider } from "../context/CookieContext";
import CookieBanner from "../components/ui/CookieBanner";
import CookiePreferencesModal from "../components/ui/CookiePreferencesModal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WalletModalProvider>
            <CookieProvider>
              {children}
              <CookieBanner />
              <CookiePreferencesModal />
            </CookieProvider>
          </WalletModalProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
