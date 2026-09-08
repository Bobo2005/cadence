import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const loadAbi = (relPath) => {
  const fullPath = path.join(rootDir, "contracts/out", relPath);
  const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  return json.abi;
};

const vaultAbi = loadAbi("InheritanceVault.sol/InheritanceVault.json");
const consensusAbi = loadAbi("ProofOfLifeConsensus.sol/ProofOfLifeConsensus.json");
const guardianAbi = loadAbi("GuardianRegistry.sol/GuardianRegistry.json");
const stealthAbi = loadAbi("StealthAddressRegistry.sol/StealthAddressRegistry.json");
const balanceAbi = loadAbi("BalanceCommitment.sol/BalanceCommitment.json");
const smartAccountAbi = loadAbi("BeneficiarySmartAccount.sol/BeneficiarySmartAccount.json");
const factoryAbi = loadAbi("BeneficiarySmartAccount.sol/BeneficiaryAccountFactory.json");

const content = `/**
 * contracts.ts — viem contract clients & ABI definitions
 *
 * Generated with full Foundry build artifact ABIs and Sepolia testnet addresses:
 * 1. InheritanceVault (Standard 90-day & Demo 3-min)
 * 2. ProofOfLifeConsensus
 * 3. GuardianRegistry
 * 4. StealthAddressRegistry (EIP-5564)
 * 5. BalanceCommitment (Transparent accounting fallback)
 * 6. BeneficiarySmartAccount (ERC-4337)
 * 7. BeneficiaryAccountFactory
 */

import {
  createPublicClient,
  getContract,
  http,
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";

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
} as const;

export const INHERITANCE_VAULT_ABI = ${JSON.stringify(vaultAbi, null, 2)} as const;

export const PROOF_OF_LIFE_CONSENSUS_ABI = ${JSON.stringify(consensusAbi, null, 2)} as const;

export const GUARDIAN_REGISTRY_ABI = ${JSON.stringify(guardianAbi, null, 2)} as const;

export const STEALTH_ADDRESS_REGISTRY_ABI = ${JSON.stringify(stealthAbi, null, 2)} as const;

export const BALANCE_COMMITMENT_ABI = ${JSON.stringify(balanceAbi, null, 2)} as const;

export const BENEFICIARY_SMART_ACCOUNT_ABI = ${JSON.stringify(smartAccountAbi, null, 2)} as const;

export const BENEFICIARY_ACCOUNT_FACTORY_ABI = ${JSON.stringify(factoryAbi, null, 2)} as const;

export const ConsensusState = {
  Active: 0,
  ClaimPending: 1,
  Contested: 2,
  Finalized: 3,
} as const;

export type ConsensusState = (typeof ConsensusState)[keyof typeof ConsensusState];

export function formatConsensusState(state: ConsensusState | number): {
  label: string;
  color: string;
  description: string;
} {
  switch (state) {
    case ConsensusState.Active:
      return {
        label: "Active",
        color: "var(--accent-pulse)",
        description: "Owner heartbeat is active. Inactivity timeout has not elapsed.",
      };
    case ConsensusState.ClaimPending:
      return {
        label: "Claim Pending (Contest Window)",
        color: "var(--accent-warning)",
        description: "Timeout & guardian threshold met. 72-hour contest window active.",
      };
    case ConsensusState.Contested:
      return {
        label: "Contested",
        color: "var(--accent-danger)",
        description: "Claim was contested by the owner stealth key.",
      };
    case ConsensusState.Finalized:
      return {
        label: "Finalized",
        color: "var(--accent-pulse)",
        description: "Contest window passed without contest. Beneficiary claims are UNLOCKED.",
      };
    default:
      return {
        label: "Unknown",
        color: "var(--text-secondary)",
        description: "Unrecognized consensus state.",
      };
  }
}

/**
 * Encodes the calldata for the claim function on InheritanceVault.
 */
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

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    "https://ethereum-sepolia-rpc.publicnode.com"
  ),
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
};
`;

const outputPath = path.join(rootDir, "frontend/lib/contracts.ts");
fs.writeFileSync(outputPath, content, "utf8");
console.log("Successfully generated frontend/lib/contracts.ts! Size:", content.length, "bytes");
