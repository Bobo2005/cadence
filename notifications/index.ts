import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";
import { getAddress } from "viem";
import { db } from "./db.js";
import { verifyWalletBindingSignature, getBindingMessage } from "./bindingVerifier.js";
import { emailService } from "./emailService.js";
import { sentinel } from "./sentinel.js";
import {
  SuggestSchema,
  BindSchema,
  RemindWalletSchema,
  OwnerReminderSchema,
  BeneficiaryAddedSchema,
  ClaimReadySchema,
  GuardianAttestRequestSchema,
  ContestConcludedSchema,
  MonitorVaultSchema,
  WalletAddressParamSchema,
} from "./schemas.js";
import { safeCompare, authLockout, validateJwtSecret } from "./auth.js";
import { logger } from "./logger.js";
import helmet from "helmet";

function formatZodError(error: import("zod").ZodError): { error: string; details: string[] } {
  const issues = error?.issues || (error as any)?.errors || [];
  const details = issues.map((e: any) => `${e.path?.join(".") || "field"}: ${e.message}`);
  return {
    error: details[0] || "Invalid request payload",
    details,
  };
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 7. HTTP Security Headers
// Disable X-Powered-By header to prevent server/framework fingerprinting
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://cadence-ebon-six.vercel.app",
          "https://cadence-protocol.vercel.app",
          "https://eth-sepolia.g.alchemy.com",
          "https://sepolia.infura.io",
        ],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: { action: "deny" }, // X-Frame-Options: DENY
    noSniff: true, // X-Content-Type-Options: nosniff
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hidePoweredBy: true,
  })
);

// Guarantee Strict-Transport-Security header is always applied (even in dev/test reverse-proxy setups)
app.use((req: Request, res: Response, next: () => void) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  next();
});

// 6. Strict & Whitelisted CORS Configuration
const isProduction = process.env.NODE_ENV === "production";

const productionOrigins = [
  process.env.CLIENT_URL,
  "https://cadence-ebon-six.vercel.app",
  "https://cadence-protocol.vercel.app",
].filter(Boolean) as string[];

const devOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

const allowedOrigins = isProduction
  ? productionOrigins
  : [...productionOrigins, ...devOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile native apps)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check trusted Vercel deployment preview domains for Cadence
      if (/^https:\/\/cadence-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Origin not permitted: omit Access-Control-Allow-Origin header (browser blocks)
      return callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-cadence-internal-key",
      "x-admin-key",
      "x-internal-key",
      "x-test-bypass-limiter",
    ],
    maxAge: 86400, // 24-hour preflight cache
  })
);

app.use(express.json());

// 2.3 Rate Limiting: Global Rate Limiter (60 requests per minute per IP)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  handler: (req: Request, res: Response) => {
    const retryAfter = res.getHeader("Retry-After") || 60;
    res.status(429).json({
      error: "Too Many Requests",
      message: `Rate limit exceeded (60 requests/minute). Please try again in ${retryAfter} seconds.`,
      retryAfter: Number(retryAfter) || 60,
    });
  },
  skip: (req) => process.env.NODE_ENV === "test" && req.headers["x-test-bypass-limiter"] === "true",
});
app.use(globalLimiter);

// 2.3 Rate Limiting: Strict Auth & Form Submission Limiter (5 requests per 15 minutes per IP)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  handler: (req: Request, res: Response) => {
    const retryAfter = res.getHeader("Retry-After") || 900;
    res.status(429).json({
      error: "Too Many Requests",
      message: `Rate limit exceeded for sensitive operations (5 requests/15 minutes). Please try again in ${retryAfter} seconds.`,
      retryAfter: Number(retryAfter) || 900,
    });
  },
  skip: (req) => process.env.NODE_ENV === "test" && req.headers["x-test-bypass-limiter"] === "true",
});

// 2.2 Internal Trigger Authentication Middleware
const INTERNAL_KEY = process.env.CADENCE_INTERNAL_API_KEY || "cadence-internal-secret";

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const rawKey = req.headers["x-cadence-internal-key"] || req.headers["x-internal-key"];
  const key = typeof rawKey === "string" ? rawKey.trim() : Array.isArray(rawKey) ? rawKey[0] : "";
  if (!key || !safeCompare(key, INTERNAL_KEY)) {
    return res.status(401).json({
      error: "Unauthorized: Missing or invalid x-cadence-internal-key header",
    });
  }
  next();
}

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "cadence-notifications",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/message/:walletAddress
 * Returns the exact message text the wallet must sign to bind an email.
 * Binds email, nonce, and timestamp per Constraint #6 and Phase 2 hardening.
 */
app.get("/api/message/:walletAddress", (req: Request, res: Response) => {
  const paramResult = WalletAddressParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    console.warn("[InputValidation] Invalid wallet address in GET /api/message:", req.params.walletAddress);
    return res.status(400).json({ error: "Invalid wallet address format" });
  }
  const address = paramResult.data.walletAddress;
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  const nonce = req.query.nonce !== undefined ? String(req.query.nonce) : 0;
  const timestamp = req.query.timestamp !== undefined ? String(req.query.timestamp) : 0;
  const message = getBindingMessage(address, email, nonce, timestamp);
  res.json({ walletAddress: address, email, nonce, timestamp, message });
});

/**
 * GET /api/status/:walletAddress
 * Checks binding status for a wallet address.
 */
app.get("/api/status/:walletAddress", (req: Request, res: Response) => {
  const paramResult = WalletAddressParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    console.warn("[InputValidation] Invalid wallet address in GET /api/status:", req.params.walletAddress);
    return res.status(400).json({ error: "Invalid wallet address format" });
  }
  const address = paramResult.data.walletAddress;
  const binding = db.getBinding(address);

  if (!binding) {
    return res.json({
      walletAddress: address,
      bound: false,
      verified: false,
      email: null,
      pendingSuggestion: false
    });
  }

  // Mask email for privacy if requested by unauthenticated query
  const maskedEmail = binding.email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
    return `${first}${"*".repeat(Math.min(middle.length, 5))}${domain}`;
  });

  res.json({
    walletAddress: address,
    bound: true,
    verified: binding.verified,
    email: binding.email,
    maskedEmail,
    pendingSuggestion: !binding.verified && !!binding.suggestedBy,
    suggestedBy: binding.suggestedBy || null,
    createdAt: binding.createdAt,
    verifiedAt: binding.verifiedAt || null
  });
});

/**
 * POST /api/suggest
 * Used by vault owner during vault creation to suggest a beneficiary email.
 * CONSTRAINT #6: This NEVER marks the email as verified or active.
 * It is saved as PENDING with verified=false, receiving ZERO notifications
 * until the beneficiary wallet explicitly signs.
 */
app.post("/api/suggest", strictLimiter, (req: Request, res: Response) => {
  const parseResult = SuggestSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/suggest rejected:", err.details);
    return res.status(400).json(err);
  }

  const { walletAddress: target, email, suggestedBy: owner } = parseResult.data;
  const binding = db.suggestBinding(target, email, owner);

  res.json({
    success: true,
    status: "PENDING",
    message: "Beneficiary email suggested. Must be verified by beneficiary wallet signature before activation.",
    binding: {
      walletAddress: binding.walletAddress,
      email: binding.email,
      verified: binding.verified,
      suggestedBy: binding.suggestedBy
    }
  });
});

/**
 * POST /api/bind
 * Wallet owner or beneficiary signs the confirmation message to bind and verify email.
 * CONSTRAINT #6 & Phase 2.1: Valid signature strictly binding walletAddress + email is enforced.
 */
app.post("/api/bind", strictLimiter, async (req: Request, res: Response) => {
  const parseResult = BindSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/bind rejected:", err.details);
    return res.status(400).json(err);
  }

  const { walletAddress: normalizedAddress, email: cleanEmail, signature, nonce, timestamp } = parseResult.data;

  // Account lockout protection against repeated failed authentication attempts
  const clientId = `${req.ip || "ip"}:${normalizedAddress.toLowerCase()}`;
  const lockStatus = authLockout.isLocked(clientId);
  if (lockStatus.locked) {
    res.setHeader("Retry-After", lockStatus.retryAfter);
    return res.status(429).json({
      success: false,
      error: "Account temporarily locked due to multiple failed authentication attempts",
      message: `Too many failed authentication attempts. Please try again in ${lockStatus.retryAfter} seconds.`,
      retryAfter: lockStatus.retryAfter,
    });
  }

  // Verify signature with viem strictly binding email, nonce, timestamp
  const verification = await verifyWalletBindingSignature(
    normalizedAddress,
    cleanEmail,
    signature,
    nonce ?? 0,
    timestamp ?? 0
  );

  if (!verification.valid) {
    const failureResult = authLockout.recordFailure(clientId);
    console.warn(`[InputValidation] /api/bind signature verification failed for ${normalizedAddress}`);
    if (failureResult.locked) {
      res.setHeader("Retry-After", failureResult.retryAfter);
      return res.status(429).json({
        success: false,
        error: "Account temporarily locked due to multiple failed authentication attempts",
        message: `Too many failed authentication attempts. Account locked for ${failureResult.retryAfter} seconds.`,
        retryAfter: failureResult.retryAfter,
      });
    }
    return res.status(400).json({
      success: false,
      error: "Invalid wallet signature",
      detail: verification.error || "Signature does not match wallet address and canonical message",
      attemptsRemaining: failureResult.attemptsLeft,
    });
  }

  // Authentication succeeded — reset failed attempt counter for this identity
  authLockout.recordSuccess(clientId);

  // Signature is valid! Persist binding with verified=true
  const binding = db.confirmBinding(normalizedAddress, cleanEmail, signature as `0x${string}`);

  console.log(`[BIND SUCCESS] Wallet ${normalizedAddress} bound to ${cleanEmail}`);

  // Dispatches instant welcome & confirmation email to recipient
  emailService
    .sendWelcomeConfirmation({
      walletAddress: normalizedAddress,
      email: binding.email,
    })
    .catch((err) => {
      console.warn("[EmailService] Failed to dispatch welcome confirmation:", err);
    });

  res.json({
    success: true,
    verified: true,
    message: "Email successfully bound and verified by wallet signature",
    binding: {
      walletAddress: binding.walletAddress,
      email: binding.email,
      verified: binding.verified,
      verifiedAt: binding.verifiedAt
    }
  });
});

/**
 * POST /api/notify/owner-reminder
 * Dispatches check-in reminder to vault owner (if verified).
 * Protected by internal secret header (x-cadence-internal-key).
 */
app.post("/api/notify/owner-reminder", requireInternalKey, async (req: Request, res: Response) => {
  const parseResult = OwnerReminderSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/notify/owner-reminder rejected:", err.details);
    return res.status(400).json(err);
  }

  const { ownerAddress, vaultId, daysRemaining, deadlineTimestamp } = parseResult.data;

  const result = await emailService.sendOwnerReminder({
    ownerAddress,
    vaultId,
    daysRemaining: daysRemaining ?? 7,
    deadlineTimestamp: typeof deadlineTimestamp === "number" ? deadlineTimestamp : undefined,
  });

  if (!result.success) {
    return res.status(403).json(result);
  }

  res.json(result);
});

/**
 * POST /api/notify/beneficiary-added
 * Dispatches notice to beneficiary when added (ONLY if beneficiary is verified).
 * Protected by internal secret header (x-cadence-internal-key).
 */
app.post("/api/notify/beneficiary-added", requireInternalKey, async (req: Request, res: Response) => {
  const parseResult = BeneficiaryAddedSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/notify/beneficiary-added rejected:", err.details);
    return res.status(400).json(err);
  }

  const { beneficiaryAddress, ownerAddress, vaultId, shareBps } = parseResult.data;

  const result = await emailService.sendBeneficiaryAdded({
    beneficiaryAddress,
    ownerAddress,
    vaultId,
    shareBps
  });

  if (!result.success) {
    return res.status(403).json(result);
  }

  res.json(result);
});

/**
 * POST /api/notify/claim-ready
 * Dispatches claim ready notice to beneficiary (ONLY if beneficiary is verified).
 * Protected by internal secret header (x-cadence-internal-key).
 */
app.post("/api/notify/claim-ready", requireInternalKey, async (req: Request, res: Response) => {
  const parseResult = ClaimReadySchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/notify/claim-ready rejected:", err.details);
    return res.status(400).json(err);
  }

  const { beneficiaryAddress, vaultId, claimableAmount, reason } = parseResult.data;

  const result = await emailService.sendClaimReady({
    beneficiaryAddress,
    vaultId,
    claimableAmount,
    reason
  });

  if (!result.success) {
    return res.status(403).json(result);
  }

  res.json(result);
});

/**
 * POST /api/notify/guardian-attest-request
 * Dispatches distinct email alerts to Guardian Node 1 and/or Guardian Node 2 when heartbeat lapses.
 */
app.post("/api/notify/guardian-attest-request", async (req: Request, res: Response) => {
  const parseResult = GuardianAttestRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/notify/guardian-attest-request rejected:", err.details);
    return res.status(400).json(err);
  }

  const { vaultAddress, vaultName, guardians, guardianAddress, guardianLabel, guardianEmail } = parseResult.data;

  // Support batch dispatch to multiple guardians (e.g. 2 distinct guardians)
  if (Array.isArray(guardians) && guardians.length > 0) {
    const results = [];
    for (const g of guardians) {
      if (!g.address) continue;
      const resAlert = await emailService.sendGuardianAttestationNotice({
        guardianAddress: g.address,
        guardianLabel: g.label || "Guardian Node",
        guardianEmail: g.email,
        vaultAddress,
        vaultName,
      });
      results.push({ guardian: g.address, label: g.label, ...resAlert });
    }
    return res.json({ success: true, count: results.length, results });
  }

  if (!guardianAddress) {
    return res.status(400).json({ error: "guardianAddress or guardians array is required" });
  }

  const result = await emailService.sendGuardianAttestationNotice({
    guardianAddress,
    guardianLabel: guardianLabel || "Guardian Node",
    guardianEmail,
    vaultAddress,
    vaultName,
  });

  res.json(result);
});

/**
 * POST /api/notify/contest-concluded
 * Dispatches alert when the contest grace period concludes.
 */
app.post("/api/notify/contest-concluded", async (req: Request, res: Response) => {
  const parseResult = ContestConcludedSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/notify/contest-concluded rejected:", err.details);
    return res.status(400).json(err);
  }

  const { vaultAddress, vaultName, recipients, recipientAddress, recipientRole, recipientEmail } = parseResult.data;

  if (Array.isArray(recipients) && recipients.length > 0) {
    const results = [];
    for (const r of recipients) {
      if (!r.address) continue;
      const resAlert = await emailService.sendContestConcludedNotice({
        recipientAddress: r.address,
        recipientRole: r.role || "Guardian",
        recipientEmail: r.email,
        vaultAddress,
        vaultName,
      });
      results.push({ recipient: r.address, role: r.role, ...resAlert });
    }
    return res.json({ success: true, count: results.length, results });
  }

  if (!recipientAddress) {
    return res.status(400).json({ error: "recipientAddress or recipients array is required" });
  }

  const result = await emailService.sendContestConcludedNotice({
    recipientAddress,
    recipientRole: recipientRole || "Guardian",
    recipientEmail,
    vaultAddress,
    vaultName,
  });

  res.json(result);
});

/**
 * POST /api/remind-wallet
 * Wrong-wallet recovery: looks up verified wallet addresses by email and sends an email reminder.
 *
 * ⚠️ STRICT PRIVACY & ANTI-FISHING CONSTRAINT:
 * Do NOT return matching wallet addresses or indicate whether an address was found to the UI.
 * The reveal ONLY happens via the email itself, sent to an address already verified.
 */
app.post("/api/remind-wallet", strictLimiter, async (req: Request, res: Response) => {
  const parseResult = RemindWalletSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/remind-wallet rejected:", err.details);
    return res.status(400).json({
      error: "A valid email address is required",
      details: err.details,
    });
  }

  const { email: cleanEmail } = parseResult.data;
  const matches = db.getVerifiedWalletsByEmail(cleanEmail);

  if (matches.length > 0) {
    emailService
      .sendWalletReminder({ email: cleanEmail, wallets: matches })
      .catch((err) => {
        console.warn("[EmailService] Wallet reminder email dispatch error:", err);
      });
  }

  // Always return neutral confirmation to prevent enumeration
  res.json({
    success: true,
    message: "If an account exists with that verified email, a reminder has been sent to your inbox."
  });
});

/**
 * GET /api/outbox
 * Audit log of sent notifications.
 * 2.2 Security Hardening: Protected by ADMIN_API_KEY bearer secret; disabled / restricted in production.
 */
app.get("/api/outbox", (req: Request, res: Response) => {
  const adminKey = process.env.ADMIN_API_KEY || "cadence-admin-secret";
  const authHeader = req.headers["authorization"] || req.headers["x-admin-key"];
  const token =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : undefined;

  const isValidAdmin = Boolean(token && safeCompare(token, adminKey));

  // In production, strictly require matching ADMIN_API_KEY
  if (process.env.NODE_ENV === "production") {
    if (!isValidAdmin) {
      return res.status(403).json({
        error: "Access forbidden: outbox audit log is restricted in production",
      });
    }
  } else {
    // In dev / test: if token is provided, it must match adminKey
    if (token !== undefined && !isValidAdmin) {
      return res.status(401).json({
        error: "Unauthorized: Invalid admin API key",
      });
    }
    // If no token is provided and caller specifies x-enforce-admin or in non-test mode with key set
    if (!token && process.env.NODE_ENV !== "test") {
      return res.status(401).json({
        error: "Unauthorized: Admin API key required",
      });
    }
  }

  const outbox = emailService.getOutbox();
  res.json({ total: outbox.length, outbox });
});

/**
 * POST /api/monitor-vault
 * Registers a vault with the autonomous Sentinel for automated on-chain monitoring.
 */
app.post("/api/monitor-vault", async (req: Request, res: Response) => {
  const parseResult = MonitorVaultSchema.safeParse(req.body);
  if (!parseResult.success) {
    const err = formatZodError(parseResult.error);
    console.warn("[InputValidation] /api/monitor-vault rejected:", err.details);
    return res.status(400).json(err);
  }

  const { vaultAddress, name, guardians } = parseResult.data;
  const monitored = sentinel.registerVault({ vaultAddress, name, guardians });
  res.json({ success: true, monitored });
});

/**
 * GET /api/monitored-vaults
 * Returns all vaults currently monitored by the Sentinel.
 * AuthZ: Guardian contact emails are masked unless caller presents internal/admin key.
 */
app.get("/api/monitored-vaults", (req: Request, res: Response) => {
  const rawKey = req.headers["x-cadence-internal-key"] || req.headers["x-internal-key"] || req.headers["x-admin-key"];
  const token = typeof rawKey === "string" ? rawKey.trim() : "";
  const adminKey = process.env.ADMIN_API_KEY || "cadence-admin-secret";
  const isPrivileged = safeCompare(token, INTERNAL_KEY) || safeCompare(token, adminKey);

  const vaults = sentinel.getMonitoredVaults().map((v) => {
    if (isPrivileged) return v;
    return {
      ...v,
      guardians: v.guardians.map((g) => ({
        ...g,
        email: g.email ? g.email.replace(/^(.)(.*)(@.*)$/, (_, f, m, d) => `${f}***${d}`) : undefined,
      })),
    };
  });

  res.json({ count: vaults.length, vaults });
});

// 9. Error Handling & Logging Middleware
// Strictly distinguish between 4xx client errors and 5xx server errors.
// Never leak stack traces, raw error messages, or internal file paths to the client.
app.use((err: any, req: Request, res: Response, _next: () => void) => {
  const statusCode = typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;

  let clientIp = "unknown";
  try {
    clientIp = req.ip || req.socket?.remoteAddress || "unknown";
  } catch {
    clientIp = "unknown";
  }

  // Log error server-side with rich context and credential redaction
  logger.error(
    `Handled ${statusCode} on ${req.method} ${req.url}`,
    err,
    {
      route: req.url,
      method: req.method,
      ip: clientIp,
      statusCode,
      params: req.params,
    }
  );

  if (res.headersSent) {
    return;
  }

  // 4xx: Return informative client error
  if (statusCode < 500) {
    return res.status(statusCode).json({
      error: err?.name || "Client Error",
      message: err?.message || "Invalid request",
      ...(err?.details ? { details: err.details } : {}),
    });
  }

  // 5xx: Return sanitized generic message to prevent information disclosure
  res.status(500).json({
    error: "Internal Server Error",
    message: "Something went wrong. Please try again later.",
  });
});

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, () => {
    console.log(`[Cadence Notifications] Service running on http://localhost:${PORT}`);
    console.log(`[Cadence Notifications] Security Constraint #6 Active: Wallet signatures enforced.`);
    // Start the autonomous Sentinel daemon
    sentinel.start(20000);
  });

  const handleShutdown = (signal: string) => {
    console.log(`[Cadence Notifications] Received ${signal}, shutting down gracefully...`);
    sentinel.stop();
    server.close(() => {
      console.log("[Cadence Notifications] HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

export default app;
