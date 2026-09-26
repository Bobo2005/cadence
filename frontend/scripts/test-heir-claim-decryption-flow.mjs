/**
 * frontend/scripts/test-heir-claim-decryption-flow.mjs
 *
 * Verifies the Heir Secret Box Decryption Portal Workflow (Prompt 5):
 * 1. Persona Alice signs "Cadence Legacy Box Decryption Authorization".
 * 2. Derives 32-byte ECIES key in-memory.
 * 3. Reads seeded demo ciphertext bytes from local cache.
 * 4. Calls decryptSecretBox(derivedKey, cipher, bytes).
 * 5. Verifies decrypted credentials, masked password reveals, and personal letter.
 */

import fs from "fs/promises";
import path from "path";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256 } from "viem";
import { decryptSecretBox } from "../lib/secretBoxCrypto.ts";

console.log("=== Testing Heir Secret Box Decryption Portal Flow (Prompt 5) ===");

const ALICE_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const ALICE_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const DEMO_ALICE_CID = "bafybeidemo_legacy_box_alice";
const DEMO_ALICE_CIPHER =
  "6eb401489aa6648736b21e214cac561f0208bdbe16d65d2597df9d1df8f86f13284a0966d72d6399ba453d6cb15ed5cad1410dee7b63d928fda1312f465bcd4dbfb2f122c282ba8eb30a502ed5a49dd93bb22a9521cb72f663e70d65587c9e0f01291f751a256e4c4fba818a839a50239af40a7cf73935f6bee760ba8b7d235f7b689d9977afbec62b6724e2486918372dc844dba30199807994fe9fea213a1eeb";

let passed = 0;
let total = 0;
function assert(cond, msg) {
  total++;
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
  passed++;
}

async function run() {
  console.log(`Simulating heir connection: ${ALICE_ADDR}`);

  // Step 1: Ephemeral Signature
  const account = privateKeyToAccount(ALICE_PK);
  const challengeMessage = "Cadence Legacy Box Decryption Authorization";
  const sig = await account.signMessage({ message: challengeMessage });
  assert(Boolean(sig && sig.startsWith("0x")), "Produced deterministic EIP-191 signature");

  // Step 2: In-Memory Key Derivation
  const derivedPrivKey = keccak256(sig);
  assert(derivedPrivKey.length === 66, "Derived 32-byte private key in volatile memory");

  // Step 3: Fetch Ciphertext Bytes
  const filePath = path.join(process.cwd(), ".cache", "secret-boxes", `${DEMO_ALICE_CID}.bin`);
  const fileBuf = await fs.readFile(filePath);
  const ciphertextBytes = new Uint8Array(fileBuf);
  assert(ciphertextBytes.length > 12, "Retrieved valid encrypted octet-stream bytes");

  // Step 4: Decrypt Secret Box in Volatile Memory
  const payload = await decryptSecretBox(derivedPrivKey, DEMO_ALICE_CIPHER, ciphertextBytes);
  assert(payload.version === "1.0", "Payload format version is 1.0");
  assert(payload.beneficiaryAddress === ALICE_ADDR, "Beneficiary matches connected heir");
  assert(Array.isArray(payload.items) && payload.items.length === 4, "Decrypted all 4 credential items");

  // Step 5: Verify Specific Accounts & Credentials
  const coinbase = payload.items.find((i) => i.type === "centralized_exchange");
  assert(coinbase?.title === "Coinbase Family Portfolio (Institutional)", "Coinbase account recovered");
  assert(coinbase?.secret === "C0inb@se-Secur3-2026!#Vault", "Coinbase password unmasked in RAM");

  const onePass = payload.items.find((i) => i.type === "password_manager");
  assert(onePass?.title === "1Password Family Master Key", "1Password credential recovered");

  const shamirShard = payload.items.find((i) => i.type === "hardware_wallet_seed");
  assert(shamirShard?.title.includes("Ledger Cold Storage Shard"), "Hardware seed shard recovered");

  // Step 6: Verify Personal Letter / Will
  assert(Boolean(payload.personalMessage?.includes("My dearest Alice")), "Personal will letter preserved");

  console.log(`\n======================================================`);
  console.log(`✓ ALL ${passed}/${total} CLAIM DECRYPTION PORTAL TESTS PASSED!`);
  console.log(`======================================================\n`);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
