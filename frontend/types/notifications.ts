import type { Address } from "viem";

export interface EmailBindingStatus {
  walletAddress: Address;
  email: string;
  isVerified: boolean;
  boundAt?: string;
  maskedEmail?: string;
}

export interface GuardianAlertTarget {
  walletAddress: Address;
  email: string;
  isEncrypted: boolean;
  status: "active" | "pending" | "failed";
}

export interface MonitoredVault {
  vaultAddress: Address;
  name: string;
  isAccelerated: boolean;
  lastCheckIn: number;
  consensusState: number;
  guardiansCount: number;
}
