/**
 * stealth.ts — EIP-5564 stealth address keygen and derivation
 *
 * Implements the complete EIP-5564 stealth address pipeline on secp256k1:
 * - Generate stealth meta-addresses (spending and viewing keypairs).
 * - Derive one-time stealth addresses from a recipient's stealth meta-address.
 * - Recover the stealth private key using the ephemeral public key and viewing private key.
 * - Check if a stealth address belongs to a recipient (view tag scanning).
 *
 * ⚠️ ARCHITECTURE CONSTRAINT #2:
 * All test fixtures in ContestableClaim (Prompt 8) must sign with real stealth keys
 * derived via this pipeline, never mock EOAs.
 * See docs/ARCHITECTURE.md and docs/MEMORY.md.
 */

import { secp256k1 } from "@noble/curves/secp256k1.js";
import {
  keccak256,
  hexToBytes,
  bytesToHex,
  getAddress,
  type Hex,
} from "viem";

const SECP256K1_N = secp256k1.Point.Fn.ORDER;

export interface StealthMetaAddress {
  spendingPrivateKey?: Hex;
  spendingPublicKey: Hex;
  viewingPrivateKey?: Hex;
  viewingPublicKey: Hex;
}

export interface StealthAddressResult {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: Hex;
  ephemeralPrivateKey?: Hex;
  viewTag: Hex;
}

export interface VerifiedStealthKeypair {
  spendingPrivateKey: Hex;
  spendingPublicKey: Hex;
  viewingPrivateKey: Hex;
  viewingPublicKey: Hex;
  ephemeralPrivateKey: Hex;
  ephemeralPublicKey: Hex;
  sharedSecretScalar: Hex;
  stealthAddress: `0x${string}`;
  stealthPrivateKey: Hex;
  viewTag: Hex;
}

/**
 * Generates a cryptographically secure random 32-byte private key.
 */
function randomPrivateKey(): Hex {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    nodeCrypto.randomFillSync(bytes);
  }
  return bytesToHex(bytes);
}

/**
 * Normalizes a hex string by ensuring a leading '0x'.
 */
function normalizeHex(hex: string): Hex {
  return (hex.startsWith("0x") ? hex : `0x${hex}`) as Hex;
}

/**
 * Strips the '0x' prefix from a hex string.
 */
function cleanHex(hex: string): string {
  return hex.replace(/^0x/, "");
}

/**
 * Generates an EIP-5564 stealth meta-address consisting of a spending keypair
 * and a viewing keypair on secp256k1.
 */
export function generateStealthMetaAddress(): StealthMetaAddress {
  const spendingPrivateKey = randomPrivateKey();
  const spendingPublicKeyBytes = secp256k1.getPublicKey(hexToBytes(spendingPrivateKey), false);
  const spendingPublicKey = bytesToHex(spendingPublicKeyBytes);

  const viewingPrivateKey = randomPrivateKey();
  const viewingPublicKeyBytes = secp256k1.getPublicKey(hexToBytes(viewingPrivateKey), false);
  const viewingPublicKey = bytesToHex(viewingPublicKeyBytes);

  return {
    spendingPrivateKey,
    spendingPublicKey,
    viewingPrivateKey,
    viewingPublicKey,
  };
}

/**
 * Derives a one-time stealth address for a recipient given their stealth meta-address public keys.
 *
 * Algorithm (EIP-5564 secp256k1):
 * 1. Sender generates ephemeral keypair (r, R = r*G).
 * 2. Shared secret point: S = r * K_view.
 * 3. Shared secret scalar: s = keccak256(S_compressed) mod n.
 * 4. Stealth public key: P = K_spend + s*G.
 * 5. Stealth address: last 20 bytes of keccak256(P_uncompressed[1..65]).
 * 6. View tag: first byte of keccak256(S_compressed).
 */
export function generateStealthAddress(
  spendingPublicKey: string,
  viewingPublicKey: string,
  customEphemeralPrivateKey?: Hex
): StealthAddressResult {
  const ephemeralPrivateKey = customEphemeralPrivateKey ?? randomPrivateKey();
  const ephemeralPublicKeyBytes = secp256k1.getPublicKey(hexToBytes(ephemeralPrivateKey), false);
  const ephemeralPublicKey = bytesToHex(ephemeralPublicKeyBytes);

  // Compute shared secret S = r * K_view (compressed 33 bytes)
  const sharedSecret = secp256k1.getSharedSecret(
    hexToBytes(ephemeralPrivateKey),
    hexToBytes(normalizeHex(viewingPublicKey)),
    true
  );

  const sharedSecretHash = keccak256(sharedSecret);
  const s = BigInt(sharedSecretHash) % SECP256K1_N;

  // P = K_spend + s*G
  const sG = secp256k1.Point.BASE.multiply(s);
  const K_spend_point = secp256k1.Point.fromHex(cleanHex(spendingPublicKey));
  const P = K_spend_point.add(sG);

  // Uncompressed public key without 0x04 prefix for Ethereum address derivation
  const P_hex = P.toHex(false); // 130 hex chars (65 bytes with 04 prefix)
  const P_coords = normalizeHex(P_hex.slice(2)); // coordinates without 04 prefix
  const stealthAddress = getAddress(`0x${keccak256(P_coords).slice(26)}`);

  // 1-byte view tag
  const viewTag = `0x${sharedSecretHash.slice(2, 4)}` as Hex;

  return {
    stealthAddress,
    ephemeralPublicKey,
    ephemeralPrivateKey,
    viewTag,
  };
}

/**
 * Derives the stealth private key for a one-time stealth address.
 *
 * Algorithm:
 * 1. Recipient computes shared secret: S = k_view * R (compressed 33 bytes).
 * 2. Shared secret scalar: s = keccak256(S_compressed) mod n.
 * 3. Stealth private key: p = (k_spend + s) mod n.
 */
export function computeStealthPrivateKey(
  spendingPrivateKey: string,
  viewingPrivateKey: string,
  ephemeralPublicKey: string
): Hex {
  const sharedSecret = secp256k1.getSharedSecret(
    hexToBytes(normalizeHex(viewingPrivateKey)),
    hexToBytes(normalizeHex(ephemeralPublicKey)),
    true
  );

  const sharedSecretHash = keccak256(sharedSecret);
  const s = BigInt(sharedSecretHash) % SECP256K1_N;

  const k_spend = BigInt(normalizeHex(spendingPrivateKey));
  const p = (k_spend + s) % SECP256K1_N;

  const p_hex = `0x${p.toString(16).padStart(64, "0")}` as Hex;
  return p_hex;
}

/**
 * Checks whether a given stealth address belongs to a recipient using their viewing private key
 * and spending public key.
 */
export function checkStealthAddress(
  stealthAddress: string,
  ephemeralPublicKey: string,
  viewingPrivateKey: string,
  spendingPublicKey: string,
  viewTag?: string
): boolean {
  const sharedSecret = secp256k1.getSharedSecret(
    hexToBytes(normalizeHex(viewingPrivateKey)),
    hexToBytes(normalizeHex(ephemeralPublicKey)),
    true
  );

  const sharedSecretHash = keccak256(sharedSecret);

  // Fast check view tag if provided
  if (viewTag) {
    const computedTag = `0x${sharedSecretHash.slice(2, 4)}`.toLowerCase();
    if (computedTag !== viewTag.toLowerCase()) {
      return false;
    }
  }

  const s = BigInt(sharedSecretHash) % SECP256K1_N;
  const sG = secp256k1.Point.BASE.multiply(s);
  const K_spend_point = secp256k1.Point.fromHex(cleanHex(spendingPublicKey));
  const P = K_spend_point.add(sG);

  const P_hex = P.toHex(false);
  const P_coords = normalizeHex(P_hex.slice(2));
  const derivedAddress = getAddress(`0x${keccak256(P_coords).slice(26)}`);

  return derivedAddress.toLowerCase() === stealthAddress.toLowerCase();
}

/**
 * Formats spending and viewing public keys into the standard EIP-5564 URI format:
 * `st:eth:<spendingPubKey>:<viewingPubKey>`
 */
export function formatStealthMetaAddress(
  spendingPublicKey: string,
  viewingPublicKey: string
): string {
  return `st:eth:${cleanHex(spendingPublicKey)}:${cleanHex(viewingPublicKey)}`;
}

/**
 * Parses a standard EIP-5564 URI into its spending and viewing public key components.
 */
export function parseStealthMetaAddress(encoded: string): {
  spendingPublicKey: Hex;
  viewingPublicKey: Hex;
} {
  const parts = encoded.split(":");
  if (parts.length === 4 && parts[0] === "st" && parts[1] === "eth") {
    return {
      spendingPublicKey: normalizeHex(parts[2]),
      viewingPublicKey: normalizeHex(parts[3]),
    };
  }
  if (parts.length === 2) {
    return {
      spendingPublicKey: normalizeHex(parts[0]),
      viewingPublicKey: normalizeHex(parts[1]),
    };
  }
  throw new Error(`Invalid stealth meta-address format: ${encoded}`);
}
