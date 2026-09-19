import type { Address } from "viem";

export type RoleType = "owner" | "beneficiary" | "guardian" | "new_user";

export interface VaultRoleMatch {
  vaultAddress: Address;
  name: string;
  role: RoleType;
  details?: string;
  isAccelerated?: boolean;
}

export interface UserRoleState {
  isOwner: boolean;
  isBeneficiary: boolean;
  isGuardian: boolean;
  isNewUser: boolean;
  roles: RoleType[];
  primaryRole: RoleType;
  recommendedRoute: string;
  roleBadge: string;
  ownedVaults: VaultRoleMatch[];
  beneficiaryVaults: VaultRoleMatch[];
  guardianVaults: VaultRoleMatch[];
  isLoading: boolean;
  error?: Error | null;
  refetch: () => Promise<void>;
}

export interface BeneficiaryItem {
  address: Address;
  shareBps: number;
  stealthAddress?: Address;
  claimed?: boolean;
  streamingEnabled?: boolean;
}

export interface StreamingConfig {
  enabled: boolean;
  durationSeconds: bigint;
  releaseRatePerSecond?: bigint;
  totalStreamAmount?: bigint;
  streamedAmount?: bigint;
}

export interface BeneficiaryStream {
  beneficiary: Address;
  totalAllocated: bigint;
  claimedSoFar: bigint;
  streamStart: bigint;
  streamDuration: bigint;
  streamRatePerSecond: bigint;
  currentlyAvailable: bigint;
  isStreaming: boolean;
}

export interface VaultData {
  address: Address;
  name: string;
  owner: Address;
  balance: bigint;
  lastCheckIn: bigint;
  checkInInterval: bigint;
  gracePeriod: bigint;
  isContested: boolean;
  consensusState: number;
  timeRemaining: number;
  formattedTimeRemaining: string;
  healthPercentage: number;
  isAccelerated: boolean;
  beneficiariesCount: number;
  guardiansCount: number;
}
