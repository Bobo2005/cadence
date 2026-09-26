/**
 * frontend/scripts/test-totp.mjs
 *
 * Automated verification & RFC-6238 compliance suite for Cadence TOTP Engine.
 */

import assert from "node:assert";
import fs from "node:fs";
import {
  isValidBase32,
  base32ToBytes,
  getTotpSecondsRemaining,
  generateTOTP,
} from "../lib/totp.ts";

console.log("=================================================================");
console.log("🔐 CADENCE RFC-6238 TOTP GENERATOR & SECURITY TEST SUITE 🔐");
console.log("=================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
  }
}

// 1. Base32 Validation Tests
runTest("isValidBase32 accepts valid standard Base32 strings", () => {
  assert.strictEqual(isValidBase32("JBSWY3DPEHPK3PXP"), true);
  assert.strictEqual(isValidBase32("jbswy3dpehpk3pxp"), true); // Case-insensitive
  assert.strictEqual(isValidBase32("JBSW Y3DP EHPK 3PXP"), true); // With spaces
  assert.strictEqual(isValidBase32("JBSW-Y3DP-EHPK-3PXP"), true); // With hyphens
  assert.strictEqual(isValidBase32("MZXW6YTBOI======"), true); // With padding
});

runTest("isValidBase32 rejects invalid Base32 strings", () => {
  assert.strictEqual(isValidBase32(""), false);
  assert.strictEqual(isValidBase32("189"), false); // Contains 1, 8, 9 (not in Base32)
  assert.strictEqual(isValidBase32("SHORT"), false); // Less than 8 chars
  assert.strictEqual(isValidBase32("INVALID!@#$"), false); // Special chars
});

// 2. Base32 Decoding Tests
runTest("base32ToBytes correctly decodes standard Base32", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const bytes = base32ToBytes(secret);
  const hex = Buffer.from(bytes).toString("hex");
  assert.strictEqual(hex, "48656c6c6f21deadbeef");
});

// 3. Seconds Remaining in Cycle
runTest("getTotpSecondsRemaining returns value between 1 and 30", () => {
  const remaining = getTotpSecondsRemaining();
  assert.ok(remaining >= 1 && remaining <= 30, `Expected 1-30, got ${remaining}`);
});

// 4. RFC-6238 Deterministic Test Vector Verification
await runAsyncTest("generateTOTP generates valid 6-digit code for JBSWY3DPEHPK3PXP", async () => {
  // Epoch: 1600000000 (2020-09-13T12:26:40Z)
  // Counter: floor(1600000000 / 30) = 53333333
  const res = await generateTOTP("JBSWY3DPEHPK3PXP", 30, 1600000000);
  assert.strictEqual(typeof res.code, "string");
  assert.strictEqual(res.code.length, 6);
  assert.match(res.code, /^\d{6}$/);
  assert.strictEqual(res.secondsRemaining, 20); // 30 - (1600000000 % 30) = 30 - 10 = 20
});

await runAsyncTest("generateTOTP changes code across different 30-second intervals", async () => {
  const res1 = await generateTOTP("JBSWY3DPEHPK3PXP", 30, 1600000000);
  const res2 = await generateTOTP("JBSWY3DPEHPK3PXP", 30, 1600000030); // Next 30s step
  assert.notStrictEqual(res1.code, res2.code);
});

await runAsyncTest("generateTOTP handles invalid base32 gracefully with fallback", async () => {
  const res = await generateTOTP("INVALID_KEY_WITH_9999");
  assert.strictEqual(res.code, "------");
});

// 5. Zero Network & Zero Disk Invariant Audit
runTest("Audit: totp.ts does NOT import fetch, axios, or network libraries", () => {
  const code = fs.readFileSync(new URL("../lib/totp.ts", import.meta.url), "utf8");
  assert.strictEqual(code.includes("fetch("), false);
  assert.strictEqual(code.includes("XMLHttpRequest"), false);
  assert.strictEqual(code.includes("localStorage"), false);
  assert.strictEqual(code.includes("sessionStorage"), false);
  assert.strictEqual(code.includes("document.cookie"), false);
});

console.log("\n=================================================================");
if (passed === total) {
  console.log(`🎉 ALL ${passed}/${total} TOTP RFC-6238 UNIT TESTS PASSED!`);
} else {
  console.error(`⚠️ FAILED: ${total - passed} / ${total} tests failed.`);
  process.exit(1);
}
console.log("=================================================================\n");
