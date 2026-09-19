"use client";

import React, { useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import {
  LoadingSkeleton,
  WalletDisconnectedState,
  NetworkMismatchState,
} from "./ui/GlobalStates";

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
  const { isConnected, isConnecting, isReconnecting, chain } = useAccount();
  const hasMounted = useHasMounted();

  const isWrongNetwork = Boolean(isConnected && chain && chain.id !== 11155111);

  // During SSR or initial hydration wait: Light skeletons and restrained shimmer
  if (!hasMounted) {
    return (
      <div className="w-full max-w-2xl mx-auto my-12">
        <LoadingSkeleton label="Initializing protocol state..." rows={4} />
      </div>
    );
  }

  // If wrong network: Explicit Network Mismatch screen
  if (isWrongNetwork) {
    return <NetworkMismatchState targetNetworkName="Sepolia" targetChainId={11155111} />;
  }

  // If disconnected: Standardized CONNECT WALLET state
  if (!isConnected && !isConnecting && !isReconnecting) {
    return (
      <WalletDisconnectedState
        title="CONNECT WALLET"
      />
    );
  }

  return <>{children}</>;
}

