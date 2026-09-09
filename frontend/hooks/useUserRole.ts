"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { type Address, isAddressEqual, getAddress } from "viem";
import {
  CONTRACT_ADDRESSES,
  publicClient,
  INHERITANCE_VAULT_ABI,
  GUARDIAN_REGISTRY_ABI,
  BENEFICIARY_ACCOUNT_FACTORY_ABI,
} from "../lib/contracts.ts";
import {
  getRegisteredVaults,
  findVaultsForBeneficiary,
} from "../lib/vaultRegistry.ts";

export type RoleType = "owner" | "beneficiary" | "guardian" | "new_user";

export interface VaultRoleMatch {
  vaultAddress: Address;
  name: string;
  role: RoleType;
  details?: string;
}

export interface UserRoleState {
  /** True if the connected address owns one or more vaults */
  isOwner: boolean;
  /** True if the connected address is a registered/listed beneficiary on one or more vaults */
  isBeneficiary: boolean;
  /** True if the connected address is an active or committed guardian on one or more vaults */
  isGuardian: boolean;
  /** True if the connected address holds none of the above roles (brand new visitor) */
  isNewUser: boolean;

  /** List of all roles held simultaneously (non-exclusive) */
  roles: RoleType[];

  /** Primary role prioritized for initial landing navigation */
  primaryRole: RoleType;

  /** Recommended navigation route based on roles */
  recommendedRoute: string;

  /** Formatted human-readable role badge string, e.g. "Owner", "Owner · Guardian", "New User" */
  roleBadge: string;

  /** Vaults where connected wallet is owner */
  ownedVaults: VaultRoleMatch[];

  /** Vaults where connected wallet is a beneficiary */
  beneficiaryVaults: VaultRoleMatch[];

  /** Vaults where connected wallet is a guardian */
  guardianVaults: VaultRoleMatch[];

  /** Loading state while performing on-chain queries */
  isLoading: boolean;

  /** Error if contract calls fail */
  error: Error | null;

  /** Re-evaluates role detection */
  refetch: () => Promise<void>;
}

// Known protocol guardians committed to standard & demo vaults
export const KNOWN_PROTOCOL_GUARDIANS: Address[] = [
  "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2",
  "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0",
];

// Known protocol beneficiaries with committed Merkle leaves
export const KNOWN_PROTOCOL_BENEFICIARIES: Address[] = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Alice (40%)
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Bob (60%)
];

export function useUserRole(): UserRoleState {
  const { address, isConnected } = useAccount();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const [ownedVaults, setOwnedVaults] = useState<VaultRoleMatch[]>([]);
  const [beneficiaryVaults, setBeneficiaryVaults] = useState<VaultRoleMatch[]>([]);
  const [guardianVaults, setGuardianVaults] = useState<VaultRoleMatch[]>([]);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  const checkRoles = useCallback(async () => {
    setReloadTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function runCheck() {
      if (!isConnected || !address) {
        setOwnedVaults([]);
        setBeneficiaryVaults([]);
        setGuardianVaults([]);
        setIsLoading(false);
        return;
      }

      try {
        await Promise.resolve();
        if (isCancelled) return;
        setIsLoading(true);
        setError(null);

        const normalizedAddress = getAddress(address);

        const detectedOwned: VaultRoleMatch[] = [];
        const detectedBeneficiary: VaultRoleMatch[] = [];
        const detectedGuardian: VaultRoleMatch[] = [];

        // 1. Collect all candidate vaults (configured on-chain deployments + client registry)
        const candidateVaults: { address: Address; name: string }[] = [
          {
            address: CONTRACT_ADDRESSES.vault,
            name: "Standard 90-Day Locker (Sepolia)",
          },
          {
            address: CONTRACT_ADDRESSES.demoVault,
            name: "Live Demo Locker (3-Min Interval)",
          },
        ];

        // Merge user-created vaults from registry
        const localVaults = getRegisteredVaults();
        for (const lv of localVaults) {
          if (
            !candidateVaults.some((cv) =>
              isAddressEqual(cv.address, lv.vaultAddress)
            )
          ) {
            candidateVaults.push({
              address: lv.vaultAddress,
              name: lv.name || `Locker ${lv.vaultAddress.slice(0, 6)}...`,
            });
          }
        }

        // 2. Check Owner Status
        // (a) On-chain query: vault.owner() for each candidate vault
        for (const cv of candidateVaults) {
          try {
            const vaultOwner = await publicClient.readContract({
              address: cv.address,
              abi: INHERITANCE_VAULT_ABI,
              functionName: "owner",
            });

            if (isAddressEqual(vaultOwner, normalizedAddress)) {
              detectedOwned.push({
                vaultAddress: cv.address,
                name: cv.name,
                role: "owner",
                details: "On-chain Locker Owner",
              });
            }
          } catch {
            // Contract read failed or network unreachable
          }
        }

        // Also check local registry owner field
        for (const lv of localVaults) {
          if (isAddressEqual(lv.owner, normalizedAddress)) {
            if (!detectedOwned.some((m) => isAddressEqual(m.vaultAddress, lv.vaultAddress))) {
              detectedOwned.push({
                vaultAddress: lv.vaultAddress,
                name: lv.name,
                role: "owner",
                details: "Registered Vault Creator",
              });
            }
          }
        }

        // 3. Check Guardian Status
        // (a) Match against known protocol guardian addresses
        const isKnownGuardian = KNOWN_PROTOCOL_GUARDIANS.some((g) =>
          isAddressEqual(g, normalizedAddress)
        );

        if (isKnownGuardian) {
          for (const cv of candidateVaults) {
            detectedGuardian.push({
              vaultAddress: cv.address,
              name: cv.name,
              role: "guardian",
              details: "Consensus Guardian Node",
            });
          }
        } else {
          // (b) On-chain check: hasGuardianAttested
          for (const cv of candidateVaults) {
            try {
              const hasAttested = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.guardianRegistry,
                abi: GUARDIAN_REGISTRY_ABI,
                functionName: "hasGuardianAttested",
                args: [cv.address, normalizedAddress],
              });

              if (hasAttested) {
                detectedGuardian.push({
                  vaultAddress: cv.address,
                  name: cv.name,
                  role: "guardian",
                  details: "Attested Guardian Node",
                });
              }
            } catch {
              // Ignore failure
            }
          }
        }

        // 4. Check Beneficiary Status
        // (a) On-chain smart account factory query
        try {
          const smartAccounts = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.beneficiaryFactory,
            abi: BENEFICIARY_ACCOUNT_FACTORY_ABI,
            functionName: "getAccountsForBeneficiary",
            args: [normalizedAddress],
          });

          if (smartAccounts && smartAccounts.length > 0) {
            for (const sa of smartAccounts) {
              detectedBeneficiary.push({
                vaultAddress: sa,
                name: `Beneficiary Smart Account (${sa.slice(0, 6)}...${sa.slice(-4)})`,
                role: "beneficiary",
                details: "ERC-4337 Smart Account Deployed",
              });
            }
          }
        } catch {
          // Ignore failure
        }

        // (b) Check known protocol beneficiaries (Alice / Bob)
        const isKnownBeneficiary = KNOWN_PROTOCOL_BENEFICIARIES.some((b) =>
          isAddressEqual(b, normalizedAddress)
        );

        if (isKnownBeneficiary) {
          const share = isAddressEqual(KNOWN_PROTOCOL_BENEFICIARIES[0], normalizedAddress)
            ? "40.00% Share"
            : "60.00% Share";

          for (const cv of candidateVaults) {
            if (!detectedBeneficiary.some((m) => isAddressEqual(m.vaultAddress, cv.address))) {
              detectedBeneficiary.push({
                vaultAddress: cv.address,
                name: cv.name,
                role: "beneficiary",
                details: `Committed Allocations (${share})`,
              });
            }
          }
        }

        // (c) Check client registry encrypted allocations
        const vaultsWithBeneficiary = findVaultsForBeneficiary(normalizedAddress);
        for (const vb of vaultsWithBeneficiary) {
          if (!detectedBeneficiary.some((m) => isAddressEqual(m.vaultAddress, vb.vaultAddress))) {
            detectedBeneficiary.push({
              vaultAddress: vb.vaultAddress,
              name: vb.name,
              role: "beneficiary",
              details: "Encrypted Allocation Listed",
            });
          }
        }

        if (!isCancelled) {
          setOwnedVaults(detectedOwned);
          setBeneficiaryVaults(detectedBeneficiary);
          setGuardianVaults(detectedGuardian);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.warn("useUserRole error:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    runCheck();

    return () => {
      isCancelled = true;
    };
  }, [address, isConnected, reloadTrigger]);

  // Derive role booleans
  const isOwner = ownedVaults.length > 0;
  const isBeneficiary = beneficiaryVaults.length > 0;
  const isGuardian = guardianVaults.length > 0;
  const isNewUser = isConnected && !isOwner && !isBeneficiary && !isGuardian;

  // Build non-exclusive roles list
  const roles = useMemo<RoleType[]>(() => {
    if (!isConnected) return [];
    const list: RoleType[] = [];
    if (isOwner) list.push("owner");
    if (isBeneficiary) list.push("beneficiary");
    if (isGuardian) list.push("guardian");
    if (list.length === 0) list.push("new_user");
    return list;
  }, [isConnected, isOwner, isBeneficiary, isGuardian]);

  // Determine primary role
  const primaryRole = useMemo<RoleType>(() => {
    if (!isConnected) return "new_user";
    if (isOwner) return "owner";
    if (isBeneficiary) return "beneficiary";
    if (isGuardian) return "guardian";
    return "new_user";
  }, [isConnected, isOwner, isBeneficiary, isGuardian]);

  // Recommended route based on roles
  const recommendedRoute = useMemo<string>(() => {
    if (!isConnected) return "/";
    if (isOwner) return "/dashboard";
    if (isBeneficiary && !isOwner) return "/claim";
    if (isGuardian && !isOwner && !isBeneficiary) return "/contest";
    return "/vault/create";
  }, [isConnected, isOwner, isBeneficiary, isGuardian]);

  // User-friendly badge label
  const roleBadge = useMemo<string>(() => {
    if (!isConnected) return "Disconnected";
    const labels: string[] = [];
    if (isOwner) labels.push("Owner");
    if (isBeneficiary) labels.push("Beneficiary");
    if (isGuardian) labels.push("Guardian");
    if (labels.length === 0) return "New User";
    return labels.join(" · ");
  }, [isConnected, isOwner, isBeneficiary, isGuardian]);

  return {
    isOwner,
    isBeneficiary,
    isGuardian,
    isNewUser,
    roles,
    primaryRole,
    recommendedRoute,
    roleBadge,
    ownedVaults,
    beneficiaryVaults,
    guardianVaults,
    isLoading,
    error,
    refetch: checkRoles,
  };
}
