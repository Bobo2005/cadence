/**
 * test-balance-commitment.mjs — Benchmark and validation for Day 13 Go/No-Go Protocol
 *
 * Evaluates the three criteria from docs/PROJECT-PLAN.md Feature Spotlight B:
 * 1. On-chain verification gas (< 300k gas) — tested via Foundry.
 * 2. Client-side commitment generation latency (< ~3 seconds).
 * 3. Claim flow consistency — tests reveal proof, scalar-field mismatch (F_q vs uint256),
 *    and pro-rata fractional rounding errors.
 */

console.log("=== Testing Balance Commitment (Day 13 Go/No-Go Evaluation) ===");

const p = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function mod(a, m = p) {
  const r = a % m;
  return r >= 0n ? r : r + m;
}

function modInverse(a, m = p) {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }
  return mod(old_s, m);
}

function pointAdd(P, Q) {
  if (!P) return Q;
  if (!Q) return P;
  if (P.x === Q.x && P.y === Q.y) return pointDouble(P);
  if (P.x === Q.x) return null;
  const m = mod((Q.y - P.y) * modInverse(Q.x - P.x));
  const x = mod(m * m - P.x - Q.x);
  const y = mod(m * (P.x - x) - P.y);
  return { x, y };
}

function pointDouble(P) {
  if (!P) return null;
  const m = mod((3n * P.x * P.x) * modInverse(2n * P.y));
  const x = mod(m * m - 2n * P.x);
  const y = mod(m * (P.x - x) - P.y);
  return { x, y };
}

function pointMul(P, k) {
  let R = null;
  let B = P;
  k = k % q;
  while (k > 0n) {
    if (k % 2n === 1n) R = pointAdd(R, B);
    B = pointDouble(B);
    k = k / 2n;
  }
  return R;
}

const G = { x: 1n, y: 2n };
const H = { x: 2n, y: 0x23818cde28cf4ea953fe59b1c377fafd461039c17251ff4377313da64ad07e13n };

function generatePedersenCommitment(value, blindingFactor) {
  const vG = pointMul(G, value);
  const rH = pointMul(H, blindingFactor);
  return pointAdd(vG, rH);
}

// =========================================================================
// Benchmark Criterion 2: Client-side Generation Latency
// =========================================================================
console.log("\n--- Criterion 2: Client-Side Generation Latency ---");

const testValue = 10000000000000000000n; // 10 ETH
const ITERATIONS = 5;
const timings = [];

for (let i = 0; i < ITERATIONS; i++) {
  // Generate random 256-bit blinding factor mod q
  const randomBytes = new Uint8Array(32);
  if (globalThis.crypto) globalThis.crypto.getRandomValues(randomBytes);
  const r = BigInt("0x" + Buffer.from(randomBytes).toString("hex")) % q;

  const start = performance.now();
  const commitment = generatePedersenCommitment(testValue, r);
  const duration = performance.now() - start;
  timings.push(duration);
  if (i === 0) {
    console.log(`Commitment point generated: (${commitment.x.toString(16).slice(0, 10)}..., ${commitment.y.toString(16).slice(0, 10)}...)`);
  }
}

const avgLatencyMs = timings.reduce((a, b) => a + b, 0) / timings.length;
const maxLatencyMs = Math.max(...timings);

console.log(`Average client generation time: ${avgLatencyMs.toFixed(2)} ms`);
console.log(`Max client generation time: ${maxLatencyMs.toFixed(2)} ms`);
const criterion2Pass = maxLatencyMs < 3000;
console.log(`Criterion 2 Result: ${criterion2Pass ? "PASS (< 3 seconds)" : "FAIL (>= 3 seconds)"}`);

// =========================================================================
// Benchmark Criterion 3: Claim Flow Consistency & Scalar Field Mismatches
// =========================================================================
console.log("\n--- Criterion 3: Claim Flow Consistency & Scalar Field Mismatch Analysis ---");

let scalarFieldMismatchFound = false;
let roundingMismatchFound = false;

// 1. Scalar Field Overflow Check (uint256 balance >= q)
// Max uint256 is 2^256 - 1. BN254 scalar modulus q is ~2^253.5
const maxUint256 = (1n << 256n) - 1n;
console.log(`uint256 max value: 0x${maxUint256.toString(16).slice(0, 16)}...`);
console.log(`BN254 scalar field modulus q: 0x${q.toString(16).slice(0, 16)}...`);

if (maxUint256 > q) {
  scalarFieldMismatchFound = true;
  console.log("⚠ Scalar field mismatch: Any token with high decimals or large balances where V >= q wraps modulo q!");
  console.log(`  Difference: (maxUint256 - q) = ${(maxUint256 - q).toString(16)}`);
}

// 2. Pro-Rata Homomorphic Division vs Integer Wei Math
// Suppose a vault holds 10 ETH (10^19 wei). Alice is owed 33.33% (3333 bps), Bob 33.33%, Carol 33.34%.
const totalDeposit = 10000000000000000000n; // 10 ETH
const shareA = (totalDeposit * 3333n) / 10000n;
const shareB = (totalDeposit * 3333n) / 10000n;
const shareC = (totalDeposit * 3334n) / 10000n;

// In scalar field modular division: (1/10000) mod q
const inv10000 = modInverse(10000n, q);
const modularShareA = (totalDeposit * 3333n * inv10000) % q;

console.log(`Integer pro-rata wei share: ${shareA.toString()} wei`);
console.log(`Modular scalar field share: ${modularShareA.toString()} wei`);

if (shareA !== modularShareA) {
  roundingMismatchFound = true;
  console.log("⚠ Homomorphic scalar division mismatch: (V * 3333 * 10000^-1) mod q != integer division (V * 3333) / 10000");
  console.log("  In a commitment scheme, fractional shares cannot be computed homomorphically without modular inverse wrapping!");
}

// 3. Negative value / underflow vulnerability without ZK Range Proofs
// Without Bulletproofs or range proofs, -1 mod q = q - 1, which evaluates as a valid point
const fakeValue = q - 1000n; // represents -1000
const rFake = 5555n;
const fakeCommitment = generatePedersenCommitment(fakeValue, rFake);
console.log(`Fake negative commitment (-1000 mod q) point valid: ${fakeCommitment !== null}`);
console.log("⚠ Without ZK range proofs (which cost >2M gas, far exceeding 300k limit), negative values evaluate validly mod q!");

const criterion3Pass = !scalarFieldMismatchFound && !roundingMismatchFound;
console.log(`\nCriterion 3 Result: ${criterion3Pass ? "PASS" : "FAIL (Scalar field / rounding mismatch confirmed)"}`);

// Export results summary
console.log("\n================ SUMMARY ================");
console.log(`Criterion 1 (Gas < 300k): See Foundry test results`);
console.log(`Criterion 2 (Client < 3s): ${criterion2Pass ? "PASS" : "FAIL"}`);
console.log(`Criterion 3 (Claim consistency / no mismatches): ${criterion3Pass ? "PASS" : "FAIL"}`);
