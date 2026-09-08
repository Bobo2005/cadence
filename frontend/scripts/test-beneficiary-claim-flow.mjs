/**
 * test-beneficiary-claim-flow.mjs — End-to-end client integration test for the beneficiary claim path
 *
 * Validates the full flow:
 * 1. Vault Owner sets up allocation and encrypts payload per beneficiary using ECIES (lib/encryption.ts).
 * 2. Merkle tree and commitment root are generated (lib/merkle.ts).
 * 3. Beneficiary discovers vault and decrypts payload locally using their wallet private key.
 * 4. Recovers (shareBps, salt) with zero plaintext leakage to chain.
 * 5. Generates Merkle proof against allocationRoot and verifies proof client-side.
 * 6. Enforces that other beneficiaries cannot decrypt each other's payloads.
 * 7. Enforces that tampered shares fail Merkle proof verification.
 * 8. Verifies claim calldata encoding for smart contract submission.
 */

import EthCrypto from "eth-crypto";
import {
  computeAllocationLeaf,
  buildAllocationTree,
  verifyMerkleProof,
  generateSalt,
} from "../lib/merkle.ts";
import {
  encryptAllocation,
  decryptAllocation,
  getPublicKeyFromPrivateKey,
} from "../lib/encryption.ts";
import {
  encodeClaimCalldata,
  formatConsensusState,
  ConsensusState,
} from "../lib/contracts.ts";
import {
  DEMO_BENEFICIARIES,
  SEED_VAULTS,
  generateProofFromLeaves,
  findVaultsForBeneficiary,
} from "../lib/vaultRegistry.ts";

console.log("=== Testing Beneficiary Claim Flow Integration ===");

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
  // 1. Beneficiary Identities
  const alice = EthCrypto.createIdentity();
  const bob = EthCrypto.createIdentity();
  const stranger = EthCrypto.createIdentity();

  const alicePk = getPublicKeyFromPrivateKey(alice.privateKey);
  const bobPk = getPublicKeyFromPrivateKey(bob.privateKey);

  assert(alice.address !== bob.address, "Generated independent beneficiary identities");

  // 2. Vault Owner setup
  const saltAlice = generateSalt();
  const saltBob = generateSalt();

  const allocAlice = { address: alice.address, shareBps: 4000, salt: saltAlice };
  const allocBob = { address: bob.address, shareBps: 6000, salt: saltBob };

  // 3. Merkle tree construction (Constraint #4: total is 10,000 bps)
  const tree = buildAllocationTree([allocAlice, allocBob]);
  assert(tree.root.startsWith("0x"), `allocationRoot generated: ${tree.root}`);
  assert(tree.leaves.length === 2, "Tree contains 2 allocation leaves");

  // 4. ECIES encryption of allocation payloads (Constraint #3: Allocation Privacy)
  const encAliceStr = await encryptAllocation(alicePk, allocAlice);
  const encBobStr = await encryptAllocation(bobPk, allocBob);

  assert(typeof encAliceStr === "string" && encAliceStr.length > 100, "Alice allocation encrypted via ECIES");
  assert(typeof encBobStr === "string" && encBobStr.length > 100, "Bob allocation encrypted via ECIES");

  // 5. Beneficiary Discovery & Decryption Path for Alice
  const recoveredAlice = await decryptAllocation(alice.privateKey, encAliceStr);
  assert(recoveredAlice.shareBps === 4000, `Alice recovered exact share: ${recoveredAlice.shareBps} bps (40.00%)`);
  assert(recoveredAlice.salt.toLowerCase() === saltAlice.toLowerCase(), "Alice recovered exact blinding salt");

  // 6. Cross-Beneficiary Privacy Protection
  let bobDecryptedAlice = false;
  try {
    await decryptAllocation(bob.privateKey, encAliceStr);
    bobDecryptedAlice = true;
  } catch {
    bobDecryptedAlice = false;
  }
  assert(!bobDecryptedAlice, "Bob CANNOT decrypt Alice's allocation payload (ECIES isolation)");

  // 7. Decryption Path for Bob
  const recoveredBob = await decryptAllocation(bob.privateKey, encBobStr);
  assert(recoveredBob.shareBps === 6000, `Bob recovered exact share: ${recoveredBob.shareBps} bps (60.00%)`);
  assert(recoveredBob.salt.toLowerCase() === saltBob.toLowerCase(), "Bob recovered exact blinding salt");

  // 8. Merkle Proof Generation & Verification for Alice
  const leafAlice = computeAllocationLeaf(alice.address, recoveredAlice.shareBps, recoveredAlice.salt);
  const proofAlice = generateProofFromLeaves(tree.leaves, leafAlice);
  assert(proofAlice.length > 0, "Alice Merkle proof path generated");

  const isAliceProofValid = verifyMerkleProof(proofAlice, tree.root, leafAlice);
  assert(isAliceProofValid, "Alice Merkle proof verifies against allocationRoot");

  // 9. Merkle Proof Generation & Verification for Bob
  const leafBob = computeAllocationLeaf(bob.address, recoveredBob.shareBps, recoveredBob.salt);
  const proofBob = generateProofFromLeaves(tree.leaves, leafBob);
  const isBobProofValid = verifyMerkleProof(proofBob, tree.root, leafBob);
  assert(isBobProofValid, "Bob Merkle proof verifies against allocationRoot");

  // 10. Tampering & Fraud Resistance
  // Case A: Alice tries to claim 50% instead of 40%
  const tamperedLeaf = computeAllocationLeaf(alice.address, 5000, recoveredAlice.salt);
  const isTamperedValid = verifyMerkleProof(proofAlice, tree.root, tamperedLeaf);
  assert(!isTamperedValid, "Tampered share percentage (50% instead of 40%) fails Merkle proof verification");

  // Case B: Stranger tries to claim Alice's leaf
  const strangerLeaf = computeAllocationLeaf(stranger.address, recoveredAlice.shareBps, recoveredAlice.salt);
  const isStrangerValid = verifyMerkleProof(proofAlice, tree.root, strangerLeaf);
  assert(!isStrangerValid, "Stranger cannot steal Alice's claim using her proof and salt");

  // 11. Contract Claim Calldata Encoding
  const calldata = encodeClaimCalldata(recoveredAlice.shareBps, recoveredAlice.salt, proofAlice);
  assert(calldata.startsWith("0x"), "claim(uint256,bytes32,bytes32[]) calldata encoded successfully");

  // 12. Test Pre-Seeded Vault Registry & Personas
  const seedVault = SEED_VAULTS[0];
  assert(seedVault !== undefined && seedVault.vaultAddress.startsWith("0x"), "Seed demo vault configured with Sepolia address");

  const demoAlice = DEMO_BENEFICIARIES[0];
  const aliceVaults = findVaultsForBeneficiary(demoAlice.address);
  assert(aliceVaults.length > 0, "findVaultsForBeneficiary discovers vault for Demo Alice");

  const demoAliceRecord = seedVault.encryptedAllocations.find(
    (a) => a.beneficiary.toLowerCase() === demoAlice.address.toLowerCase()
  );
  assert(demoAliceRecord !== undefined, "Found Demo Alice encrypted allocation record");

  const demoDecrypted = await decryptAllocation(demoAlice.privateKey, demoAliceRecord.ciphertext);
  assert(demoDecrypted.shareBps === 4000, "Demo Alice decrypts exact 4,000 bps from seed ciphertext");

  const demoLeaf = computeAllocationLeaf(demoAlice.address, demoDecrypted.shareBps, demoDecrypted.salt);
  const demoProof = generateProofFromLeaves(seedVault.leaves, demoLeaf);
  assert(verifyMerkleProof(demoProof, seedVault.allocationRoot, demoLeaf), "Demo Alice proof verifies against seed allocationRoot");

  // 13. State formatting helper check
  const finalizedFormat = formatConsensusState(ConsensusState.Finalized);
  assert(finalizedFormat.label === "Finalized", "Consensus state label formatted correctly");

  console.log(`\nAll ${passed}/${total} Beneficiary Claim Flow integration tests passed!`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
