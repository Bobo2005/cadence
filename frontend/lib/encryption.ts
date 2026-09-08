/**
 * encryption.ts — ECIES encrypt/decrypt (EthCrypto)
 *
 * Client-side ECIES encryption for per-beneficiary allocation payloads.
 * The vault stores only an `allocationRoot` Merkle commitment — individual
 * shares are encrypted here using the beneficiary's wallet public key and
 * never sent to the chain in plaintext (Constraint #3: Allocation Privacy).
 *
 * Pattern: EthCrypto (eth-crypto) using ECIES standard format.
 */

import EthCrypto from "eth-crypto";
import type { Hex } from "viem";

export interface AllocationData {
  beneficiary?: string;
  shareBps: number;
  salt: Hex;
}

export interface EncryptedAllocation {
  iv: string;
  ephemPublicKey: string;
  ciphertext: string;
  mac: string;
}

/**
 * Normalizes a secp256k1 public key into EthCrypto-compatible uncompressed format.
 * Strips 0x prefix if present, retaining standard 128-char or 130-char hex string.
 */
function normalizePublicKey(publicKey: string): string {
  let clean = publicKey.trim();
  if (clean.startsWith("0x") || clean.startsWith("0X")) {
    clean = clean.slice(2);
  }
  return clean;
}

/**
 * Normalizes a private key into a 0x-prefixed 32-byte hex string.
 */
function normalizePrivateKey(privateKey: string): string {
  let clean = privateKey.trim();
  if (!clean.startsWith("0x")) {
    clean = `0x${clean}`;
  }
  return clean;
}

/**
 * Derives an uncompressed secp256k1 public key from a private key.
 */
export function getPublicKeyFromPrivateKey(privateKey: string): string {
  const normSk = normalizePrivateKey(privateKey);
  return EthCrypto.publicKeyByPrivateKey(normSk);
}

/**
 * Encrypts an allocation payload (shareBps, salt) using a beneficiary's wallet public key.
 *
 * @param publicKey Uncompressed 64-byte or 65-byte public key of the beneficiary.
 * @param data Plaintext allocation data containing shareBps and blinding salt.
 * @returns Stringified ECIES cipher payload.
 */
export async function encryptAllocation(
  publicKey: string,
  data: AllocationData
): Promise<string> {
  const normPk = normalizePublicKey(publicKey);
  const payloadStr = JSON.stringify({
    beneficiary: data.beneficiary,
    shareBps: Number(data.shareBps),
    salt: data.salt,
  });

  const encrypted = await EthCrypto.encryptWithPublicKey(normPk, payloadStr);
  return EthCrypto.cipher.stringify(encrypted);
}

/**
 * Decrypts an encrypted allocation payload using the beneficiary's wallet private key.
 *
 * @param privateKey The beneficiary's wallet private key.
 * @param encryptedStr The stringified or structured ECIES ciphertext.
 * @returns Recovered AllocationData containing shareBps and blinding salt.
 */
export async function decryptAllocation(
  privateKey: string,
  encryptedStr: string | EncryptedAllocation
): Promise<AllocationData> {
  const normSk = normalizePrivateKey(privateKey);
  const cipher =
    typeof encryptedStr === "string"
      ? EthCrypto.cipher.parse(encryptedStr)
      : encryptedStr;

  const decryptedJson = await EthCrypto.decryptWithPrivateKey(normSk, cipher);
  const parsed = JSON.parse(decryptedJson);

  return {
    beneficiary: parsed.beneficiary,
    shareBps: Number(parsed.shareBps),
    salt: parsed.salt as Hex,
  };
}
