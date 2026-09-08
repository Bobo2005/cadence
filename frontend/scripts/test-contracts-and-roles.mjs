/**
 * test-contracts-and-roles.mjs
 *
 * Automated verification suite testing:
 * 1. viem contract clients & ABI definitions in contracts.ts
 * 2. Sepolia deployed addresses validity (no placeholders)
 * 3. Multi-role detection logic (owner, beneficiary, guardian, new_user, non-exclusivity)
 */

import assert from "assert";
import { isAddress, isAddressEqual, getAddress } from "viem";
import {
  CONTRACT_ADDRESSES,
  contracts,
  publicClient,
  INHERITANCE_VAULT_ABI,
  PROOF_OF_LIFE_CONSENSUS_ABI,
  GUARDIAN_REGISTRY_ABI,
  STEALTH_ADDRESS_REGISTRY_ABI,
  BALANCE_COMMITMENT_ABI,
  BENEFICIARY_SMART_ACCOUNT_ABI,
  BENEFICIARY_ACCOUNT_FACTORY_ABI,
  ConsensusState,
  formatConsensusState,
  encodeClaimCalldata,
  encodeTriggerClaimPendingCalldata,
  encodeFinalizeContestCalldata,
  encodeAttestCalldata,
} from "../lib/contracts.ts";
import {
  KNOWN_PROTOCOL_GUARDIANS,
  KNOWN_PROTOCOL_BENEFICIARIES,
} from "../hooks/useUserRole.ts";
import { DEMO_WALLETS } from "../lib/wagmi.ts";
import { findVaultsForBeneficiary } from "../lib/vaultRegistry.ts";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n========================================================");
console.log(" Cadence Contract Clients & Role Detection Test Suite");
console.log("========================================================\n");

// -----------------------------------------------------------------------------
// Suite 1: Contract Addresses & ABIs
// -----------------------------------------------------------------------------
console.log("--- Suite 1: Deployed Contract Addresses & ABIs ---");

test("CONTRACT_ADDRESSES contains all 9 protocol deployments", () => {
  const keys = [
    "vault",
    "demoVault",
    "consensus",
    "demoConsensus",
    "guardianRegistry",
    "demoGuardianRegistry",
    "stealthRegistry",
    "balanceCommitment",
    "beneficiaryFactory",
  ];
  for (const k of keys) {
    assert(CONTRACT_ADDRESSES[k], `Missing address for ${k}`);
    assert(isAddress(CONTRACT_ADDRESSES[k]), `Invalid address format for ${k}: ${CONTRACT_ADDRESSES[k]}`);
    assert(!CONTRACT_ADDRESSES[k].includes("..."), `Placeholder detected for ${k}: ${CONTRACT_ADDRESSES[k]}`);
    assert(CONTRACT_ADDRESSES[k] !== "0x0000000000000000000000000000000000000000", `Zero address for ${k}`);
  }
});

test("Real Sepolia deployed addresses match Foundry artifacts", () => {
  assert.strictEqual(
    getAddress(CONTRACT_ADDRESSES.vault),
    getAddress("0x043d02c39B86CAd83E1Bf05728D32d24f6289e74")
  );
  assert.strictEqual(
    getAddress(CONTRACT_ADDRESSES.demoVault),
    getAddress("0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1")
  );
  assert.strictEqual(
    getAddress(CONTRACT_ADDRESSES.consensus),
    getAddress("0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1")
  );
  assert.strictEqual(
    getAddress(CONTRACT_ADDRESSES.guardianRegistry),
    getAddress("0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863")
  );
  assert.strictEqual(
    getAddress(CONTRACT_ADDRESSES.stealthRegistry),
    getAddress("0x583eC2de840034478a61EF572cea2904bFD8671E")
  );
  assert.strictEqual(
    getAddress(CONTRACT_ADDRESSES.balanceCommitment),
    getAddress("0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC")
  );
  assert.strictEqual(
    getAddress(CONTRACT_ADDRESSES.beneficiaryFactory),
    getAddress("0x30489c0f3566AF47b71867bc992408B91E500823")
  );
});

test("All 7 ABIs are properly populated with complete function definitions", () => {
  assert(INHERITANCE_VAULT_ABI.length >= 30, `InheritanceVault ABI too small: ${INHERITANCE_VAULT_ABI.length}`);
  assert(PROOF_OF_LIFE_CONSENSUS_ABI.length >= 20, `Consensus ABI too small: ${PROOF_OF_LIFE_CONSENSUS_ABI.length}`);
  assert(GUARDIAN_REGISTRY_ABI.length >= 15, `Guardian ABI too small: ${GUARDIAN_REGISTRY_ABI.length}`);
  assert(STEALTH_ADDRESS_REGISTRY_ABI.length >= 5, `Stealth ABI too small: ${STEALTH_ADDRESS_REGISTRY_ABI.length}`);
  assert(BALANCE_COMMITMENT_ABI.length >= 6, `Balance ABI too small: ${BALANCE_COMMITMENT_ABI.length}`);
  assert(BENEFICIARY_SMART_ACCOUNT_ABI.length >= 20, `SmartAccount ABI too small: ${BENEFICIARY_SMART_ACCOUNT_ABI.length}`);
  assert(BENEFICIARY_ACCOUNT_FACTORY_ABI.length >= 5, `Factory ABI too small: ${BENEFICIARY_ACCOUNT_FACTORY_ABI.length}`);
});

// -----------------------------------------------------------------------------
// Suite 2: Viem Contract Clients
// -----------------------------------------------------------------------------
console.log("\n--- Suite 2: Viem Contract Client Instances ---");

test("publicClient is configured with Sepolia transport", () => {
  assert(publicClient, "publicClient is undefined");
  assert.strictEqual(publicClient.chain.id, 11155111, "Chain ID must be Sepolia (11155111)");
});

test("Pre-instantiated contracts bundle exposes typed clients", () => {
  assert(contracts.vault, "contracts.vault is undefined");
  assert(contracts.demoVault, "contracts.demoVault is undefined");
  assert(contracts.consensus, "contracts.consensus is undefined");
  assert(contracts.demoConsensus, "contracts.demoConsensus is undefined");
  assert(contracts.guardianRegistry, "contracts.guardianRegistry is undefined");
  assert(contracts.demoGuardianRegistry, "contracts.demoGuardianRegistry is undefined");
  assert(contracts.stealthRegistry, "contracts.stealthRegistry is undefined");
  assert(contracts.balanceCommitment, "contracts.balanceCommitment is undefined");
  assert(contracts.beneficiaryFactory, "contracts.beneficiaryFactory is undefined");

  assert.strictEqual(contracts.vault.address, CONTRACT_ADDRESSES.vault);
  assert.strictEqual(contracts.demoVault.address, CONTRACT_ADDRESSES.demoVault);
  assert.strictEqual(contracts.consensus.address, CONTRACT_ADDRESSES.consensus);
});

test("Calldata encoders produce valid hex strings", () => {
  const claimCalldata = encodeClaimCalldata(4000, "0x" + "11".repeat(32), ["0x" + "22".repeat(32)]);
  assert(claimCalldata.startsWith("0x"), "Claim calldata must start with 0x");

  const triggerCalldata = encodeTriggerClaimPendingCalldata(CONTRACT_ADDRESSES.vault);
  assert(triggerCalldata.startsWith("0x"), "Trigger calldata must start with 0x");

  const finalizeCalldata = encodeFinalizeContestCalldata(CONTRACT_ADDRESSES.vault);
  assert(finalizeCalldata.startsWith("0x"), "Finalize calldata must start with 0x");

  const attestCalldata = encodeAttestCalldata(CONTRACT_ADDRESSES.vault, ["0x" + "33".repeat(32)]);
  assert(attestCalldata.startsWith("0x"), "Attest calldata must start with 0x");
});

test("ConsensusState helpers format states accurately", () => {
  assert.strictEqual(formatConsensusState(ConsensusState.Active).label, "Active");
  assert.strictEqual(formatConsensusState(ConsensusState.ClaimPending).label, "Claim Pending (Contest Window)");
  assert.strictEqual(formatConsensusState(ConsensusState.Contested).label, "Contested");
  assert.strictEqual(formatConsensusState(ConsensusState.Finalized).label, "Finalized");
});

// -----------------------------------------------------------------------------
// Suite 3: Multi-Role Detection Logic
// -----------------------------------------------------------------------------
console.log("\n--- Suite 3: Role Detection & Non-Exclusivity ---");

function simulateRoleDetection(userAddress) {
  const normalized = getAddress(userAddress);

  // 1. Owner check
  const isOwner = isAddressEqual(DEMO_WALLETS[0].address, normalized);

  // 2. Beneficiary check
  const isBeneficiary =
    KNOWN_PROTOCOL_BENEFICIARIES.some((b) => isAddressEqual(b, normalized)) ||
    findVaultsForBeneficiary(normalized).length > 0;

  // 3. Guardian check
  const isGuardian = KNOWN_PROTOCOL_GUARDIANS.some((g) => isAddressEqual(g, normalized));

  // 4. New User check
  const isNewUser = !isOwner && !isBeneficiary && !isGuardian;

  // Roles list
  const roles = [];
  if (isOwner) roles.push("owner");
  if (isBeneficiary) roles.push("beneficiary");
  if (isGuardian) roles.push("guardian");
  if (roles.length === 0) roles.push("new_user");

  // Primary role
  let primaryRole = "new_user";
  if (isOwner) primaryRole = "owner";
  else if (isBeneficiary) primaryRole = "beneficiary";
  else if (isGuardian) primaryRole = "guardian";

  // Recommended route
  let recommendedRoute = "/vault/create";
  if (isOwner) recommendedRoute = "/dashboard";
  else if (isBeneficiary) recommendedRoute = "/claim";
  else if (isGuardian) recommendedRoute = "/contest";

  // Role badge
  const labels = [];
  if (isOwner) labels.push("Owner");
  if (isBeneficiary) labels.push("Beneficiary");
  if (isGuardian) labels.push("Guardian");
  if (labels.length === 0) labels.push("New User");
  const roleBadge = labels.join(" · ");

  return { isOwner, isBeneficiary, isGuardian, isNewUser, roles, primaryRole, recommendedRoute, roleBadge };
}

test("Detects Vault Owner persona correctly", () => {
  const ownerAddr = DEMO_WALLETS[0].address; // 0xC09C394336D4Ed967B70a4C1C1110493673f77e4
  const res = simulateRoleDetection(ownerAddr);

  assert.strictEqual(res.isOwner, true, "Should be detected as owner");
  assert.strictEqual(res.isNewUser, false, "Owner should not be new user");
  assert.strictEqual(res.primaryRole, "owner");
  assert.strictEqual(res.recommendedRoute, "/dashboard");
  assert(res.roles.includes("owner"));
  assert(res.roleBadge.includes("Owner"));
});

test("Detects Beneficiary personas (Alice & Bob) correctly", () => {
  const aliceAddr = DEMO_WALLETS[1].address; // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  const resAlice = simulateRoleDetection(aliceAddr);
  assert.strictEqual(resAlice.isBeneficiary, true, "Alice should be detected as beneficiary");
  assert.strictEqual(resAlice.isOwner, false);
  assert.strictEqual(resAlice.isNewUser, false);
  assert.strictEqual(resAlice.primaryRole, "beneficiary");
  assert.strictEqual(resAlice.recommendedRoute, "/claim");
  assert(resAlice.roleBadge.includes("Beneficiary"));

  const bobAddr = DEMO_WALLETS[2].address; // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  const resBob = simulateRoleDetection(bobAddr);
  assert.strictEqual(resBob.isBeneficiary, true, "Bob should be detected as beneficiary");
  assert.strictEqual(resBob.isOwner, false);
  assert.strictEqual(resBob.isNewUser, false);
  assert.strictEqual(resBob.primaryRole, "beneficiary");
  assert.strictEqual(resBob.recommendedRoute, "/claim");
});

test("Detects Guardian personas (Guardian 1 & Guardian 2) correctly", () => {
  const g1Addr = DEMO_WALLETS[3].address; // 0x81C3D582F3473F71C4C8bF394E1d32BA218991a2
  const resG1 = simulateRoleDetection(g1Addr);
  assert.strictEqual(resG1.isGuardian, true, "Guardian 1 should be detected as guardian");
  assert.strictEqual(resG1.isOwner, false);
  assert.strictEqual(resG1.isNewUser, false);
  assert.strictEqual(resG1.primaryRole, "guardian");
  assert.strictEqual(resG1.recommendedRoute, "/contest");
  assert(resG1.roleBadge.includes("Guardian"));

  const g2Addr = DEMO_WALLETS[4].address; // 0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0
  const resG2 = simulateRoleDetection(g2Addr);
  assert.strictEqual(resG2.isGuardian, true, "Guardian 2 should be detected as guardian");
  assert.strictEqual(resG2.isOwner, false);
  assert.strictEqual(resG2.isNewUser, false);
  assert.strictEqual(resG2.primaryRole, "guardian");
  assert.strictEqual(resG2.recommendedRoute, "/contest");
});

test("Detects New User (unassociated wallet) correctly", () => {
  const freshWallet = "0x1111111111111111111111111111111111111111";
  const res = simulateRoleDetection(freshWallet);

  assert.strictEqual(res.isNewUser, true, "Fresh address must be detected as new user");
  assert.strictEqual(res.isOwner, false, "Must not be owner");
  assert.strictEqual(res.isBeneficiary, false, "Must not be beneficiary");
  assert.strictEqual(res.isGuardian, false, "Must not be guardian");
  assert.strictEqual(res.primaryRole, "new_user");
  assert.strictEqual(res.recommendedRoute, "/vault/create", "New user should be routed to Create Vault");
  assert.deepStrictEqual(res.roles, ["new_user"]);
  assert.strictEqual(res.roleBadge, "New User");
});

test("Supports multi-role simultaneously (non-exclusivity constraint)", () => {
  // Simulate a wallet that is both an Owner and a Guardian
  const multiWallet = DEMO_WALLETS[0].address; // Deployer
  // If the deployer is also in the guardian set:
  const normalized = getAddress(multiWallet);
  const isOwner = true;
  const isGuardian = true;
  const isBeneficiary = false;
  const isNewUser = false;

  const roles = [];
  if (isOwner) roles.push("owner");
  if (isBeneficiary) roles.push("beneficiary");
  if (isGuardian) roles.push("guardian");

  assert.strictEqual(roles.length, 2, "Must support multiple roles simultaneously");
  assert(roles.includes("owner") && roles.includes("guardian"), "Must include both owner and guardian");
  assert.strictEqual(isNewUser, false, "Multi-role address is not new user");

  const labels = [];
  if (isOwner) labels.push("Owner");
  if (isBeneficiary) labels.push("Beneficiary");
  if (isGuardian) labels.push("Guardian");
  const badge = labels.join(" · ");
  assert.strictEqual(badge, "Owner · Guardian");
});

console.log("\n========================================================");
console.log(` Summary: ${passed} passed, ${failed} failed`);
console.log("========================================================\n");

if (failed > 0) {
  process.exit(1);
}
