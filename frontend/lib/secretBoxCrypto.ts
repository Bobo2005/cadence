/**
 * frontend/lib/secretBoxCrypto.ts
 *
 * Client-Side Hybrid Encryption (AES-256-GCM + ECIES) for Off-Chain Legacy Secrets.
 *
 * Architecture:
 * 1. Payload Encryption: Serialized SecretBoxPayload is encrypted using AES-256-GCM
 *    via the native Web Crypto API (globalThis.crypto.subtle) with a fresh 12-byte IV.
 * 2. Key Wrapping: The 256-bit symmetric AES key is encrypted via ECIES (EthCrypto)
 *    using the designated beneficiary's uncompressed secp256k1 public key.
 * 3. Zero Plaintext at Rest: The resulting binary blob prepends the 12-byte IV to the
 *    ciphertext, safe for decentralized pinning (IPFS/Arweave). Decryption occurs strictly
 *    in volatile browser memory.
 */

import EthCrypto from "eth-crypto";
import type { SecretBoxPayload } from "../types/secretBox.ts";

/**
 * Normalizes a secp256k1 public key into EthCrypto-compatible uncompressed format (without 0x prefix).
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

export interface EncryptedSecretBoxResult {
  encryptedBlob: Blob;
  encryptedBytes: Uint8Array;
  encryptedKeyCipher: string;
}

/**
 * Encrypts a SecretBoxPayload client-side using hybrid AES-256-GCM + ECIES.
 *
 * @param beneficiaryPublicKey Uncompressed 64-byte or 65-byte secp256k1 public key.
 * @param payload The structured legacy secrets payload.
 * @returns Encrypted binary blob and stringified ECIES cipher of the AES key.
 */
export async function encryptSecretBox(
  beneficiaryPublicKey: string,
  payload: SecretBoxPayload
): Promise<EncryptedSecretBoxResult> {
  const normPk = normalizePublicKey(beneficiaryPublicKey);

  // 1. Generate an ephemeral 256-bit AES-GCM symmetric key
  const aesKey = await globalThis.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Generate random 12-byte (96-bit) Initialization Vector (IV)
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  // 3. Serialize and encrypt the SecretBox payload
  const encoder = new TextEncoder();
  const serialized = JSON.stringify(payload);
  const encodedPayload = encoder.encode(serialized);

  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encodedPayload
  );

  // 4. Combine IV (12 bytes) + Ciphertext into a contiguous byte sequence
  const encryptedBytes = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  encryptedBytes.set(iv, 0);
  encryptedBytes.set(new Uint8Array(ciphertextBuffer), iv.length);

  const encryptedBlob = new Blob([encryptedBytes], {
    type: "application/octet-stream",
  });

  // 5. Export raw 32-byte AES key and encrypt it via ECIES using the beneficiary's public key
  const rawAesKeyBuffer = await globalThis.crypto.subtle.exportKey("raw", aesKey);
  const rawAesKeyHex = Array.from(new Uint8Array(rawAesKeyBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const encryptedKeyObject = await EthCrypto.encryptWithPublicKey(
    normPk,
    rawAesKeyHex
  );
  const encryptedKeyCipher = EthCrypto.cipher.stringify(encryptedKeyObject);

  return {
    encryptedBlob,
    encryptedBytes,
    encryptedKeyCipher,
  };
}

/**
 * Decrypts an encrypted Secret Box payload in volatile memory using the beneficiary's derived private key.
 *
 * @param derivedPrivateKey The beneficiary's 32-byte secp256k1 private key.
 * @param encryptedKeyCipher The stringified ECIES ciphertext containing the wrapped AES key.
 * @param encryptedBytes Contiguous bytes containing the 12-byte IV followed by AES-GCM ciphertext.
 * @returns The parsed plaintext SecretBoxPayload.
 */
export async function decryptSecretBox(
  derivedPrivateKey: string,
  encryptedKeyCipher: string,
  encryptedBytes: Uint8Array
): Promise<SecretBoxPayload> {
  const normSk = normalizePrivateKey(derivedPrivateKey);

  // 1. Unwrap the symmetric AES key via ECIES
  const parsedCipher = EthCrypto.cipher.parse(encryptedKeyCipher);
  const rawAesKeyHex = await EthCrypto.decryptWithPrivateKey(normSk, parsedCipher);

  if (!rawAesKeyHex || rawAesKeyHex.length !== 64) {
    throw new Error("Invalid unwrapped AES key length");
  }

  // 2. Reconstruct raw AES key bytes and import into Web Crypto
  const keyBytes = new Uint8Array(
    rawAesKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const aesKey = await globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // 3. Extract 12-byte IV and Ciphertext
  if (encryptedBytes.length < 12) {
    throw new Error("Encrypted payload too short: missing 12-byte IV");
  }

  const iv = encryptedBytes.slice(0, 12);
  const ciphertext = encryptedBytes.slice(12);

  // 4. Decrypt ciphertext buffer
  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext
  );

  // 5. Decode JSON payload
  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as SecretBoxPayload;
}
