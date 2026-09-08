/**
 * test-eip712.mjs — Verification of client-side EIP-712 typed-data builder and signer
 *
 * Validates that cancelClaim typed data digests and signatures match expected EIP-712
 * specification, and that signatures signed by stealth private keys recover to the
 * correct stealth addresses.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildCancelClaimTypedData,
  hashCancelClaim,
  signCancelClaim,
  verifyCancelClaimSignature,
  CANCEL_CLAIM_TYPES,
} from "../lib/eip712.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesPath = resolve(__dirname, "../../contracts/test/fixtures/stealthKeypairs.json");
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf-8"));

console.log("=== Testing EIP-712 Client Library (eip712.ts) ===");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
  passed++;
}

async function runTests() {
  const chainId = 11155111; // Sepolia
  const verifyingContract = "0x1111222233334444555566667777888899990000";
  const mockVault = "0x9999888877776666555544443333222211110000";
  const nonce = 0n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  // 1. Structure and Types
  const typedData = buildCancelClaimTypedData(
    chainId,
    verifyingContract,
    mockVault,
    nonce,
    deadline
  );

  assert(typedData.domain.name === "ProofOfLifeConsensus", "Domain name is ProofOfLifeConsensus");
  assert(typedData.domain.version === "1", "Domain version is 1");
  assert(typedData.domain.chainId === chainId, "Domain chainId is correct");
  assert(typedData.domain.verifyingContract === verifyingContract, "Domain verifyingContract is correct");
  assert(typedData.primaryType === "CancelClaim", "Primary type is CancelClaim");
  assert(typedData.types.CancelClaim.length === 3, "CancelClaim has 3 fields");
  assert(typedData.types.CancelClaim[0].name === "vaultId", "First field is vaultId");
  assert(typedData.types.CancelClaim[1].name === "nonce", "Second field is nonce");
  assert(typedData.types.CancelClaim[2].name === "deadline", "Third field is deadline");

  // 2. Hash generation
  const digest = hashCancelClaim(typedData);
  assert(typeof digest === "string" && digest.startsWith("0x") && digest.length === 66, "Generates 32-byte digest hash");

  // 3. Signing and Recovery for all 3 stealth owners
  for (const [key, owner] of Object.entries(fixtures)) {
    console.log(`\n--- Testing owner: ${owner.label} (${key}) ---`);
    const sig = await signCancelClaim(owner.stealthPrivateKey, typedData);
    assert(typeof sig === "string" && sig.startsWith("0x") && sig.length === 132, `Signature generated for ${key} (65 bytes)`);

    const recovered = await verifyCancelClaimSignature(typedData, sig);
    assert(
      recovered.toLowerCase() === owner.stealthAddress.toLowerCase(),
      `Recovered address ${recovered} matches stealth address ${owner.stealthAddress}`
    );
  }

  // 4. Nonce variation alters digest
  const typedDataNonce1 = buildCancelClaimTypedData(
    chainId,
    verifyingContract,
    mockVault,
    1n,
    deadline
  );
  const digestNonce1 = hashCancelClaim(typedDataNonce1);
  assert(digest !== digestNonce1, "Changing nonce changes EIP-712 digest");

  // 5. Deadline variation alters digest
  const typedDataDeadline2 = buildCancelClaimTypedData(
    chainId,
    verifyingContract,
    mockVault,
    nonce,
    deadline + 100n
  );
  const digestDeadline2 = hashCancelClaim(typedDataDeadline2);
  assert(digest !== digestDeadline2, "Changing deadline changes EIP-712 digest");

  console.log(`\nAll ${passed}/${total} EIP-712 tests passed successfully!`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
