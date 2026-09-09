import assert from "node:assert";
import http from "node:http";
import { privateKeyToAccount } from "viem/accounts";
import { getAddress } from "viem";

// Ensure test environment is declared before importing application
process.env.NODE_ENV = "test";
const { default: app } = await import("../index.js");
const { getBindingMessage, verifyWalletBindingSignature } = await import("../bindingVerifier.js");
const { db } = await import("../db.js");

// Deterministic test accounts (Anvil deterministic private keys)
const accountOwner = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const accountAttacker = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

async function runSecurityAuditTests() {
  console.log("=== CADENCE BACKEND SECURITY REGRESSION SUITE (Phase 3.2) ===");

  db.clear();

  // Spin up an isolated in-process test server on dynamic port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as { port: number };
  const BASE_URL = `http://127.0.0.1:${addr.port}`;
  console.log(`[Test Server] Mounted in-memory server on port ${addr.port}`);

  try {
    // =========================================================================
    // 1. Signature Email Binding & Tampering Rejection
    // =========================================================================
    console.log("\n[TEST 1] Rejects Binding If Signature Was Signed For A Different Email");

    const legitimateEmail = "victim.owner@cadence.io";
    const spoofedEmail = "attacker@evil.com";

    // Owner signs canonical message strictly bound to legitimateEmail
    const legitimateMsg = getBindingMessage(accountOwner.address, legitimateEmail, 0, 0);
    const validSignature = await accountOwner.signMessage({ message: legitimateMsg });

    // Verify cryptographic layer directly rejects tampered email
    const cryptoVerification = await verifyWalletBindingSignature(
      accountOwner.address,
      spoofedEmail,
      validSignature,
      0,
      0
    );
    assert.strictEqual(
      cryptoVerification.valid,
      false,
      "Cryptographic verification must reject signature signed for another email"
    );

    // Attacker sends HTTP POST /api/bind attempting to claim spoofedEmail
    const tamperedRes = await fetch(`${BASE_URL}/api/bind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-bypass-limiter": "true",
      },
      body: JSON.stringify({
        walletAddress: accountOwner.address,
        email: spoofedEmail,
        signature: validSignature,
        nonce: 0,
        timestamp: 0,
      }),
    });

    assert.strictEqual(tamperedRes.status, 400, "Expected 400 Bad Request for email substitution");
    const tamperedData = await tamperedRes.json();
    assert.strictEqual(tamperedData.success, false);
    assert.ok(
      tamperedData.error.includes("Invalid wallet signature"),
      "Error must explicitly identify signature-email mismatch"
    );
    console.log("✓ Tampered email binding rejected with 400 Bad Request:", tamperedData.error);

    // Confirm that submitting the exact legitimate signed email SUCCEEDS
    const legitimateRes = await fetch(`${BASE_URL}/api/bind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-bypass-limiter": "true",
      },
      body: JSON.stringify({
        walletAddress: accountOwner.address,
        email: legitimateEmail,
        signature: validSignature,
        nonce: 0,
        timestamp: 0,
      }),
    });
    assert.strictEqual(legitimateRes.status, 200, "Legitimate email binding must succeed with 200 OK");
    const legitimateData = await legitimateRes.json();
    assert.strictEqual(legitimateData.verified, true);
    assert.strictEqual(legitimateData.binding.email, legitimateEmail);
    console.log("✓ Legitimate email binding accepted with 200 OK and verified: true");

    // =========================================================================
    // 2. Sensitive Endpoint Protection (Outbox & Internal Notification Triggers)
    // =========================================================================
    console.log("\n[TEST 2] Rejects Unauthenticated Requests To Sensitive Endpoints");

    // 2a. POST /api/notify/owner-reminder without internal key
    const unauthReminderRes = await fetch(`${BASE_URL}/api/notify/owner-reminder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-bypass-limiter": "true",
      },
      body: JSON.stringify({
        ownerAddress: accountOwner.address,
        vaultId: "vault-sec-1",
      }),
    });
    assert.strictEqual(unauthReminderRes.status, 401, "Expected 401 Unauthorized without x-cadence-internal-key");
    console.log("✓ POST /api/notify/owner-reminder rejected with 401 Unauthorized");

    // 2b. POST /api/notify/beneficiary-added without internal key
    const unauthBeneficiaryRes = await fetch(`${BASE_URL}/api/notify/beneficiary-added`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-bypass-limiter": "true",
      },
      body: JSON.stringify({
        beneficiaryAddress: accountAttacker.address,
        ownerAddress: accountOwner.address,
        vaultId: "vault-sec-1",
      }),
    });
    assert.strictEqual(unauthBeneficiaryRes.status, 401, "Expected 401 Unauthorized without x-cadence-internal-key");
    console.log("✓ POST /api/notify/beneficiary-added rejected with 401 Unauthorized");

    // 2c. POST /api/notify/claim-ready with WRONG internal key
    const wrongKeyRes = await fetch(`${BASE_URL}/api/notify/claim-ready`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cadence-internal-key": "fake-attacker-key-12345",
        "x-test-bypass-limiter": "true",
      },
      body: JSON.stringify({
        beneficiaryAddress: accountOwner.address,
        vaultId: "vault-sec-1",
      }),
    });
    assert.strictEqual(wrongKeyRes.status, 401, "Expected 401 Unauthorized for invalid internal key");
    console.log("✓ POST /api/notify/claim-ready with wrong secret rejected with 401 Unauthorized");

    // 2d. GET /api/outbox with invalid admin token
    const unauthOutboxRes = await fetch(`${BASE_URL}/api/outbox`, {
      headers: {
        Authorization: "Bearer invalid-admin-key",
      },
    });
    assert.strictEqual(unauthOutboxRes.status, 401, "Expected 401 Unauthorized for invalid admin key on outbox");
    console.log("✓ GET /api/outbox with invalid admin secret rejected with 401 Unauthorized");

    // 2e. GET /api/outbox with legitimate admin key -> SUCCEEDS
    const validOutboxRes = await fetch(`${BASE_URL}/api/outbox`, {
      headers: {
        Authorization: "Bearer cadence-admin-secret",
      },
    });
    assert.strictEqual(validOutboxRes.status, 200, "Expected 200 OK with legitimate admin bearer secret");
    const outboxData = await validOutboxRes.json();
    assert.ok(typeof outboxData.total === "number", "Outbox response must contain total count");
    console.log("✓ GET /api/outbox with valid admin key accepted with 200 OK");

    // =========================================================================
    // 3. Strict Rate Limiting Enforcement
    // =========================================================================
    console.log("\n[TEST 3] Enforces Strict Rate Limiting On Sensitive Endpoints (Max 10 / 15m)");

    // Rapidly fire 13 requests without bypass header to /api/suggest
    let rateLimitTriggered = false;
    let rateLimitStatusCode = 0;

    for (let i = 1; i <= 13; i++) {
      const res = await fetch(`${BASE_URL}/api/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: "0x1111111111111111111111111111111111111111",
          email: `test${i}@cadence.io`,
          suggestedBy: accountOwner.address,
        }),
      });

      if (res.status === 429) {
        rateLimitTriggered = true;
        rateLimitStatusCode = res.status;
        const errJson = await res.json();
        console.log(`✓ Request #${i} triggered rate limiter (HTTP 429):`, errJson.error);
        break;
      }
    }

    assert.strictEqual(rateLimitTriggered, true, "Rate limiter MUST block requests exceeding 10/15min threshold");
    assert.strictEqual(rateLimitStatusCode, 429, "Rate limiter response status code must be 429");
    console.log("✓ Strict rate limit of 10 requests per 15 minutes verified successfully");

    console.log("\n========================================================");
    console.log("ALL BACKEND SECURITY AUDIT REGRESSION TESTS PASSED!");
    console.log("========================================================");
  } finally {
    server.close();
  }
}

runSecurityAuditTests().catch((err) => {
  console.error("SECURITY REGRESSION TEST FAILED:", err);
  process.exit(1);
});
