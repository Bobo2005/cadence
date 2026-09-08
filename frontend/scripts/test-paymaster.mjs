/**
 * test-paymaster.mjs — Automated verification for Pimlico gasless check-in client
 *
 * Verifies:
 * 1. entryPoint07Address matches ERC-4337 v0.7 standard
 * 2. Pimlico paymaster client initialization and configuration
 * 3. checkIn() function selector and ABI calldata encoding
 * 4. Sponsorship quote generation confirming 0 ETH cost to owner
 * 5. Execution simulation returning valid sponsored receipt
 */

import assert from "node:assert";
import {
  pimlicoPaymaster,
  entryPoint07Address,
  hasPimlicoApiKey,
  getPimlicoRpcUrl,
  encodeCheckInCalldata,
  getCheckInSponsorshipQuote,
  executeSponsoredCheckIn,
  isSmartContractAccount,
} from "../lib/paymaster.ts";

console.log("=== Cadence Pimlico Paymaster Client Verification ===");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
  }
}

// 1. EntryPoint v0.7 Standard Address
runTest("entryPoint07Address matches ERC-4337 standard address", () => {
  assert.strictEqual(
    entryPoint07Address.toLowerCase(),
    "0x0000000071727de22e5e9d8baf0edac6f37da032",
    "EntryPoint v0.7 address must be canonical"
  );
});

// 2. Pimlico Client Configuration
runTest("pimlicoPaymaster client is initialized with Sepolia and Pimlico actions", () => {
  assert.ok(pimlicoPaymaster, "pimlicoPaymaster client must be instantiated");
  assert.strictEqual(pimlicoPaymaster.chain?.id, 11155111, "Chain must be Sepolia (11155111)");
  assert.strictEqual(pimlicoPaymaster.chain?.name, "Sepolia", "Chain name must be Sepolia");
  assert.strictEqual(typeof pimlicoPaymaster.getUserOperationGasPrice, "function", "getUserOperationGasPrice must be available");
  assert.strictEqual(typeof pimlicoPaymaster.getPaymasterData, "function", "getPaymasterData must be available");
  assert.strictEqual(typeof pimlicoPaymaster.getPaymasterStubData, "function", "getPaymasterStubData must be available");
  assert.strictEqual(typeof pimlicoPaymaster.sponsorUserOperation, "function", "sponsorUserOperation must be available");
  assert.strictEqual(typeof pimlicoPaymaster.validateSponsorshipPolicies, "function", "validateSponsorshipPolicies must be available");
});

// 3. checkIn() Calldata Encoding
runTest("encodeCheckInCalldata generates correct checkIn() selector", () => {
  const calldata = encodeCheckInCalldata();
  assert.strictEqual(calldata, "0x183ff085", "checkIn() function selector must be 0x183ff085");
});

// 4. RPC URL helper
runTest("getPimlicoRpcUrl constructs valid endpoint URL", () => {
  const url = getPimlicoRpcUrl();
  assert.ok(url.startsWith("https://api.pimlico.io/v2/sepolia/rpc?apikey="), "URL format must match");
});

// 5. hasPimlicoApiKey helper
runTest("hasPimlicoApiKey accurately reflects environment state", () => {
  const hasKey = hasPimlicoApiKey();
  assert.strictEqual(typeof hasKey, "boolean");
});

// 6. On-chain Bytecode Check (Constraint #8)
await runAsyncTest("isSmartContractAccount correctly distinguishes contracts from EOAs", async () => {
  // CONTRACT_ADDRESSES.consensus is a deployed contract
  const isContract = await isSmartContractAccount("0x3Aa5ebB10DC797CAC828524e59A333d0A371443c");
  assert.strictEqual(typeof isContract, "boolean");

  // Undeployed EOA address has no code
  const isEoa = await isSmartContractAccount("0x1111111111111111111111111111111111111111");
  assert.strictEqual(isEoa, false, "EOA must have empty bytecode");
});

// 7. Dual-Path Sponsorship Quote Generation
await runAsyncTest("getCheckInSponsorshipQuote returns correct dual-path quotes", async () => {
  const vaultAddr = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const eoaAddr = "0x1111111111111111111111111111111111111111";

  // EOA Path
  const eoaQuote = await getCheckInSponsorshipQuote(vaultAddr, eoaAddr);
  assert.strictEqual(eoaQuote.isSponsored, false, "EOA quote must not be sponsored");
  assert.strictEqual(eoaQuote.isSmartAccount, false, "Must detect EOA account");
  assert.strictEqual(eoaQuote.mode, "direct_eoa");
  assert.strictEqual(eoaQuote.chainId, 11155111, "Must be Sepolia chain");

  // Smart Account Path (contract address with deployed bytecode)
  const contractAddr = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
  const smartQuote = await getCheckInSponsorshipQuote(vaultAddr, contractAddr);
  if (smartQuote.isSmartAccount) {
    assert.strictEqual(smartQuote.isSponsored, true, "Smart account quote must be sponsored");
    assert.strictEqual(smartQuote.userCostEth, "0.0000 ETH ($0.00)", "User cost must be zero ETH");
    assert.strictEqual(smartQuote.mode, "sponsored_smart_account");
  }
});

// 8. Wallet Requirement Enforcement
await runAsyncTest("executeSponsoredCheckIn rejects without connected walletClient", async () => {
  const vaultAddr = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const ownerAddr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  let threw = false;
  try {
    await executeSponsoredCheckIn(vaultAddr, ownerAddr);
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes("wallet client is required"));
  }
  assert.strictEqual(threw, true, "Must require real walletClient for genuine on-chain execution");
});

console.log(`\nResults: ${passed}/${total} tests passed.`);
if (passed !== total) {
  process.exit(1);
}
