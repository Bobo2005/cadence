"use client";

import { useState, useEffect, useCallback } from "react";
import { type Address, formatEther } from "viem";
import {
  publicClient,
  INHERITANCE_VAULT_ABI,
  CONTRACT_ADDRESSES,
} from "../lib/contracts";

export interface VaultStateData {
  address: Address | null;
  balanceWei: bigint;
  balanceEth: string;
  checkInIntervalSec: number;
  lastActiveTimestamp: number;
  secondsRemaining: number;
  isLapsed: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useVaultData(vaultAddress?: Address | null): VaultStateData {
  const [balanceWei, setBalanceWei] = useState<bigint>(0n);
  const [balanceEth, setBalanceEth] = useState<string>("0.00");
  const [checkInIntervalSec, setCheckInIntervalSec] = useState<number>(0);
  const [lastActiveTimestamp, setLastActiveTimestamp] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVault = useCallback(async () => {
    const target = vaultAddress || CONTRACT_ADDRESSES.vault;
    if (!target) return;

    setIsLoading(true);
    setError(null);
    try {
      const balance = await publicClient.getBalance({ address: target });
      setBalanceWei(balance);
      setBalanceEth(parseFloat(formatEther(balance)).toFixed(4));

      const intervalBigInt = (await publicClient.readContract({
        address: target,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "checkInInterval",
      })) as bigint;
      const interval = Number(intervalBigInt);
      setCheckInIntervalSec(interval);

      const lastActiveBigInt = (await publicClient.readContract({
        address: target,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "lastActiveTimestamp",
      })) as bigint;
      const lastActive = Number(lastActiveBigInt);
      setLastActiveTimestamp(lastActive);

      const nowSec = Math.floor(Date.now() / 1000);
      const diff = lastActive + interval - nowSec;
      setSecondsRemaining(Math.max(0, diff));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [vaultAddress]);

  useEffect(() => {
    fetchVault();
    const timer = setInterval(fetchVault, 30000);
    return () => clearInterval(timer);
  }, [fetchVault]);

  return {
    address: vaultAddress || CONTRACT_ADDRESSES.vault,
    balanceWei,
    balanceEth,
    checkInIntervalSec,
    lastActiveTimestamp,
    secondsRemaining,
    isLapsed: secondsRemaining === 0 && checkInIntervalSec > 0,
    isLoading,
    error,
    refetch: fetchVault,
  };
}
