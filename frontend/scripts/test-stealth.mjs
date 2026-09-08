// test-stealth.mjs — Comprehensive automated tests for stealth.ts EIP-5564 implementation
import {
  generateStealthMetaAddress,
  generateStealthAddress,
  computeStealthPrivateKey,
  checkStealthAddress,
  formatStealthMetaAddress,
  parseStealthMetaAddress,
} from "../lib/stealth.ts";
import { privateKeyToAccount } from "viem/accounts";
import { hashMessage, recoverAddress } from "viem";

console.log("=== Testing EIP-5564 Stealth Address Pipeline ===");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ PASS: ${message}`);
}

// Test 1: Generate stealth meta-address
const meta = generateStealthMetaAddress();
assert(meta.spendingPrivateKey?.length === 66, "Spending private key length is 32 bytes hex");
assert(meta.spendingPublicKey.length === 132, "Spending public key is uncompressed 65 bytes hex");
assert(meta.viewingPrivateKey?.length === 66, "Viewing private key length is 32 bytes hex");
assert(meta.viewingPublicKey.length === 132, "Viewing public key is uncompressed 65 bytes hex");

// Test 2: Generate stealth address from meta-address
const stealthRes = generateStealthAddress(meta.spendingPublicKey, meta.viewingPublicKey);
assert(stealthRes.stealthAddress.startsWith("0x") && stealthRes.stealthAddress.length === 42, "Stealth address is valid 20-byte Ethereum address");
assert(stealthRes.ephemeralPublicKey.length === 132, "Ephemeral public key is 65 bytes hex");
assert(stealthRes.viewTag.startsWith("0x") && stealthRes.viewTag.length === 4, "View tag is 1 byte hex");

// Test 3: Recipient computes stealth private key
const stealthPrivKey = computeStealthPrivateKey(
  meta.spendingPrivateKey,
  meta.viewingPrivateKey,
  stealthRes.ephemeralPublicKey
);
assert(stealthPrivKey.startsWith("0x") && stealthPrivKey.length === 66, "Derived stealth private key is 32 bytes hex");

// Test 4: Verify derived stealth private key matches stealth address
const account = privateKeyToAccount(stealthPrivKey);
assert(
  account.address.toLowerCase() === stealthRes.stealthAddress.toLowerCase(),
  `Stealth private key derives exact stealth address (${account.address} === ${stealthRes.stealthAddress})`
);

// Test 5: Verify signature by stealth private key recovers to stealth address
const message = "CancelClaim(uint256 vaultId,uint256 nonce,uint256 deadline)";
const sig = await account.signMessage({ message });
const recovered = await recoverAddress({ hash: hashMessage(message), signature: sig });
assert(
  recovered.toLowerCase() === stealthRes.stealthAddress.toLowerCase(),
  `ECDSA signature signed by stealth private key recovers to stealth address (${recovered} === ${stealthRes.stealthAddress})`
);

// Test 6: checkStealthAddress helper
const belongs = checkStealthAddress(
  stealthRes.stealthAddress,
  stealthRes.ephemeralPublicKey,
  meta.viewingPrivateKey,
  meta.spendingPublicKey,
  stealthRes.viewTag
);
assert(belongs === true, "checkStealthAddress confirms ownership with view tag");

// Test 7: checkStealthAddress with wrong address
const wrongCheck = checkStealthAddress(
  "0x0000000000000000000000000000000000000001",
  stealthRes.ephemeralPublicKey,
  meta.viewingPrivateKey,
  meta.spendingPublicKey,
  stealthRes.viewTag
);
assert(wrongCheck === false, "checkStealthAddress rejects non-matching address");

// Test 8: formatStealthMetaAddress and parseStealthMetaAddress
const formatted = formatStealthMetaAddress(meta.spendingPublicKey, meta.viewingPublicKey);
assert(formatted.startsWith("st:eth:"), "Formatted URI has st:eth prefix");
const parsed = parseStealthMetaAddress(formatted);
assert(parsed.spendingPublicKey.toLowerCase() === meta.spendingPublicKey.toLowerCase(), "Parsed spending key matches");
assert(parsed.viewingPublicKey.toLowerCase() === meta.viewingPublicKey.toLowerCase(), "Parsed viewing key matches");

// Test 9: Loop 25 random derivations to ensure 100% cryptographic reliability
console.log("\n--- Running 25 random derivation cycles ---");
for (let i = 0; i < 25; i++) {
  const m = generateStealthMetaAddress();
  const s = generateStealthAddress(m.spendingPublicKey, m.viewingPublicKey);
  const p = computeStealthPrivateKey(m.spendingPrivateKey, m.viewingPrivateKey, s.ephemeralPublicKey);
  const acc = privateKeyToAccount(p);
  if (acc.address.toLowerCase() !== s.stealthAddress.toLowerCase()) {
    console.error(`Cycle ${i} failed: ${acc.address} !== ${s.stealthAddress}`);
    process.exit(1);
  }
}
console.log("✅ PASS: All 25 random derivation cycles succeeded with 100% address accuracy!");

console.log(`\n🎉 All ${passed}/${total} test assertions passed!`);
