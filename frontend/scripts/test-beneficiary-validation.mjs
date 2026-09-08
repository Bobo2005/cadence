/**
 * test-beneficiary-validation.mjs — Automated verification of client-side allocation validation
 *
 * Verifies Architecture Constraint #4:
 * 1. Total-allocation-sums-to-100% (10,000 bps) validation logic.
 * 2. Rejection of under-allocated and over-allocated inputs before tree building.
 * 3. Auto-balance remainder handling guaranteeing exact 10,000 bps sums.
 * 4. Merkle tree construction and proof verification on valid 10,000 bps inputs.
 */

import { buildAllocationTree, generateSalt } from "../lib/merkle.ts";
import { isAddress } from "viem";

console.log("=== Testing Beneficiary Allocation Validation (Constraint #4) ===");

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

// Helper: autoBalanceEvenly replicating the component logic
function autoBalance(count) {
  if (count <= 0) return [];
  const baseShare = Math.floor(10000 / count);
  const remainder = 10000 - baseShare * count;
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(i === count - 1 ? baseShare + remainder : baseShare);
  }
  return result;
}

// Helper: validation check replicating BeneficiarySetupForm logic
function validateAllocations(items) {
  const totalBps = items.reduce((sum, b) => sum + (Number(b.shareBps) || 0), 0);
  const isExact10000 = totalBps === 10000;
  const areAddressesValid = items.every((b) => b.address && isAddress(b.address));
  const isValid = isExact10000 && areAddressesValid && items.length > 0;
  return { totalBps, isValid, isUnder: totalBps < 10000, isOver: totalBps > 10000 };
}

async function runTests() {
  const addr1 = "0xDaa6d3b0e2329C180929df36a7c523481BBfAfB3";
  const addr2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const addr3 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  // Test 1: Under-allocated allocations (9,999 bps)
  const underAllocated = [
    { address: addr1, shareBps: 5000 },
    { address: addr2, shareBps: 4999 },
  ];
  const resUnder = validateAllocations(underAllocated);
  assert(!resUnder.isValid, "Validation rejects 9,999 bps as invalid");
  assert(resUnder.isUnder, "Correctly identifies under-allocation state");
  assert(resUnder.totalBps === 9999, "Total bps equals 9,999");

  // Verify tree construction throws
  let underThrew = false;
  try {
    buildAllocationTree(underAllocated.map((b) => ({ ...b, salt: generateSalt() })));
  } catch {
    underThrew = true;
  }
  assert(underThrew, "buildAllocationTree blocks tree construction for 9,999 bps");

  // Test 2: Over-allocated allocations (10,001 bps)
  const overAllocated = [
    { address: addr1, shareBps: 6000 },
    { address: addr2, shareBps: 4001 },
  ];
  const resOver = validateAllocations(overAllocated);
  assert(!resOver.isValid, "Validation rejects 10,001 bps as invalid");
  assert(resOver.isOver, "Correctly identifies over-allocation state");
  assert(resOver.totalBps === 10001, "Total bps equals 10,001");

  // Verify tree construction throws
  let overThrew = false;
  try {
    buildAllocationTree(overAllocated.map((b) => ({ ...b, salt: generateSalt() })));
  } catch {
    overThrew = true;
  }
  assert(overThrew, "buildAllocationTree blocks tree construction for 10,001 bps");

  // Test 3: Invalid address with valid 10,000 bps
  const invalidAddrList = [
    { address: "not-an-address", shareBps: 5000 },
    { address: addr2, shareBps: 5000 },
  ];
  const resInvalidAddr = validateAllocations(invalidAddrList);
  assert(!resInvalidAddr.isValid, "Validation rejects invalid Ethereum address even if sum is 10,000 bps");

  // Test 4: Exactly 10,000 bps across 2 beneficiaries (60% / 40%)
  const valid2 = [
    { address: addr1, shareBps: 6000 },
    { address: addr2, shareBps: 4000 },
  ];
  const resValid2 = validateAllocations(valid2);
  assert(resValid2.isValid, "Validation accepts 6000 + 4000 = 10,000 bps");
  assert(resValid2.totalBps === 10000, "Total bps equals 10,000");

  const tree2 = buildAllocationTree(valid2.map((b) => ({ ...b, salt: generateSalt() })));
  assert(tree2.root.startsWith("0x"), "Merkle tree root generated successfully for 2 beneficiaries");
  assert(tree2.leaves.length === 2, "Tree contains 2 leaves");
  assert(tree2.verify(0), "Merkle proof for beneficiary 1 verifies against root");
  assert(tree2.verify(1), "Merkle proof for beneficiary 2 verifies against root");

  // Test 5: Auto-balance arithmetic tests for 1, 2, 3, 4, 7, 13 beneficiaries
  for (const n of [1, 2, 3, 4, 7, 10, 13]) {
    const shares = autoBalance(n);
    const sum = shares.reduce((a, b) => a + b, 0);
    assert(sum === 10000, `Auto-balance across ${n} beneficiaries sums to exactly 10,000 bps`);
  }

  // Test 6: Exactly 10,000 bps with 3 beneficiaries from auto-balance (3333, 3333, 3334)
  const shares3 = autoBalance(3);
  assert(shares3[0] === 3333 && shares3[1] === 3333 && shares3[2] === 3334, "Auto-balance 3-way split gives 3333, 3333, 3334");
  const valid3 = [
    { address: addr1, shareBps: shares3[0] },
    { address: addr2, shareBps: shares3[1] },
    { address: addr3, shareBps: shares3[2] },
  ];
  const resValid3 = validateAllocations(valid3);
  assert(resValid3.isValid, "Validation accepts auto-balanced 3-way split (10,000 bps)");

  const tree3 = buildAllocationTree(valid3.map((b) => ({ ...b, salt: generateSalt() })));
  assert(tree3.leaves.length === 3, "Merkle tree built successfully with 3 leaves");
  assert(tree3.verify(0) && tree3.verify(1) && tree3.verify(2), "All 3 Merkle proofs verify");

  console.log(`\nAll ${passed}/${total} validation tests passed successfully!`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
