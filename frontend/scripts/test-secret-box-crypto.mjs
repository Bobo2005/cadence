/**
 * frontend/scripts/test-secret-box-crypto.mjs
 *
 * Automated verification suite for the "Encrypted Vault Box" Hybrid Cryptographic Engine:
 * 1. Round-trip encryption and decryption with secp256k1 keypair.
 * 2. Payload integrity verification (complex multi-item credentials & instructions).
 * 3. Tamper resistance (ciphertext alteration causes AES-GCM MAC failure).
 * 4. IV corruption resistance (IV alteration causes decryption authentication failure).
 * 5. Multi-recipient isolation (Recipient A cannot decrypt Recipient B's key cipher).
 */

import EthCrypto from "eth-crypto";
import { encryptSecretBox, decryptSecretBox } from "../lib/secretBoxCrypto.ts";

console.log("=== Testing Encrypted Vault Box Hybrid Cryptography (secretBoxCrypto.ts) ===");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${message}`);
  passed++;
}

async function runTests() {
  // Setup: Generate two distinct secp256k1 keypairs (Alice & Bob)
  const alice = EthCrypto.createIdentity();
  const bob = EthCrypto.createIdentity();

  console.log(`Alice Address: ${alice.address}`);
  console.log(`Bob Address:   ${bob.address}`);

  const samplePayload = {
    version: "1.0",
    vaultAddress: "0x07f9e3f0c0bb2d45300711d4f425917fa493525d",
    beneficiaryAddress: alice.address,
    items: [
      {
        id: "item-1",
        type: "centralized_exchange",
        title: "Coinbase Pro Main Family Fund",
        identifier: "investor@familywealth.com",
        secret: "Sup3rS3cur3P@ssw0rd!2026",
        totpSecret: "JBSWY3DPEHPK3PXP",
        instructions: "Hardware YubiKey #2 is located in the home study lockbox.",
      },
      {
        id: "item-2",
        type: "password_manager",
        title: "1Password Family Master Key",
        identifier: "A3-XXXX-XXXX-XXXX",
        secret: "master-passphrase-phrase-vault",
        instructions: "Emergency recovery kit PDF is in the safety deposit box.",
      },
      {
        id: "item-3",
        type: "hardware_wallet_seed",
        title: "Coldcard Seed Shard (2 of 3)",
        secret: "abandon ability able about above absent absorb abstract absurd abuse access accident",
        instructions: "Combine with Shard #1 held by Attorney Smith.",
      },
      {
        id: "item-4",
        type: "personal_note",
        title: "Message to Alice",
        secret: "Safe combination: 42-18-99",
        instructions: "Take care of the family estate and preserve the long-term streams.",
      },
    ],
    personalMessage: "# To Alice\nEverything in Cadence Streams will vest automatically. Here are the remaining off-chain accounts.",
    createdAt: 1789946000000,
  };

  // Test 1: Encrypt payload for Alice
  console.log("\n[Test 1] Encrypting Secret Box with Alice's public key...");
  const { encryptedBlob, encryptedBytes, encryptedKeyCipher } = await encryptSecretBox(
    alice.publicKey,
    samplePayload
  );

  assert(encryptedBytes instanceof Uint8Array, "Result produces valid contiguous Uint8Array");
  assert(encryptedBytes.length > 12, "Encrypted bytes contain IV + ciphertext (length > 12)");
  assert(typeof encryptedKeyCipher === "string", "Encrypted key cipher is stringified ECIES payload");
  assert(encryptedKeyCipher.length > 100, "ECIES key cipher has appropriate length");

  // Test 2: Alice decrypts the Secret Box in memory
  console.log("\n[Test 2] Decrypting Secret Box using Alice's private key...");
  const decrypted = await decryptSecretBox(
    alice.privateKey,
    encryptedKeyCipher,
    encryptedBytes
  );

  assert(decrypted.version === "1.0", "Decrypted version matches 1.0");
  assert(decrypted.vaultAddress === samplePayload.vaultAddress, "Vault address matches exactly");
  assert(decrypted.beneficiaryAddress === samplePayload.beneficiaryAddress, "Beneficiary address matches");
  assert(decrypted.items.length === 4, "Decrypted 4 distinct secret items");
  assert(decrypted.items[0].secret === "Sup3rS3cur3P@ssw0rd!2026", "CEX password decrypted correctly");
  assert(decrypted.items[0].totpSecret === "JBSWY3DPEHPK3PXP", "TOTP 2FA secret key decrypted bit-for-bit");
  assert(decrypted.items[2].type === "hardware_wallet_seed", "Seed shard type preserved");
  assert(decrypted.personalMessage === samplePayload.personalMessage, "Markdown personal letter matches bit-for-bit");

  // Test 3: Tamper Resistance (Ciphertext Modification)
  console.log("\n[Test 3] Tamper resistance: Modifying ciphertext byte...");
  const tamperedCiphertext = new Uint8Array(encryptedBytes);
  // Flip a bit in the ciphertext section (after 12-byte IV)
  tamperedCiphertext[15] ^= 0xff;

  let tamperFailed = false;
  try {
    await decryptSecretBox(alice.privateKey, encryptedKeyCipher, tamperedCiphertext);
  } catch (err) {
    tamperFailed = true;
  }
  assert(tamperFailed, "Decryption rejects tampered ciphertext (AES-GCM auth tag verification failure)");

  // Test 4: Tamper Resistance (IV Modification)
  console.log("\n[Test 4] Tamper resistance: Modifying IV byte...");
  const tamperedIV = new Uint8Array(encryptedBytes);
  tamperedIV[2] ^= 0xaa;

  let ivTamperFailed = false;
  try {
    await decryptSecretBox(alice.privateKey, encryptedKeyCipher, tamperedIV);
  } catch (err) {
    ivTamperFailed = true;
  }
  assert(ivTamperFailed, "Decryption rejects altered IV (AES-GCM auth tag verification failure)");

  // Test 5: Multi-Recipient Isolation
  console.log("\n[Test 5] Multi-recipient isolation: Bob attempting to decrypt Alice's Secret Box...");
  let isolationFailed = false;
  try {
    await decryptSecretBox(bob.privateKey, encryptedKeyCipher, encryptedBytes);
  } catch (err) {
    isolationFailed = true;
  }
  assert(isolationFailed, "Bob cannot decrypt Alice's wrapped AES key (ECIES decryption fails)");

  // Test 6: Bob encrypts his own Secret Box independently
  console.log("\n[Test 6] Bob encrypts and decrypts his own independent Secret Box...");
  const bobPayload = {
    version: "1.0",
    vaultAddress: "0x07f9e3f0c0bb2d45300711d4f425917fa493525d",
    beneficiaryAddress: bob.address,
    items: [
      {
        id: "bob-1",
        type: "centralized_exchange",
        title: "Kraken Primary",
        secret: "KrakenPassword2026",
      },
    ],
    createdAt: Date.now(),
  };

  const bobEncrypted = await encryptSecretBox(bob.publicKey, bobPayload);
  const bobDecrypted = await decryptSecretBox(
    bob.privateKey,
    bobEncrypted.encryptedKeyCipher,
    bobEncrypted.encryptedBytes
  );

  assert(bobDecrypted.items[0].secret === "KrakenPassword2026", "Bob successfully decrypts his own box");

  console.log(`\n======================================================`);
  console.log(`✓ ALL ${passed}/${total} SECRET BOX CRYPTO TESTS PASSED!`);
  console.log(`======================================================`);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
