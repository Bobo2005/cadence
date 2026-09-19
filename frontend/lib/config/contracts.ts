/**
 * frontend/lib/config/contracts.ts
 *
 * Core contract configuration, addresses, Viem RPC pool, clients, and typed contract helpers.
 */

import {
  createPublicClient,
  fallback,
  getContract,
  http,
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";
import {
  INHERITANCE_VAULT_ABI,
  PROOF_OF_LIFE_CONSENSUS_ABI,
  GUARDIAN_REGISTRY_ABI,
  STEALTH_ADDRESS_REGISTRY_ABI,
  BALANCE_COMMITMENT_ABI,
  BENEFICIARY_SMART_ACCOUNT_ABI,
  BENEFICIARY_ACCOUNT_FACTORY_ABI,
  VAULT_FACTORY_ABI,
} from "../abi";

export const CONTRACT_ADDRESSES = {
  vault: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x043d02c39B86CAd83E1Bf05728D32d24f6289e74") as Address,
  demoVault: (process.env.NEXT_PUBLIC_DEMO_VAULT_ADDRESS || "0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1") as Address,
  consensus: (process.env.NEXT_PUBLIC_CONSENSUS_ADDRESS || "0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1") as Address,
  demoConsensus: (process.env.NEXT_PUBLIC_DEMO_CONSENSUS_ADDRESS || "0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf") as Address,
  guardianRegistry: (process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS || "0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863") as Address,
  demoGuardianRegistry: (process.env.NEXT_PUBLIC_DEMO_GUARDIAN_REGISTRY_ADDRESS || "0xac0f91C7d7c3537896248C42fc880F6DFF838622") as Address,
  stealthRegistry: (process.env.NEXT_PUBLIC_STEALTH_REGISTRY_ADDRESS || "0x583eC2de840034478a61EF572cea2904bFD8671E") as Address,
  balanceCommitment: (process.env.NEXT_PUBLIC_BALANCE_COMMITMENT_ADDRESS || "0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC") as Address,
  beneficiaryFactory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x30489c0f3566AF47b71867bc992408B91E500823") as Address,
  vaultFactory: (process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as Address,
} as const;

export const CADENCE_VAULT_ADDRESS = CONTRACT_ADDRESSES.vault;
export const DEMO_VAULT_ADDRESS = CONTRACT_ADDRESSES.demoVault;

// -----------------------------------------------------------------------------
// Calldata Encoding Helpers
// -----------------------------------------------------------------------------

export function encodeClaimCalldata(
  shareBps: number | bigint,
  salt: Hex,
  proof: Hex[]
): Hex {
  return encodeFunctionData({
    abi: INHERITANCE_VAULT_ABI,
    functionName: "claim",
    args: [BigInt(shareBps), salt, proof],
  });
}

export function encodeTriggerClaimPendingCalldata(vault: Hex | string): Hex {
  return encodeFunctionData({
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "triggerClaimPending",
    args: [vault as Address],
  });
}

export function encodeFinalizeContestCalldata(vault: Hex | string): Hex {
  return encodeFunctionData({
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "finalizeContest",
    args: [vault as Address],
  });
}

export function encodeAttestCalldata(vault: Hex | string, proof: Hex[]): Hex {
  return encodeFunctionData({
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "attest",
    args: [vault as Address, proof],
  });
}

// -----------------------------------------------------------------------------
// Viem Client Infrastructure & Contract Factories
// -----------------------------------------------------------------------------

const primaryRpc =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export const sepoliaRpcPool = [
  ...(primaryRpc ? [http(primaryRpc)] : []),
  http("https://ethereum-sepolia-rpc.publicnode.com"),
  http("https://rpc.sepolia.org"),
  http("https://1rpc.io/sepolia"),
  http("https://sepolia.gateway.tenderly.co"),
];

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: fallback(sepoliaRpcPool),
});

export function getInheritanceVaultContract(
  address: Address = CONTRACT_ADDRESSES.vault,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: INHERITANCE_VAULT_ABI,
    client,
  });
}

export function getConsensusContract(
  address: Address = CONTRACT_ADDRESSES.consensus,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    client,
  });
}

export function getGuardianRegistryContract(
  address: Address = CONTRACT_ADDRESSES.guardianRegistry,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: GUARDIAN_REGISTRY_ABI,
    client,
  });
}

export function getStealthRegistryContract(
  address: Address = CONTRACT_ADDRESSES.stealthRegistry,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: STEALTH_ADDRESS_REGISTRY_ABI,
    client,
  });
}

export function getBalanceCommitmentContract(
  address: Address = CONTRACT_ADDRESSES.balanceCommitment,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: BALANCE_COMMITMENT_ABI,
    client,
  });
}

export function getBeneficiarySmartAccountContract(
  address: Address,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: BENEFICIARY_SMART_ACCOUNT_ABI,
    client,
  });
}

export function getBeneficiaryFactoryContract(
  address: Address = CONTRACT_ADDRESSES.beneficiaryFactory,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: BENEFICIARY_ACCOUNT_FACTORY_ABI,
    client,
  });
}

export function getVaultFactoryContract(
  address: Address = CONTRACT_ADDRESSES.vaultFactory,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: VAULT_FACTORY_ABI,
    client,
  });
}

// Pre-instantiated public read-only contract bundle
export const contracts = {
  vault: getInheritanceVaultContract(CONTRACT_ADDRESSES.vault),
  demoVault: getInheritanceVaultContract(CONTRACT_ADDRESSES.demoVault),
  consensus: getConsensusContract(CONTRACT_ADDRESSES.consensus),
  demoConsensus: getConsensusContract(CONTRACT_ADDRESSES.demoConsensus),
  guardianRegistry: getGuardianRegistryContract(CONTRACT_ADDRESSES.guardianRegistry),
  demoGuardianRegistry: getGuardianRegistryContract(CONTRACT_ADDRESSES.demoGuardianRegistry),
  stealthRegistry: getStealthRegistryContract(CONTRACT_ADDRESSES.stealthRegistry),
  balanceCommitment: getBalanceCommitmentContract(CONTRACT_ADDRESSES.balanceCommitment),
  beneficiaryFactory: getBeneficiaryFactoryContract(CONTRACT_ADDRESSES.beneficiaryFactory),
  vaultFactory: getVaultFactoryContract(CONTRACT_ADDRESSES.vaultFactory),
};
