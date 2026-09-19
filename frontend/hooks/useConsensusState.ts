"use client";

import { useState, useEffect, useCallback } from "react";
import { type Address, isAddressEqual } from "viem";
import {
  publicClient,
  CONTRACT_ADDRESSES,
  PROOF_OF_LIFE_CONSENSUS_ABI,
  ConsensusState,
  formatConsensusState,
} from "../lib/contracts";
import { getRegisteredVaults } from "../lib/vaultRegistry";

export interface ConsensusInfo {
  state: ConsensusState;
  stateLabel: string;
  stateColor: string;
  stateDescription: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useConsensusState(vaultAddress?: Address | null): ConsensusInfo {
  const [state, setState] = useState<ConsensusState>(ConsensusState.Active);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchState = useCallback(async () => {
    const target = vaultAddress || CONTRACT_ADDRESSES.vault;
    if (!target) return;

    setIsLoading(true);
    setError(null);
    try {
      const raw = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.consensus,
        abi: PROOF_OF_LIFE_CONSENSUS_ABI,
        functionName: "getState",
        args: [target],
      });
      setState(Number(raw) as ConsensusState);
    } catch (err) {
      const reg = getRegisteredVaults().find((v) =>
        isAddressEqual(v.vaultAddress, target)
      );
      if (reg) {
        setState(reg.consensusState as ConsensusState);
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  }, [vaultAddress]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 15000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const formatted = formatConsensusState(state);

  return {
    state,
    stateLabel: formatted.label,
    stateColor: formatted.color,
    stateDescription: formatted.description,
    isLoading,
    error,
    refetch: fetchState,
  };
}
