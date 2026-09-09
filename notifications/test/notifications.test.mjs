import assert from "assert";
import { privateKeyToAccount } from "viem/accounts";
import { getAddress } from "viem";
import { getBindingMessage, verifyWalletBindingSignature } from "../bindingVerifier.js";
import { db } from "../db.js";
import { emailService } from "../emailService.js";

// Test wallets (deterministic Foundry/Anvil private keys)
const accountOwner = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const accountBeneficiary = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const accountAttacker = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

console.log("=== CADENCE NOTIFICATION SERVICE & CONSTRAINT #6 TEST SUITE ===");
console.log(`Owner Wallet: ${accountOwner.address}`);
console.log(`Beneficiary Wallet: ${accountBeneficiary.address}`);
console.log(`Attacker Wallet: ${accountAttacker.address}`);

async function runTests() {
  db.clear();

  // 1. Message Formatting
  console.log("\n[TEST 1] Canonical Binding Message Format");
  const msgA = getBindingMessage(accountOwner.address, "owner@example.com", 0, 0);
  const expectedMsgA = `Cadence Notification Verification\nWallet: ${accountOwner.address}\nEmail: owner@example.com\nNonce: 0\nTimestamp: 0`;
  assert.strictEqual(msgA, expectedMsgA, "Message template mismatch");
  console.log("✓ Correct canonical confirmation message generated:\n" + msgA);

  // 2. Valid Signature Verification
  console.log("\n[TEST 2] Legitimate Signature Verification");
  const validSigA = await accountOwner.signMessage({ message: msgA });
  const resultValid = await verifyWalletBindingSignature(accountOwner.address, "owner@example.com", validSigA, 0, 0);
  assert.strictEqual(resultValid.valid, true, "Valid signature failed verification");
  console.log("✓ Valid signature verified successfully for wallet", accountOwner.address);

  // 3. Forgery / Impersonation Rejection (Constraint #6)
  console.log("\n[TEST 3] Impersonation & Forged Signature Rejection");
  // Attacker signs message claiming to be Owner
  const forgedSig = await accountAttacker.signMessage({ message: msgA });
  const resultForged = await verifyWalletBindingSignature(accountOwner.address, "owner@example.com", forgedSig, 0, 0);
  assert.strictEqual(resultForged.valid, false, "Forged signature was incorrectly accepted!");
  console.log("✓ Forged signature from attacker rejected successfully:", resultForged.error);

  // 3b. Email Tampering / Hijacking Rejection (Phase 2.1)
  console.log("\n[TEST 3b] Email Tampering & Signature Hijacking Rejection");
  // Owner signed msgA (for owner@example.com). Someone attempts to bind attacker@evil.com with msgA's signature
  const resultTampered = await verifyWalletBindingSignature(accountOwner.address, "attacker@evil.com", validSigA, 0, 0);
  assert.strictEqual(resultTampered.valid, false, "Tampered email signature was incorrectly accepted!");
  console.log("✓ Tampered email binding rejected successfully:", resultTampered.error);

  // 4. Owner-suggested Beneficiary Email is Stored as PENDING/Unverified
  console.log("\n[TEST 4] Owner Suggests Beneficiary Email (Must be Unverified)");
  const suggestedEmail = "beneficiary@example.com";
  db.suggestBinding(accountBeneficiary.address, suggestedEmail, accountOwner.address);

  const pendingRecord = db.getBinding(accountBeneficiary.address);
  assert.ok(pendingRecord, "Pending binding record was not created");
  assert.strictEqual(pendingRecord.verified, false, "Constraint #6 violated: suggested email was marked verified!");
  assert.strictEqual(pendingRecord.signature, null, "Constraint #6 violated: signature must be null for suggestion");
  assert.strictEqual(db.isVerified(accountBeneficiary.address), false, "db.isVerified must return false for pending");
  console.log("✓ Owner suggestion stored strictly as unverified/pending (verified: false, signature: null)");

  // 5. Zero-Dispatch Invariant for Unverified Beneficiary
  console.log("\n[TEST 5] Security Guard: Zero Notifications to Unverified Beneficiary");
  const blockedAddedNotice = await emailService.sendBeneficiaryAdded({
    beneficiaryAddress: accountBeneficiary.address,
    ownerAddress: accountOwner.address,
    shareBps: 5000,
  });
  assert.strictEqual(blockedAddedNotice.success, false, "Notification sent to unverified wallet!");
  assert.strictEqual(blockedAddedNotice.reason, "WALLET_UNVERIFIED", "Expected WALLET_UNVERIFIED reason");

  const blockedClaimNotice = await emailService.sendClaimReady({
    beneficiaryAddress: accountBeneficiary.address,
    claimableAmount: "2.5 ETH",
  });
  assert.strictEqual(blockedClaimNotice.success, false, "Claim notice sent to unverified wallet!");
  assert.strictEqual(blockedClaimNotice.reason, "WALLET_UNVERIFIED", "Expected WALLET_UNVERIFIED reason");
  console.log("✓ Outbox dispatch to unverified beneficiary strictly blocked by Constraint #6 guard");

  // 6. Beneficiary Connects and Signs to Confirm Binding
  console.log("\n[TEST 6] Beneficiary Explicitly Confirms Binding with Signature");
  const msgB = getBindingMessage(accountBeneficiary.address, suggestedEmail, 0, 0);
  const validSigB = await accountBeneficiary.signMessage({ message: msgB });

  const verificationB = await verifyWalletBindingSignature(accountBeneficiary.address, suggestedEmail, validSigB, 0, 0);
  assert.strictEqual(verificationB.valid, true, "Beneficiary signature verification failed");

  db.confirmBinding(accountBeneficiary.address, suggestedEmail, validSigB);
  assert.strictEqual(db.isVerified(accountBeneficiary.address), true, "Beneficiary should now be verified");
  const verifiedRecordB = db.getBinding(accountBeneficiary.address);
  assert.strictEqual(verifiedRecordB.verified, true);
  assert.strictEqual(verifiedRecordB.signature, validSigB);
  console.log("✓ Beneficiary successfully verified with valid wallet signature");

  // 7. Verified Beneficiary Now Receives Notifications
  console.log("\n[TEST 7] Verified Beneficiary Receives Claim-Ready Notification");
  const claimNoticeResult = await emailService.sendClaimReady({
    beneficiaryAddress: accountBeneficiary.address,
    vaultId: "vault-0x01",
    claimableAmount: "2.5 ETH",
  });
  assert.strictEqual(claimNoticeResult.success, true, "Claim notice failed for verified beneficiary");
  assert.ok(claimNoticeResult.notificationId, "Missing notificationId");
  console.log("✓ Claim-ready notice dispatched successfully to verified beneficiary! ID:", claimNoticeResult.notificationId);

  // 8. Owner Binds Email and Receives Check-In Reminder
  console.log("\n[TEST 8] Owner Binds and Receives Check-In Reminder");
  db.confirmBinding(accountOwner.address, "owner@example.com", validSigA);
  assert.strictEqual(db.isVerified(accountOwner.address), true);

  const ownerReminderResult = await emailService.sendOwnerReminder({
    ownerAddress: accountOwner.address,
    vaultId: "vault-0x01",
    daysRemaining: 5,
  });
  assert.strictEqual(ownerReminderResult.success, true, "Owner reminder failed for verified owner");
  // 9. Instant Welcome Confirmation Dispatched Upon Binding
  console.log("\n[TEST 9] Instant Welcome Confirmation Email Dispatched Upon Binding");
  const welcomeResult = await emailService.sendWelcomeConfirmation({
    walletAddress: accountOwner.address,
    email: "owner@example.com",
  });
  assert.strictEqual(welcomeResult.success, true, "Welcome confirmation email failed to dispatch");
  assert.strictEqual(welcomeResult.entry?.type, "WALLET_BOUND_CONFIRMATION", "Incorrect notification type");
  assert.strictEqual(welcomeResult.entry?.subject, "[Cadence Protocol] Email Verified & Bound to Wallet");
  // 10. Actual Registered Wallet Address Present in Beneficiary Notices
  console.log("\n[TEST 10] Beneficiary Notice & Claim Ready Content Contains Registered Wallet");
  const beneficiaryAddedResult = await emailService.sendBeneficiaryAdded({
    beneficiaryAddress: accountBeneficiary.address,
    ownerAddress: accountOwner.address,
    vaultId: "vault-0x02",
    shareBps: 4000,
  });
  assert.strictEqual(beneficiaryAddedResult.success, true);
  assert.ok(
    beneficiaryAddedResult.entry?.bodyText.includes(accountBeneficiary.address),
    "Beneficiary added body text must include full registered wallet address"
  );
  const expectedTruncBeneficiary = `${accountBeneficiary.address.slice(0, 6)}...${accountBeneficiary.address.slice(-4)}`;
  assert.ok(
    beneficiaryAddedResult.entry?.bodyText.includes(expectedTruncBeneficiary),
    "Beneficiary added body text must include truncated wallet address"
  );
  assert.ok(
    claimNoticeResult.entry?.bodyText.includes(accountBeneficiary.address),
    "Claim ready body text must include full registered wallet address"
  );
  console.log("✓ Beneficiary and Claim notices explicitly state registered wallet address (full + truncated)");

  // 11. Wrong-Wallet Recovery: getVerifiedWalletsByEmail & sendWalletReminder
  console.log("\n[TEST 11] Wrong-Wallet Recovery: Verified Wallets Lookup & Email Reminder");
  const matchingWallets = db.getVerifiedWalletsByEmail(suggestedEmail);
  assert.strictEqual(matchingWallets.length, 1);
  assert.strictEqual(getAddress(matchingWallets[0]), getAddress(accountBeneficiary.address));

  // Test that unverified wallets are never returned
  db.suggestBinding("0x1111111111111111111111111111111111111111", suggestedEmail, accountOwner.address);
  const matchingAfterSuggestion = db.getVerifiedWalletsByEmail(suggestedEmail);
  assert.strictEqual(matchingAfterSuggestion.length, 1, "Unverified suggestion must not be returned in recovery lookup");

  const reminderResult = await emailService.sendWalletReminder({
    email: suggestedEmail,
    wallets: matchingWallets,
  });
  assert.strictEqual(reminderResult.success, true);
  assert.strictEqual(reminderResult.entry?.type, "WALLET_REMINDER");
  assert.ok(reminderResult.entry?.bodyText.includes(accountBeneficiary.address));
  console.log("✓ Wrong-wallet recovery accurately retrieves only verified wallets and dispatches reminder email");

  console.log("\n========================================================");
  console.log("ALL NOTIFICATION & CONSTRAINT #6 SECURITY TESTS PASSED!");
  console.log("========================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
