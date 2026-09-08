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

  // 4. Dispatch attempt to unverified beneficiary MUST be blocked
  console.log("\n[4] Security Guard: Reject Notification to Unverified Beneficiary");
  const blockedNoticeRes = await fetch(`${BASE_URL}/api/notify/claim-ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const canonicalBeneficiaryMsg = getBindingMessage(beneficiaryAccount.address);
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

  // 6. Beneficiary signs valid confirmation message
  console.log("\n[6] Legitimate Beneficiary Confirmation with Valid Signature");
  const validBeneficiarySig = await beneficiaryAccount.signMessage({ message: canonicalBeneficiaryMsg });
  const bindRes = await fetch(`${BASE_URL}/api/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: beneficiaryAccount.address,
      email: "alice.beneficiary@cadence.io",
      signature: validBeneficiarySig,
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
    headers: { "Content-Type": "application/json" },
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
  const canonicalOwnerMsg = getBindingMessage(ownerAccount.address);
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
    headers: { "Content-Type": "application/json" },
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

  // 9. Inspect Outbox
  console.log("\n[9] Inspect Outbox Log");
  const outboxRes = await fetch(`${BASE_URL}/api/outbox`);
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
