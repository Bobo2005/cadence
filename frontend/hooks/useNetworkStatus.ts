"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { publicClient } from "../lib/contracts";
import { SEPOLIA_CHAIN_ID } from "../lib/constants";

export interface NetworkStatus {
  chainId: number | undefined;
  isSepolia: boolean;
  blockNumber: bigint | null;
  latencyMs: number | null;
  isOnline: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useNetworkStatus(): NetworkStatus {
  const chainId = useChainId();
  const { isConnected } = useAccount();

  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkNetwork = useCallback(async () => {
    const start = performance.now();
    try {
      const block = await publicClient.getBlockNumber();
      const elapsed = Math.round(performance.now() - start);
      setBlockNumber(block);
      setLatencyMs(elapsed);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
      setLatencyMs(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkNetwork();
    const interval = setInterval(checkNetwork, 15000);
    return () => clearInterval(interval);
  }, [checkNetwork]);

  const isSepolia = chainId === SEPOLIA_CHAIN_ID || (!isConnected && true);

  return {
    chainId,
    isSepolia,
    blockNumber,
    latencyMs,
    isOnline,
    isLoading,
    refresh: checkNetwork,
  };
}
