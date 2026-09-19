"use client";

import { useState, useEffect, useCallback } from "react";
import { type Address } from "viem";
import {
  publicClient,
  CONTRACT_ADDRESSES,
  GUARDIAN_REGISTRY_ABI,
} from "../lib/contracts";

export interface GuardianConfigInfo {
  threshold: number;
  totalGuardians: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGuardians(vaultAddress?: Address | null): GuardianConfigInfo {
  const [threshold, setThreshold] = useState<number>(2);
  const [totalGuardians, setTotalGuardians] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGuardians = useCallback(async () => {
    const target = vaultAddress || CONTRACT_ADDRESSES.vault;
    if (!target) return;

    setIsLoading(true);
    setError(null);
    try {
      const gConfig = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.guardianRegistry,
        abi: GUARDIAN_REGISTRY_ABI,
        functionName: "getGuardianConfig",
        args: [target],
      })) as { threshold: bigint; totalGuardians: bigint };

      if (gConfig) {
        setThreshold(Number(gConfig.threshold) || 2);
        setTotalGuardians(Number(gConfig.totalGuardians) || 2);
      }
    } catch (err) {
      // Graceful fallback to default threshold
      setThreshold(2);
      setTotalGuardians(2);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [vaultAddress]);

  useEffect(() => {
    fetchGuardians();
  }, [fetchGuardians]);

  return {
    threshold,
    totalGuardians,
    isLoading,
    error,
    refetch: fetchGuardians,
  };
}
