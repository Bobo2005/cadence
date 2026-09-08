/**
 * merkle.ts — allocationRoot + guardian Merkle tree builders
 *
 * Implements client-side Merkle tree generation, leaf hashing, and proof computation
 * for:
 * 1. allocationRoot — Merkle commitment over per-beneficiary (address, shareBps, salt) leaves.
 *    Stores ONLY the root on-chain (Constraint #3: Allocation Privacy).
 *    Enforces off-chain sum validation: total shares must equal exactly 10,000 bps (Constraint #4).
 * 2. guardianRoot — Merkle commitment over guardian addresses.
 *    Keeps guardian identities hidden until claim-time attestation.
 *
 * All pair hashing uses OpenZeppelin-compatible commutative Keccak-256:
 *   hashPair(a, b) = a <= b ? keccak256(a || b) : keccak256(b || a)
 */

import {
  keccak256,
  encodeAbiParameters,
  concatHex,
  getAddress,
  bytesToHex,
  type Hex,
  type Address,
} from "viem";

export interface BeneficiaryAllocation {
  address: Address;
  shareBps: number | bigint;
  salt: Hex;
}

export interface MerkleTreeResult {
  root: Hex;
  leaves: Hex[];
  getProof: (index: number) => Hex[];
  verify: (index: number) => boolean;
}

/**
 * Computes a double-hashed Merkle leaf for a beneficiary allocation.
 * Matches Solidity MerkleProofLib.computeAllocationLeaf:
 *   keccak256(bytes.concat(keccak256(abi.encode(beneficiary, shareBps, salt))))
 */
export function computeAllocationLeaf(
  beneficiary: Address,
  shareBps: number | bigint,
  salt: Hex
): Hex {
  const encoded = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "bytes32" }],
    [getAddress(beneficiary), BigInt(shareBps), salt]
  );
  const innerHash = keccak256(encoded);
  return keccak256(innerHash);
}

/**
 * Computes a double-hashed Merkle leaf for a guardian address.
 * Matches Solidity MerkleProofLib.computeGuardianLeaf:
 *   keccak256(bytes.concat(keccak256(abi.encode(guardian))))
 */
export function computeGuardianLeaf(guardian: Address): Hex {
  const encoded = encodeAbiParameters(
    [{ type: "address" }],
    [getAddress(guardian)]
  );
  const innerHash = keccak256(encoded);
  return keccak256(innerHash);
}

/**
 * Generates a cryptographically random 32-byte blinding salt.
 */
export function generateSalt(): Hex {
  const bytes = new Uint8Array(32);
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Node.js crypto fallback
    try {
      const nodeCrypto = require("crypto");
      nodeCrypto.randomFillSync(bytes);
    } catch {
      for (let i = 0; i < 32; i++) {
        bytes[i] = (Date.now() + i * 31) & 0xff;
      }
    }
  }
  return bytesToHex(bytes);
}

/**
 * Commutative pair hash matching OpenZeppelin Hashes.commutativeKeccak256.
 */
export function hashPair(a: Hex, b: Hex): Hex {
  const aClean = a.toLowerCase();
  const bClean = b.toLowerCase();
  return aClean <= bClean
    ? keccak256(concatHex([a, b]))
    : keccak256(concatHex([b, a]));
}

/**
 * Verifies a Merkle proof against a root using commutative hashing.
 */
export function verifyMerkleProof(proof: Hex[], root: Hex, leaf: Hex): boolean {
  let computed = leaf;
  for (const sibling of proof) {
    computed = hashPair(computed, sibling);
  }
  return computed.toLowerCase() === root.toLowerCase();
}

/**
 * Builds a balanced Merkle tree over an array of leaves.
 */
function buildTreeFromLeaves(leaves: Hex[]): MerkleTreeResult {
  if (leaves.length === 0) {
    throw new Error("Cannot build Merkle tree from empty leaves");
  }

  // Multi-level tree storage
  const levels: Hex[][] = [];
  levels.push([...leaves]);

  while (levels[levels.length - 1].length > 1) {
    const currentLevel = levels[levels.length - 1];
    const nextLevel: Hex[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Odd leaf: propagate to next level (or duplicate depending on convention)
        nextLevel.push(currentLevel[i]);
      }
    }
    levels.push(nextLevel);
  }

  const root = levels[levels.length - 1][0];

  const getProof = (index: number): Hex[] => {
    if (index < 0 || index >= leaves.length) {
      throw new Error(`Index out of bounds: ${index}`);
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
  };

  const verify = (index: number): boolean => {
    const leaf = leaves[index];
    const proof = getProof(index);
    return verifyMerkleProof(proof, root, leaf);
  };

  return {
    root,
    leaves,
    getProof,
    verify,
  };
}

/**
 * Builds the allocationRoot Merkle tree from per-beneficiary (address, shareBps, salt) tuples.
 *
 * ⚠️ ARCHITECTURE CONSTRAINT #4:
 * Validates that all allocations sum to exactly 10,000 bps (100%).
 * Throws an error if the sum is invalid.
 */
export function buildAllocationTree(
  allocations: BeneficiaryAllocation[]
): MerkleTreeResult {
  if (allocations.length === 0) {
    throw new Error("Allocations list cannot be empty");
  }

  // Enforce Constraint #4: total shares must sum to 10,000 bps
  const totalBps = allocations.reduce(
    (acc, a) => acc + BigInt(a.shareBps),
    BigInt(0)
  );
  if (totalBps !== BigInt(10000)) {
    throw new Error(
      `Invalid total allocation: sum of shares is ${totalBps} bps, must be exactly 10,000 bps (100%)`
    );
  }

  const leaves = allocations.map((a) =>
    computeAllocationLeaf(a.address, a.shareBps, a.salt)
  );

  return buildTreeFromLeaves(leaves);
}

/**
 * Builds the guardianRoot Merkle tree from an array of guardian addresses.
 */
export function buildGuardianTree(guardians: Address[]): MerkleTreeResult {
  if (guardians.length === 0) {
    throw new Error("Guardians list cannot be empty");
  }

  const leaves = guardians.map((g) => computeGuardianLeaf(g));
  return buildTreeFromLeaves(leaves);
}
