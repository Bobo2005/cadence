/**
 * test-allocation-privacy.mjs — Verification of client-side Merkle tree generation & ECIES encryption
 *
 * Tests:
 * 1. Constraint #4: Enforces 10,000 bps sum check on buildAllocationTree.
 * 2. Parity with Solidity MerkleProofLib leaf calculation.
 * 3. Commutative Merkle root computation and proof verification.
 * 4. Constraint #3: ECIES encryption and decryption of (shareBps, salt) using EthCrypto.
 */

import {
  computeAllocationLeaf,
  computeGuardianLeaf,
  buildAllocationTree,
  buildGuardianTree,
  verifyMerkleProof,
  generateSalt,
  hashPair,
} from "../lib/merkle.ts";
import {
  encryptAllocation,
  decryptAllocation,
  getPublicKeyFromPrivateKey,
} from "../lib/encryption.ts";
import EthCrypto from "eth-crypto";

console.log("=== Testing Allocation Privacy (merkle.ts & encryption.ts) ===");

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
  // Test 1: Leaf computation matches expected double-keccak256
  const testBeneficiary = "0xDaa6d3b0e2329C180929df36a7c523481BBfAfB3";
  const testShareBps = 4000n;
  const testSalt = "0x1111111111111111111111111111111111111111111111111111111111111111";

  const leaf = computeAllocationLeaf(testBeneficiary, testShareBps, testSalt);
  assert(
    leaf === "0x02df6e6e5097bf474571dcdccbf0cb39b424ee963bd31762fa420e9b24be4068",
    "Allocation leaf computation matches Solidity cast keccak exactly"
  );

  // Test 2: Constraint #4 validation — reject invalid total shares (e.g. 9,999 or 10,001)
  const invalidAllocationsUnder = [
    { address: "0x1111111111111111111111111111111111111111", shareBps: 5000, salt: testSalt },
    { address: "0x2222222222222222222222222222222222222222", shareBps: 4999, salt: testSalt },
  ];
  let underThrew = false;
  try {
    buildAllocationTree(invalidAllocationsUnder);
  } catch (err) {
    underThrew = true;
  }
  assert(underThrew, "buildAllocationTree rejects shares summing to 9,999 bps");

  const invalidAllocationsOver = [
    { address: "0x1111111111111111111111111111111111111111", shareBps: 6000, salt: testSalt },
    { address: "0x2222222222222222222222222222222222222222", shareBps: 5000, salt: testSalt },
  ];
  let overThrew = false;
  try {
    buildAllocationTree(invalidAllocationsOver);
  } catch (err) {
    overThrew = true;
  }
  assert(overThrew, "buildAllocationTree rejects shares summing to 11,000 bps");

  // Test 3: Valid 3-beneficiary Merkle tree construction (40%, 35%, 25% = 100%)
  const alice = EthCrypto.createIdentity();
  const bob = EthCrypto.createIdentity();
  const carol = EthCrypto.createIdentity();

  const saltAlice = generateSalt();
  const saltBob = generateSalt();
  const saltCarol = generateSalt();

  const validAllocations = [
    { address: alice.address, shareBps: 4000, salt: saltAlice },
    { address: bob.address, shareBps: 3500, salt: saltBob },
    { address: carol.address, shareBps: 2500, salt: saltCarol },
  ];

  const tree = buildAllocationTree(validAllocations);
  assert(typeof tree.root === "string" && tree.root.startsWith("0x"), "allocationRoot generated");
  assert(tree.leaves.length === 3, "Tree contains 3 leaves");

  // Verify proofs for all 3 beneficiaries
  for (let i = 0; i < validAllocations.length; i++) {
    const proof = tree.getProof(i);
    const valid = verifyMerkleProof(proof, tree.root, tree.leaves[i]);
    assert(valid, `Merkle proof verifies for beneficiary index ${i}`);
  }

  // Cross-leaf proof rejection
  const proof0 = tree.getProof(0);
  const falseVerify = verifyMerkleProof(proof0, tree.root, tree.leaves[1]);
  assert(!falseVerify, "Proof for index 0 fails against leaf 1");

  // Test 4: ECIES encryption and decryption (Constraint #3)
  console.log("\n--- Testing ECIES Encryption/Decryption ---");

  // Alice encrypts her share
  const alicePayload = {
    beneficiary: alice.address,
    shareBps: 4000,
    salt: saltAlice,
  };
  const cipherAlice = await encryptAllocation(alice.publicKey, alicePayload);
  assert(typeof cipherAlice === "string" && cipherAlice.length > 50, "Alice allocation encrypted");

  // Alice decrypts her own share
  const decryptedAlice = await decryptAllocation(alice.privateKey, cipherAlice);
  assert(decryptedAlice.shareBps === 4000, "Alice decrypted exact shareBps (4000)");
  assert(decryptedAlice.salt.toLowerCase() === saltAlice.toLowerCase(), "Alice decrypted exact salt");

  // Bob CANNOT decrypt Alice's ciphertext
  let bobDecryptFailed = false;
  try {
    await decryptAllocation(bob.privateKey, cipherAlice);
  } catch (e) {
    bobDecryptFailed = true;
  }
  assert(bobDecryptFailed, "Bob cannot decrypt Alice's allocation (ECIES security)");

  // Bob encrypts & decrypts his own share
  const bobPayload = {
    beneficiary: bob.address,
    shareBps: 3500,
    salt: saltBob,
  };
  const cipherBob = await encryptAllocation(bob.publicKey, bobPayload);
  const decryptedBob = await decryptAllocation(bob.privateKey, cipherBob);
  assert(decryptedBob.shareBps === 3500, "Bob decrypted exact shareBps (3500)");
  assert(decryptedBob.salt.toLowerCase() === saltBob.toLowerCase(), "Bob decrypted exact salt");

  // Test 5: Guardian tree builder
  const guardianA = "0x1000000000000000000000000000000000000001";
  const guardianB = "0x2000000000000000000000000000000000000002";
  const guardianTree = buildGuardianTree([guardianA, guardianB]);
  assert(guardianTree.leaves.length === 2, "Guardian tree built with 2 leaves");
  assert(guardianTree.verify(0), "Guardian 0 verified");
  assert(guardianTree.verify(1), "Guardian 1 verified");

  console.log(`\nAll ${passed}/${total} Allocation Privacy tests passed successfully!`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
