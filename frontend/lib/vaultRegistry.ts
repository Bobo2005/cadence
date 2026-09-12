/**
 * vaultRegistry.ts — Persistent client registry of Cadence vaults & encrypted allocations
 *
 * Facilitates beneficiary discovery:
 * When a beneficiary connects their wallet, the app queries registered vaults,
 * locates matching encrypted allocations, decrypts locally, generates Merkle proofs,
 * and enables contract claim execution.
 */

import { type Address, type Hex, getAddress } from "viem";
import { ConsensusState } from "./contracts.ts";
import { hashPair, verifyMerkleProof } from "./merkle.ts";

export interface EncryptedAllocationRecord {
  beneficiary: Address;
  ciphertext: string;
  publicKey?: string;
  label?: string;
}

export interface RegisteredVault {
  id: string;
  name: string;
  vaultAddress: Address;
  consensusAddress: Address;
  owner: Address;
  allocationRoot: Hex;
  consensusState: ConsensusState;
  ethBalance: string;
  ethBalanceWei: bigint;
  tokenBalances: { symbol: string; amount: string }[];
  leaves: Hex[];
  encryptedAllocations: EncryptedAllocationRecord[];
  guardians?: Address[];
  claimedAddresses?: Address[];
  createdAt: number;
}

export interface DemoBeneficiary {
  id: string;
  name: string;
  address: Address;
  publicKey: string;
  description: string;
}

export const DEMO_BENEFICIARIES: DemoBeneficiary[] = [
  {
    id: "alice",
    name: "Alice (Primary Heir)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    publicKey: "ba5734d8f7091719471e7f7ed6b9df170dc70cc661ca05e688601ad984f068b0d67351e5f06073092499336ab0839ef8a521afd334e53807205fa2f08eec74f4",
    description: "40.00% allocation on Accelerated Demo Locker",
  },
  {
    id: "bob",
    name: "Bob (Secondary Heir)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    publicKey: "9d9031e97dd78ff8c15aa86939de9b1e791066a0224e331bc962a2099a7b1f0464b8bbafe1535f2301c72c2cb3535b172da30b02686ab0393d348614f157fbdb",
    description: "60.00% allocation on Accelerated Demo Locker",
  },
];

export const SEED_VAULTS: RegisteredVault[] = [
  {
    id: "vault-demo-sepolia",
    name: "Accelerated Demo Locker (Sepolia)",
    vaultAddress: "0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1",
    consensusAddress: "0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf",
    owner: "0xC09C394336D4Ed967B70a4C1C1110493673f77e4",
    allocationRoot: "0xac307891d4f7e578cbb8ce28ae58c1247efc405077fddd60dcbe3c877c55c1b8",
    consensusState: ConsensusState.Active,
    ethBalance: "0.05 ETH",
    ethBalanceWei: 50000000000000000n,
    tokenBalances: [],
    leaves: [
      "0x7d595e5b2a4c887b81fedbed8448e00ed9181f39adf958569d234362e689f5b8",
      "0x1ed9590a899967b48c42f441cf5aa7578a03424ca2d4014e2836131d64f5d1b7",
    ],
    encryptedAllocations: [
      {
        beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        ciphertext:
          "13b5deba92d1ae35fb9bf4585b89666c03c5c0787771f6e35d24facd57d5972627fa640340d4ac12cacfc16b0e495f722b1a6616da2d296c30b7d8f0c582e886ad0770c27a2187e3e603c44babd78701d9f942765be41e733968c8789b16f4d0825b540d199a21415cc713832c31007a10597fc5600b94653f9e2c0a86b3d4a963018f3bce6f57905f605c7045473093dcd0e1099161adff693b5dac881432a08738449e5c36304f495c5c356ace9cf60639de906de393062af33cca9dae620eb1878364c698dfa4b84cea30a8224c819453278150ae27766b9c719a6bd6b6a2dc4960ba01a6aabbf04aef19e7597d126e",
        label: "Alice (40.00% Share · 0.02 ETH)",
      },
      {
        beneficiary: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        ciphertext:
          "4ab927cedb025f46dc850bb12918eba003db279f062472df6f637837794cab07309293564158ace65b6b42ab4274d668c703199338e452c41188eb9883a5f88f2ff11f6a5d445ecfc0c803631893fac1a10d52917222417d3f40689cca03b1ee1a40e668c95596ba995ccf4dce0ad19eb131569f63cc702258565dcaffc8aadfa30edc26abe1e87d2e37ccad061b2b9f1adebd151ebce053c5c25a8b613d94fdf0f7bf991288cbbdea0f7c24bbf8f7256500e043fa58f2d8f55e525de3f8dc0abac80899d089e3d2c84f2cb4c3d2251319ab7c700b795756473ef45be329b8c7fdc3d819b534c60ffbd21ef040a8e4dcd2",
        label: "Bob (60.00% Share · 0.03 ETH)",
      },
    ],
    guardians: [
      "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2",
      "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0",
    ],
    claimedAddresses: [],
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: "vault-standard-sepolia",
    name: "Standard 90-Day Locker (Sepolia)",
    vaultAddress: "0x043d02c39B86CAd83E1Bf05728D32d24f6289e74",
    consensusAddress: "0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1",
    owner: "0xC09C394336D4Ed967B70a4C1C1110493673f77e4",
    allocationRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
    consensusState: ConsensusState.Active,
    ethBalance: "0.00 ETH",
    ethBalanceWei: 0n,
    tokenBalances: [],
    leaves: [],
    encryptedAllocations: [],
    guardians: [
      "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2",
      "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0",
    ],
    claimedAddresses: [],
    createdAt: Date.now() - 86400000 * 2,
  },
];

const LOCAL_STORAGE_KEY = "cadence_vault_registry";

const OBSOLETE_DUMMY_ADDRESSES = new Set([
  "0x0165878a594ca255338adfa4d48449f69242eb8f",
  "0x6101786575938562839217647281938501837492",
]);

/**
 * Retrieves all registered vaults (combining seed vaults and user-created vaults).
 * Automatically purges legacy/undeployed dummy test addresses from browser storage.
 */
export function getRegisteredVaults(): RegisteredVault[] {
  if (typeof window === "undefined") {
    return SEED_VAULTS;
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let vaults: RegisteredVault[] = [];
    let hadStaleVaults = false;

    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_VAULTS, bigIntReplacer));
      return SEED_VAULTS;
    } else {
      const parsed = JSON.parse(raw, bigIntReviver) as RegisteredVault[];
      // Filter out known obsolete dummy/mock addresses
      vaults = parsed.filter((v) => {
        const isObsolete = v.vaultAddress && OBSOLETE_DUMMY_ADDRESSES.has(v.vaultAddress.toLowerCase());
        if (isObsolete) {
          hadStaleVaults = true;
        }
        return !isObsolete;
      });
    }

    // Ensure current SEED_VAULTS are preserved and reconciled
    for (const seed of SEED_VAULTS) {
      const existingIdx = vaults.findIndex(
        (v) =>
          v.id === seed.id ||
          (v.vaultAddress && v.vaultAddress.toLowerCase() === seed.vaultAddress.toLowerCase())
      );
      if (existingIdx === -1) {
        vaults.push(seed);
        hadStaleVaults = true;
      }
    }

    if (hadStaleVaults) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vaults, bigIntReplacer));
    }

    return vaults;
  } catch (err) {
    console.warn("Failed to read from localStorage:", err);
    return SEED_VAULTS;
  }
}

/**
 * Persists a new or updated vault to local storage.
 */
export function saveRegisteredVault(vault: RegisteredVault): void {
  if (typeof window === "undefined") return;

  try {
    const vaults = getRegisteredVaults();
    const existingIndex = vaults.findIndex((v) => v.id === vault.id || v.vaultAddress.toLowerCase() === vault.vaultAddress.toLowerCase());

    let updated: RegisteredVault[];
    if (existingIndex >= 0) {
      updated = [...vaults];
      updated[existingIndex] = vault;
    } else {
      updated = [vault, ...vaults];
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated, bigIntReplacer));
  } catch (err) {
    console.error("Failed to save vault to localStorage:", err);
  }
}

/**
 * Finds all vaults where a beneficiary address is listed.
 */
export function findVaultsForBeneficiary(rawAddress: string): RegisteredVault[] {
  if (!rawAddress) return [];
  try {
    const normalized = getAddress(rawAddress);
    const vaults = getRegisteredVaults();
    return vaults.filter((v) =>
      v.encryptedAllocations.some((a) => {
        try {
          return getAddress(a.beneficiary) === normalized;
        } catch {
          return a.beneficiary.toLowerCase() === rawAddress.toLowerCase();
        }
      })
    );
  } catch {
    return [];
  }
}

/**
 * Generates the Merkle proof for a given leaf from a list of leaves.
 */
export function generateProofFromLeaves(leaves: Hex[], leafToFind: Hex): Hex[] {
  const cleanLeaf = leafToFind.toLowerCase();
  const index = leaves.findIndex((l) => l.toLowerCase() === cleanLeaf);
  if (index === -1) {
    throw new Error("Leaf not found in tree leaves list");
  }

  const levels: Hex[][] = [];
  levels.push([...leaves]);

  while (levels[levels.length - 1].length > 1) {
    const currentLevel = levels[levels.length - 1];
    const nextLevel: Hex[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }
    levels.push(nextLevel);
  }

  const proof: Hex[] = [];
  let currentIndex = index;

  for (let i = 0; i < levels.length - 1; i++) {
    const level = levels[i];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < level.length) {
      proof.push(level[siblingIndex]);
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

/**
 * Validates whether a proof matches the root.
 */
export function verifyProof(proof: Hex[], root: Hex, leaf: Hex): boolean {
  return verifyMerkleProof(proof, root, leaf);
}

// JSON helpers for BigInt serialization
function bigIntReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() + "n" : value;
}

function bigIntReviver(_key: string, value: unknown) {
  if (typeof value === "string" && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}

export interface ProvisioningState {
  owner: Address;
  step: 1 | 2 | 3 | 4 | 5; // 1 = deploy, 2 = deposit, 3 = allocationRoot, 4 = guardianRoot, 5 = completed
  vaultAddress?: Address;
  txHashes: {
    deploy?: Hex;
    deposit?: Hex;
    allocationRoot?: Hex;
    guardianRoot?: Hex;
  };
  config: {
    name: string;
    intervalDays: number;
    intervalSeconds: number;
    depositAmountEth: string;
    tokenSymbol: string;
    beneficiaries: Array<{ address: Address; percentage: number; label?: string; bps: number }>;
    guardians: Array<Address>;
    guardianThreshold: number;
    gracePeriodSeconds?: number;
  };
  allocationRoot?: Hex;
  guardianRoot?: Hex;
  error?: string;
  updatedAt: number;
}

const PROVISIONING_STORAGE_PREFIX = "cadence_vault_provisioning_";

export function getProvisioningState(owner?: Address): ProvisioningState | null {
  if (typeof window === "undefined" || !owner) return null;
  try {
    const raw = localStorage.getItem(`${PROVISIONING_STORAGE_PREFIX}${owner.toLowerCase()}`);
    if (!raw) return null;
    return JSON.parse(raw, bigIntReviver) as ProvisioningState;
  } catch (err) {
    console.warn("Failed to load provisioning state:", err);
    return null;
  }
}

export function saveProvisioningState(owner: Address, state: ProvisioningState): void {
  if (typeof window === "undefined" || !owner) return;
  try {
    localStorage.setItem(
      `${PROVISIONING_STORAGE_PREFIX}${owner.toLowerCase()}`,
      JSON.stringify(state, bigIntReplacer)
    );
  } catch (err) {
    console.error("Failed to save provisioning state:", err);
  }
}

export function clearProvisioningState(owner?: Address): void {
  if (typeof window === "undefined" || !owner) return;
  try {
    localStorage.removeItem(`${PROVISIONING_STORAGE_PREFIX}${owner.toLowerCase()}`);
  } catch (err) {
    console.error("Failed to clear provisioning state:", err);
  }
}

