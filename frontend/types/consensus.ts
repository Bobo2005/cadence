import type { Address } from "viem";
import { ConsensusState } from "../lib/abi/ProofOfLifeConsensus";

export { ConsensusState };

export interface GuardianAttestationInfo {
  address: Address;
  name?: string;
  hasAttested: boolean;
  attestedAt?: bigint;
  weight?: number;
}

export interface GuardianDisplayInfo {
  address: Address;
  name: string;
  status: "active" | "pending" | "revoked" | "attested";
  icon?: string;
  isConnectedWallet?: boolean;
}

export interface ConsensusConfig {
  quorumNumerator: bigint;
  quorumDenominator: bigint;
  contestWindowSeconds: bigint;
  gracePeriodSeconds: bigint;
  totalGuardians: number;
  attestationCount: number;
}
