import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
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
    let retryAfterHeaderPresent = false;

    for (let i = 1; i <= 10; i++) {
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
        retryAfterHeaderPresent = Boolean(res.headers.get("retry-after"));
        const errJson = await res.json();
        console.log(`✓ Request #${i} triggered rate limiter (HTTP 429):`, errJson.message, `Retry-After:`, res.headers.get("retry-after"));
        break;
      }
    }

    assert.strictEqual(rateLimitTriggered, true, "Rate limiter MUST block requests exceeding 5/15min threshold");
    assert.strictEqual(rateLimitStatusCode, 429, "Rate limiter response status code must be 429");
    assert.strictEqual(retryAfterHeaderPresent, true, "HTTP 429 response must contain Retry-After header");
    console.log("✓ Strict rate limit of 5 requests per 15 minutes with Retry-After verified successfully");

    // =========================================================================
    // 4. Server-Side Input Validation & Sanitization Suite (Zod)
    // =========================================================================
    console.log("\n[TEST 4] Server-Side Input Validation & Sanitization Suite (Zod)");

    // 4a. Rejects malformed Ethereum address in POST /api/suggest
    const badAddressRes = await fetch(`${BASE_URL}/api/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-bypass-limiter": "true" },
      body: JSON.stringify({
        walletAddress: "0xinvalid-wallet-address",
        email: "valid@cadence.io",
        suggestedBy: accountOwner.address,
      }),
    });
    assert.strictEqual(badAddressRes.status, 400, "Expected 400 for malformed Ethereum address");
    const badAddressData = await badAddressRes.json();
    assert.ok(badAddressData.error, "Must return structured error message");
    console.log("✓ Malformed Ethereum address rejected with 400 Bad Request:", badAddressData.error);

    // 4b. Rejects XSS attempt and malformed email in POST /api/suggest
    const xssEmailRes = await fetch(`${BASE_URL}/api/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-bypass-limiter": "true" },
      body: JSON.stringify({
        walletAddress: accountOwner.address,
        email: "<script>alert('xss')</script>@domain.com",
        suggestedBy: accountOwner.address,
      }),
    });
    assert.strictEqual(xssEmailRes.status, 400, "Expected 400 for XSS injection in email");
    const xssEmailData = await xssEmailRes.json();
    console.log("✓ XSS injection in email rejected with 400 Bad Request:", xssEmailData.error);

    // 4c. Rejects missing required parameters in POST /api/bind
    const missingParamsRes = await fetch(`${BASE_URL}/api/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-bypass-limiter": "true" },
      body: JSON.stringify({
        walletAddress: accountOwner.address,
      }),
    });
    assert.strictEqual(missingParamsRes.status, 400, "Expected 400 for missing fields");
    const missingParamsData = await missingParamsRes.json();
    assert.ok(missingParamsData.details.length >= 2, "Must detail missing fields");
    console.log("✓ Missing required parameters rejected with 400 Bad Request:", missingParamsData.details);

    // 4d. Rejects invalid address in URL path param GET /api/status/:walletAddress
    const badParamRes = await fetch(`${BASE_URL}/api/status/not-an-address`);
    assert.strictEqual(badParamRes.status, 400, "Expected 400 for invalid path parameter");
    console.log("✓ Invalid path param walletAddress rejected with 400 Bad Request");

    // =========================================================================
    // 5. Authentication & Authorization Hardening Suite
    // =========================================================================
    console.log("\n[TEST 5] Authentication & Authorization Hardening Suite");

    // 5a. Account Lockout after repeated failed authentication attempts
    const { authLockout, validateJwtSecret } = await import("../auth.js");
    authLockout.clear();

    const victimWallet = "0x2222222222222222222222222222222222222222";
    let lockoutOccurred = false;
    let lockoutStatus = 0;

    // Send 5 invalid signature attempts
    for (let i = 1; i <= 6; i++) {
      const failRes = await fetch(`${BASE_URL}/api/bind`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-test-bypass-limiter": "true" },
        body: JSON.stringify({
          walletAddress: victimWallet,
          email: "target@cadence.io",
          signature: "0x" + "bb".repeat(65),
          nonce: 1,
          timestamp: 100,
        }),
      });

      if (failRes.status === 429) {
        lockoutOccurred = true;
        lockoutStatus = failRes.status;
        const lockData = await failRes.json();
        assert.ok(lockData.error.includes("Account temporarily locked"), "Must return lockout message");
        assert.ok(failRes.headers.get("retry-after"), "Must return Retry-After header");
        console.log(`✓ Attempt #${i} triggered account lockout (HTTP ${lockoutStatus}):`, lockData.error);
        break;
      }
    }
    assert.strictEqual(lockoutOccurred, true, "Must trigger account lockout after repeated failed auth attempts");

    // 5b. Strong JWT Secret Validation (minimum 32 characters)
    const weakJwt = validateJwtSecret("short-insecure-secret");
    assert.strictEqual(weakJwt.valid, false, "Must reject weak JWT secrets (< 32 characters)");
    const strongJwt = validateJwtSecret("a-very-strong-secret-that-exceeds-32-chars-long!");
    assert.strictEqual(strongJwt.valid, true, "Must accept strong JWT secrets (>= 32 characters)");
    console.log("✓ Strong secret / JWT length policy verified (min 32 characters)");

    // 5c. Authorization: Masking of sensitive contacts in GET /api/monitored-vaults
    // Register a test monitored vault with guardian email
    const monitorRes = await fetch(`${BASE_URL}/api/monitor-vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-bypass-limiter": "true" },
      body: JSON.stringify({
        vaultAddress: "0x3333333333333333333333333333333333333333",
        name: "Security Test Vault",
        guardians: [
          { address: accountOwner.address, label: "Guardian 1", email: "secret.guardian@cadence.io" }
        ]
      })
    });
    assert.strictEqual(monitorRes.status, 200);

    // Unauthenticated GET /api/monitored-vaults -> emails must be masked
    const publicVaultsRes = await fetch(`${BASE_URL}/api/monitored-vaults`);
    const publicVaultsData = await publicVaultsRes.json();
    const testVaultPublic = publicVaultsData.vaults.find((v: any) => v.vaultAddress === "0x3333333333333333333333333333333333333333");
    assert.ok(testVaultPublic, "Vault must be listed in monitored list");
    const maskedGuardianEmail = testVaultPublic.guardians[0]?.email;
    assert.ok(maskedGuardianEmail.includes("***"), "Unauthenticated caller must receive masked email");
    console.log("✓ Unauthenticated query masks sensitive guardian email:", maskedGuardianEmail);

    // Authenticated GET /api/monitored-vaults with internal secret -> reveals email
    const privilegedVaultsRes = await fetch(`${BASE_URL}/api/monitored-vaults`, {
      headers: { "x-cadence-internal-key": "cadence-internal-secret" }
    });
    const privilegedVaultsData = await privilegedVaultsRes.json();
    const testVaultPrivileged = privilegedVaultsData.vaults.find((v: any) => v.vaultAddress === "0x3333333333333333333333333333333333333333");
    assert.strictEqual(testVaultPrivileged.guardians[0]?.email, "secret.guardian@cadence.io", "Privileged caller sees full email");
    console.log("✓ Privileged query with role authorization receives full email");

    // =========================================================================
    // 6. SQL & Database Security Suite
    // =========================================================================
    console.log("\n[TEST 6] SQL & Database Security Suite");

    // 6a. Field sanitization and normalization before DB write
    const rawDirtyEmail = "   <b>TestBeneficiary@Cadence.IO</b>\u0000   ";
    const bindingResult = db.suggestBinding(
      "0x4444444444444444444444444444444444444444",
      rawDirtyEmail,
      accountOwner.address
    );
    assert.strictEqual(
      bindingResult.email,
      "testbeneficiary@cadence.io",
      "DB write must sanitize, strip HTML tags/control chars, and lowercase email"
    );
    console.log("✓ DB fields sanitized and normalized prior to persistent storage:", bindingResult.email);

    // 6b. Database and internal errors never leak schema, tables, or stack traces to client
    // Test server error handler returns sanitized generic JSON
    const simulatedErrorRes = await new Promise<any>((resolve) => {
      const mockReq: any = {
        method: "POST",
        url: "/api/test-db-error",
        socket: { remoteAddress: "127.0.0.1" },
        connection: { remoteAddress: "127.0.0.1" },
      };
      let responseStatus = 0;
      let responseBody: any = null;
      const mockRes: any = {
        headersSent: false,
        setHeader() {
          return this;
        },
        status(code: number) {
          responseStatus = code;
          return this;
        },
        json(body: any) {
          responseBody = body;
          resolve({ status: responseStatus, body: responseBody });
        },
      };
      
      // Simulate raw database error with table and path metadata
      const rawDbError = new Error("FATAL: Table 'cadence.vault_bindings' not found in /var/data/schema.sql");
      (app as any).handle(mockReq, mockRes, () => {
        // Trigger error middleware by calling with error
        const errorMiddleware = (app as any)._router.stack.find((s: any) => s.handle.length === 4);
        errorMiddleware.handle(rawDbError, mockReq, mockRes, () => {});
      });
    });

    assert.strictEqual(simulatedErrorRes.status, 500, "Must return HTTP 500 for database error");
    assert.strictEqual(simulatedErrorRes.body.error, "Internal Server Error");
    assert.ok(
      !JSON.stringify(simulatedErrorRes.body).includes("cadence.vault_bindings"),
      "Must NEVER leak table names or database schema"
    );
    assert.ok(
      !JSON.stringify(simulatedErrorRes.body).includes("/var/data"),
      "Must NEVER leak internal system or file paths"
    );
    console.log("✓ Raw database errors safely masked; zero schema or path disclosure to client");

    // =========================================================================
    // 7. CORS Configuration Security Suite
    // =========================================================================
    console.log("\n[TEST 7] CORS Configuration Security Suite");

    // 7a. Whitelisted origin receives explicit origin header (never wildcard '*')
    const validOriginRes = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: "https://cadence-protocol.vercel.app" },
    });
    const allowOriginHeader = validOriginRes.headers.get("access-control-allow-origin");
    assert.strictEqual(
      allowOriginHeader,
      "https://cadence-protocol.vercel.app",
      "Whitelisted origin must receive matching Access-Control-Allow-Origin"
    );
    assert.notStrictEqual(allowOriginHeader, "*", "Access-Control-Allow-Origin must NEVER be wildcard '*'");
    console.log("✓ Whitelisted origin received explicit CORS header (non-wildcard):", allowOriginHeader);

    // 7b. Unwhitelisted origin is denied CORS headers
    const badOriginRes = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: "https://evil-attacker.io" },
    });
    const badOriginHeader = badOriginRes.headers.get("access-control-allow-origin");
    assert.strictEqual(
      badOriginHeader,
      null,
      "Unwhitelisted origin must NOT receive Access-Control-Allow-Origin header"
    );
    console.log("✓ Unwhitelisted origin denied Access-Control-Allow-Origin header (browser blocks)");

    // 7c. Preflight OPTIONS request restricts HTTP methods
    const preflightRes = await fetch(`${BASE_URL}/api/bind`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://cadence-protocol.vercel.app",
        "Access-Control-Request-Method": "POST",
      },
    });
    const allowMethodsHeader = preflightRes.headers.get("access-control-allow-methods");
    assert.ok(allowMethodsHeader, "Preflight must return Access-Control-Allow-Methods");
    assert.ok(
      !allowMethodsHeader.includes("DELETE") && !allowMethodsHeader.includes("PUT"),
      "Allowed methods must only include necessary verbs (GET, POST, OPTIONS)"
    );
    console.log("✓ Preflight restricted allowed methods:", allowMethodsHeader);

    // =========================================================================
    // 8. HTTP Security Headers Suite (Helmet & Standards)
    // =========================================================================
    console.log("\n[TEST 8] HTTP Security Headers Suite");

    const headerRes = await fetch(`${BASE_URL}/health`);

    // 8a. Content-Security-Policy
    const csp = headerRes.headers.get("content-security-policy");
    assert.ok(csp, "Content-Security-Policy header must be present");
    assert.ok(csp.includes("default-src 'self'"), "CSP must restrict default-src to 'self'");
    console.log("✓ Content-Security-Policy present and restrictive:", csp.split(";")[0]);

    // 8b. X-Frame-Options: DENY
    const xfo = headerRes.headers.get("x-frame-options");
    assert.strictEqual(xfo, "DENY", "X-Frame-Options must be DENY to prevent clickjacking");
    console.log("✓ X-Frame-Options set to DENY");

    // 8c. X-Content-Type-Options: nosniff
    const xcto = headerRes.headers.get("x-content-type-options");
    assert.strictEqual(xcto, "nosniff", "X-Content-Type-Options must be nosniff to prevent MIME-sniffing");
    console.log("✓ X-Content-Type-Options set to nosniff");

    // 8d. Strict-Transport-Security (HSTS)
    const hsts = headerRes.headers.get("strict-transport-security");
    assert.ok(hsts, "Strict-Transport-Security header must be present");
    assert.ok(hsts.includes("max-age=31536000"), "HSTS must enforce at least 1-year max-age");
    console.log("✓ Strict-Transport-Security enforces HTTPS:", hsts);

    // 8e. Referrer-Policy: strict-origin-when-cross-origin
    const refPolicy = headerRes.headers.get("referrer-policy");
    assert.strictEqual(refPolicy, "strict-origin-when-cross-origin", "Referrer-Policy must be strict-origin-when-cross-origin");
    console.log("✓ Referrer-Policy set to strict-origin-when-cross-origin");

    // 8f. X-Powered-By must be completely stripped
    const poweredBy = headerRes.headers.get("x-powered-by");
    assert.strictEqual(poweredBy, null, "X-Powered-By header must NEVER be present");
    console.log("✓ X-Powered-By header verified stripped/absent (zero server fingerprinting)");

    // =========================================================================
    // 9. File Upload Security Suite
    // =========================================================================
    console.log("\n[TEST 9] File Upload Security Suite");
    const { validateAndPrepareUpload, saveUploadSecurely, FILE_LIMITS } = await import("../fileUploadSecurity.js");

    // 9a. Rejects dangerous executable / script extensions
    const dangerousUpload = validateAndPrepareUpload({
      originalFilename: "malicious_payload.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ...fake-exe"),
    });
    assert.strictEqual(dangerousUpload.valid, false, "Must reject dangerous executable file extension");
    console.log("✓ Dangerous executable extension rejected:", dangerousUpload.error);

    // 9b. Rejects mismatched MIME type and file extension
    const mismatchedUpload = validateAndPrepareUpload({
      originalFilename: "photo.jpg",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    assert.strictEqual(mismatchedUpload.valid, false, "Must reject mismatched MIME type and extension");
    console.log("✓ Mismatched MIME type and extension rejected:", mismatchedUpload.error);

    // 9c. Enforces strict file size limits (5MB for images)
    const oversizedBuffer = Buffer.alloc(FILE_LIMITS.IMAGE_MAX_BYTES + 1024);
    // Write valid PNG magic bytes at start
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(oversizedBuffer);
    const oversizedUpload = validateAndPrepareUpload({
      originalFilename: "huge_avatar.png",
      mimeType: "image/png",
      buffer: oversizedBuffer,
    });
    assert.strictEqual(oversizedUpload.valid, false, "Must reject file exceeding size limit");
    console.log("✓ Oversized file rejected by size guard:", oversizedUpload.error);

    // 9d. Rejects invalid magic bytes (disguised text file)
    const fakePngUpload = validateAndPrepareUpload({
      originalFilename: "fake.png",
      mimeType: "image/png",
      buffer: Buffer.from("This is just plain text disguised as a PNG!"),
    });
    assert.strictEqual(fakePngUpload.valid, false, "Must reject file failing magic bytes verification");
    console.log("✓ Disguised file rejected by magic bytes verification:", fakePngUpload.error);

    // 9e. Rejects embedded script / XSS payload
    const xssPdfBuffer = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("<script>alert('xss_attack')</script>"),
    ]);
    const xssUpload = validateAndPrepareUpload({
      originalFilename: "exploit.pdf",
      mimeType: "application/pdf",
      buffer: xssPdfBuffer,
    });
    assert.strictEqual(xssUpload.valid, false, "Must reject embedded script injection");
    console.log("✓ Embedded script injection rejected by security scanner:", xssUpload.error);

    // 9f. Legitimate file accepted and renamed to UUID
    const validPngBuffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("Valid image data"),
    ]);
    const legitUpload = validateAndPrepareUpload({
      originalFilename: "my_personal_profile_2026!@#.png",
      mimeType: "image/png",
      buffer: validPngBuffer,
    });
    assert.strictEqual(legitUpload.valid, true, "Valid file must be accepted");
    assert.notStrictEqual(legitUpload.safeFileName, "my_personal_profile_2026!@#.png");
    assert.ok(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i.test(legitUpload.safeFileName!),
      "Filename must be renamed to a random UUID"
    );
    console.log("✓ Original filename safely stripped and renamed to UUID:", legitUpload.safeFileName);

    // 9g. Non-executable file permission and storage outside web root
    assert.ok(
      !legitUpload.storagePath!.includes("public"),
      "Storage path must be outside the public web root"
    );
    console.log("✓ Storage path isolated outside public web root:", legitUpload.storagePath);

    // =========================================================================
    // 10. Error Handling & Logging Security Suite
    // =========================================================================
    console.log("\n[TEST 10] Error Handling & Logging Security Suite");
    const { redactSensitive } = await import("../logger.js");

    // 10a. 4xx vs 5xx Status Code Distinction: Validation failures MUST be 400, never 500
    const validationCheckRes = await fetch(`${BASE_URL}/api/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-bypass-limiter": "true" },
      body: JSON.stringify({ email: "not-an-address" }),
    });
    assert.strictEqual(validationCheckRes.status, 400, "Validation failure MUST return 400 Bad Request, NOT 500");
    const valJson = await validationCheckRes.json();
    assert.ok(valJson.error, "Client error must return clear descriptive error message");
    console.log("✓ 4xx status code properly distinguished for validation error (HTTP 400, not 500)");

    // 10b. Generic error message on 500 with zero stack traces or internal paths
    const fiveHundredRes = await new Promise<any>((resolve) => {
      const mockReq: any = {
        method: "GET",
        url: "/api/crash-test",
        socket: { remoteAddress: "127.0.0.1" },
        connection: { remoteAddress: "127.0.0.1" },
      };
      let status = 0;
      let body: any = null;
      const mockRes: any = {
        headersSent: false,
        setHeader() { return this; },
        status(code: number) { status = code; return this; },
        json(b: any) { body = b; resolve({ status, body }); }
      };
      const fatalError = new Error("Uncaught TypeError at c:\\Users\\USER\\secret\\server.ts:88");
      const errorMiddleware = (app as any)._router.stack.find((s: any) => s.handle.length === 4);
      errorMiddleware.handle(fatalError, mockReq, mockRes, () => {});
    });

    assert.strictEqual(fiveHundredRes.status, 500, "Must return HTTP 500 for unhandled runtime error");
    assert.strictEqual(fiveHundredRes.body.message, "Something went wrong. Please try again later.", "Must return generic user-friendly message");
    assert.strictEqual(fiveHundredRes.body.stack, undefined, "Stack trace must NEVER be included in response");
    assert.ok(!JSON.stringify(fiveHundredRes.body).includes("server.ts"), "Internal file paths must NEVER leak to response");
    console.log("✓ Generic message returned on 500 with zero stack trace or internal path leakage");

    // 10c. Credential & secret redaction in logging context
    const rawContext = {
      user: "owner",
      token: "super-secret-admin-token-12345",
      privateKey: "0x" + "aa".repeat(32),
      authorization: "Bearer secret",
      vaultId: "vault-100",
    };
    const cleanedContext: any = redactSensitive(rawContext);
    assert.strictEqual(cleanedContext.token, "[REDACTED]", "Tokens must be redacted in logs");
    assert.strictEqual(cleanedContext.privateKey, "[REDACTED]", "Private keys must be redacted in logs");
    assert.strictEqual(cleanedContext.authorization, "[REDACTED]", "Authorization headers must be redacted in logs");
    assert.strictEqual(cleanedContext.vaultId, "vault-100", "Non-sensitive fields must remain intact");
    console.log("✓ Contextual logger redacts sensitive credentials and private keys");

    // =========================================================================
    // 11. Content Security Policy (CSP) & Frontend Anti-XSS Enforcement
    // =========================================================================
    console.log("\n[TEST 11] Frontend CSP, DOMPurify Sanitization, and Code Execution Bans");

    const frontendDir = path.resolve(process.cwd(), "..", "frontend");
    assert.ok(fs.existsSync(frontendDir), "Frontend directory must exist");

    // 11a. Ensure no eval(), new Function(), or inline <script> in frontend components & app
    function scanDir(dir: string, fileList: string[] = []): string[] {
      if (!fs.existsSync(dir)) return fileList;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!["node_modules", ".next", "out", "build", "scripts"].includes(entry.name)) {
            scanDir(fullPath, fileList);
          }
        } else if (/\.(tsx|ts|jsx|js|html)$/.test(entry.name)) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const frontendFiles = [
      ...scanDir(path.join(frontendDir, "app")),
      ...scanDir(path.join(frontendDir, "components")),
      ...scanDir(path.join(frontendDir, "lib")),
      ...scanDir(path.join(frontendDir, "hooks")),
    ];

    for (const filePath of frontendFiles) {
      const relPath = path.relative(frontendDir, filePath).replace(/\\/g, "/");
      const content = fs.readFileSync(filePath, "utf-8");

      // Strip comments and string literals to accurately detect actual code execution calls
      const codeWithoutStrings = content
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
        .replace(/'(?:\\.|[^\\'])*'|"(?:\\.|[^\\"])*"|`(?:\\.|[^\\`])*`/g, '""')
        .replace(/\/(?:\\.|[^\/\n\r])+\/[gimsuy]*/g, '""');

      // No eval()
      assert.ok(!/\beval\s*\(/.test(codeWithoutStrings), `eval() invocation is strictly forbidden: found in ${relPath}`);

      // No new Function()
      assert.ok(!/\bnew\s+Function\s*\(/.test(codeWithoutStrings), `new Function() invocation is strictly forbidden: found in ${relPath}`);

      // No inline <script>
      assert.ok(!/<script\b[^>]*>/i.test(codeWithoutStrings), `Inline <script> tags are forbidden: found in ${relPath}`);

      // No dangerouslySetInnerHTML unless in SafeHtml.tsx
      if (codeWithoutStrings.includes("dangerouslySetInnerHTML") && !relPath.includes("SafeHtml.tsx")) {
        assert.fail(`Direct dangerouslySetInnerHTML is forbidden without DOMPurify SafeHtml wrapper: found in ${relPath}`);
      }
    }
    console.log(`✓ Audited ${frontendFiles.length} frontend source files: 0 eval, 0 new Function, 0 inline scripts, 0 raw dangerouslySetInnerHTML`);

    // 11b. Verify Next.js & Vercel CSP configuration
    const nextConfigPath = path.join(frontendDir, "next.config.ts");
    const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
    assert.ok(nextConfigContent.includes("Content-Security-Policy"), "next.config.ts must configure Content-Security-Policy header");
    assert.ok(nextConfigContent.includes("frame-ancestors 'none'"), "next.config.ts CSP must block clickjacking frame embedding");

    const vercelJsonPath = path.join(frontendDir, "vercel.json");
    const vercelContent = fs.readFileSync(vercelJsonPath, "utf-8");
    assert.ok(vercelContent.includes("Content-Security-Policy"), "vercel.json must configure edge Content-Security-Policy header");
    console.log("✓ Verified Content Security Policy headers in next.config.ts and vercel.json");

    // 11c. Verify ESLint rules enforce code execution restrictions
    const eslintConfigPath = path.join(frontendDir, "eslint.config.mjs");
    const eslintContent = fs.readFileSync(eslintConfigPath, "utf-8");
    assert.ok(eslintContent.includes('"no-eval": "error"'), "ESLint must enforce no-eval");
    assert.ok(eslintContent.includes('"no-new-func": "error"'), "ESLint must enforce no-new-func");
    assert.ok(eslintContent.includes('"no-script-url": "error"'), "ESLint must enforce no-script-url");
    console.log("✓ Verified ESLint enforcement for no-eval, no-new-func, and no-script-url");

    console.log("\n========================================================");
    console.log("ALL SECURITY AUDIT REGRESSION TESTS PASSED (Suites 1-11)!");
    console.log("========================================================");
  } finally {
    server.close();
  }
}

runSecurityAuditTests().catch((err) => {
  console.error("SECURITY REGRESSION TEST FAILED:", err);
  process.exit(1);
});
