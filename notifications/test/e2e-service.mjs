import assert from "assert";
import { privateKeyToAccount } from "viem/accounts";
import { getBindingMessage } from "../bindingVerifier.js";

const BASE_URL = "http://localhost:3001";

// Deterministic test accounts (Anvil accounts 3, 4, 5 for isolated E2E state)
const ownerAccount = privateKeyToAccount("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
const beneficiaryAccount = privateKeyToAccount("0x47e179ec3427437342425822114f20a0dec239b43e549c71cb88d7251eacb103");
const attackerAccount = privateKeyToAccount("0x8b3a350cf4d3b41be5236207c65e8a4a5ebc69a5316dbb4458d689dd9000a6a0");

async function main() {
  console.log("=== RUNNING LIVE HTTP E2E TEST AGAINST NOTIFICATION SERVICE (PORT 3001) ===");

  // 1. Health check
  console.log("\n[1] Health Check");
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.service, "cadence-notifications");
  console.log("✓ Service healthy:", healthData);

  // 2. Query initial status for beneficiary
  console.log("\n[2] Initial Status Query");
  const statusRes1 = await fetch(`${BASE_URL}/api/status/${beneficiaryAccount.address}`);
  assert.strictEqual(statusRes1.status, 200);
  const status1 = await statusRes1.json();
  console.log("✓ Initial status for beneficiary:", status1);

  // 3. Owner suggests email during vault creation
  console.log("\n[3] Owner Suggests Beneficiary Email (Constraint #6)");
  const suggestRes = await fetch(`${BASE_URL}/api/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: beneficiaryAccount.address,
      email: "alice.beneficiary@cadence.io",
      suggestedBy: ownerAccount.address,
    }),
  });
  assert.strictEqual(suggestRes.status, 200);
  const suggestData = await suggestRes.json();
  assert.strictEqual(suggestData.status, "PENDING");
  assert.strictEqual(suggestData.binding.verified, false, "Suggested email MUST be unverified");
  console.log("✓ Suggestion stored as PENDING (verified: false):", suggestData.binding);

  // 4. Unauthorized dispatch attempt without internal key MUST be blocked (401)
  console.log("\n[4] Security Guard: Reject Notification Trigger without Internal Secret (401)");
  const unauthRes = await fetch(`${BASE_URL}/api/notify/claim-ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      beneficiaryAddress: beneficiaryAccount.address,
      vaultId: "vault-demo-1",
      claimableAmount: "1.00 ETH",
    }),
  });
  assert.strictEqual(unauthRes.status, 401, "Expected 401 Unauthorized without x-cadence-internal-key");
  console.log("✓ External unauthenticated trigger rejected with 401 Unauthorized");

  // 4b. Dispatch attempt to unverified beneficiary with valid internal key MUST be blocked by Constraint #6 (403)
  console.log("\n[4b] Security Guard: Reject Notification to Unverified Beneficiary (403)");
  const blockedNoticeRes = await fetch(`${BASE_URL}/api/notify/claim-ready`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cadence-internal-key": "cadence-internal-secret",
    },
    body: JSON.stringify({
      beneficiaryAddress: beneficiaryAccount.address,
      vaultId: "vault-demo-1",
      claimableAmount: "1.00 ETH",
    }),
  });
  assert.strictEqual(blockedNoticeRes.status, 403, "Expected 403 Forbidden for unverified recipient");
  const blockedData = await blockedNoticeRes.json();
  assert.strictEqual(blockedData.reason, "WALLET_UNVERIFIED");
  console.log("✓ Notification blocked by Constraint #6 guard:", blockedData.error);

  // 5. Impersonation attack: Attacker signs on behalf of beneficiary -> MUST BE REJECTED
  console.log("\n[5] Impersonation Rejection: Forged Signature Attack");
  const canonicalBeneficiaryMsg = getBindingMessage(beneficiaryAccount.address, "alice.beneficiary@cadence.io", 0, 0);
  const forgedSig = await attackerAccount.signMessage({ message: canonicalBeneficiaryMsg });
  const forgedBindRes = await fetch(`${BASE_URL}/api/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: beneficiaryAccount.address,
      email: "attacker@hack.io",
      signature: forgedSig,
    }),
  });
  assert.strictEqual(forgedBindRes.status, 400, "Expected 400 Bad Request for forged signature");
  const forgedData = await forgedBindRes.json();
  console.log("✓ Forged signature correctly rejected:", forgedData.error);

  // 5b. Email Tampering Attack: Beneficiary signs for alice@cadence.io, but attacker tries to bind evil@cadence.io
  console.log("\n[5b] Email Tampering Rejection: Signature Bound to Specific Email");
  const validAliceSig = await beneficiaryAccount.signMessage({ message: canonicalBeneficiaryMsg });
  const tamperedBindRes = await fetch(`${BASE_URL}/api/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: beneficiaryAccount.address,
      email: "evil@cadence.io",
      signature: validAliceSig,
    }),
  });
  assert.strictEqual(tamperedBindRes.status, 400, "Expected 400 Bad Request for tampered email payload");
  console.log("✓ Email substitution attack correctly rejected by backend binding verifier");

  // 6. Beneficiary signs valid confirmation message
  console.log("\n[6] Legitimate Beneficiary Confirmation with Valid Signature");
  const bindRes = await fetch(`${BASE_URL}/api/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: beneficiaryAccount.address,
      email: "alice.beneficiary@cadence.io",
      signature: validAliceSig,
    }),
  });
  assert.strictEqual(bindRes.status, 200);
  const bindData = await bindRes.json();
  assert.strictEqual(bindData.verified, true);
  console.log("✓ Beneficiary email successfully verified by wallet signature:", bindData.binding);

  // 7. Dispatched notification to now-verified beneficiary SUCCEEDS
  console.log("\n[7] Claim Notification Dispatched to Verified Beneficiary");
  const claimNoticeRes = await fetch(`${BASE_URL}/api/notify/claim-ready`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cadence-internal-key": "cadence-internal-secret",
    },
    body: JSON.stringify({
      beneficiaryAddress: beneficiaryAccount.address,
      vaultId: "vault-demo-1",
      claimableAmount: "1.00 ETH",
    }),
  });
  assert.strictEqual(claimNoticeRes.status, 200);
  const claimData = await claimNoticeRes.json();
  assert.strictEqual(claimData.success, true);
  console.log("✓ Claim-ready notification dispatched! ID:", claimData.notificationId);

  // 8. Owner binds email and receives check-in reminder
  console.log("\n[8] Owner Binds and Receives Check-In Deadline Reminder");
  const canonicalOwnerMsg = getBindingMessage(ownerAccount.address, "vault.owner@cadence.io", 0, 0);
  const validOwnerSig = await ownerAccount.signMessage({ message: canonicalOwnerMsg });
  const ownerBindRes = await fetch(`${BASE_URL}/api/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: ownerAccount.address,
      email: "vault.owner@cadence.io",
      signature: validOwnerSig,
    }),
  });
  assert.strictEqual(ownerBindRes.status, 200);

  const ownerReminderRes = await fetch(`${BASE_URL}/api/notify/owner-reminder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cadence-internal-key": "cadence-internal-secret",
    },
    body: JSON.stringify({
      ownerAddress: ownerAccount.address,
      vaultId: "vault-demo-2",
      daysRemaining: 7,
    }),
  });
  assert.strictEqual(ownerReminderRes.status, 200);
  const reminderData = await ownerReminderRes.json();
  assert.strictEqual(reminderData.success, true);
  console.log("✓ Owner check-in reminder dispatched! ID:", reminderData.notificationId);

  // 9. Inspect Outbox (with Admin Secret)
  console.log("\n[9] Inspect Outbox Log (Admin Authorization Required)");
  const outboxRes = await fetch(`${BASE_URL}/api/outbox`, {
    headers: { Authorization: "Bearer cadence-admin-secret" },
  });
  assert.strictEqual(outboxRes.status, 200);
  const outboxData = await outboxRes.json();
  console.log(`✓ Total dispatched messages in audit log: ${outboxData.total}`);
  assert.ok(outboxData.total >= 2);

  console.log("\n========================================================");
  console.log("ALL LIVE HTTP NOTIFICATION SERVICE E2E TESTS PASSED!");
  console.log("========================================================");
}

main().catch((err) => {
  console.error("E2E LIVE TEST FAILED:", err);
  process.exit(1);
});
