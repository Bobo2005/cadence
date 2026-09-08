import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getAddress } from "viem";
import { db } from "./db.js";
import { verifyWalletBindingSignature, getBindingMessage } from "./bindingVerifier.js";
import { emailService } from "./emailService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

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
 */
app.get("/api/message/:walletAddress", (req: Request, res: Response) => {
  try {
    const address = getAddress(req.params.walletAddress);
    const message = getBindingMessage(address);
    res.json({ walletAddress: address, message });
  } catch {
    res.status(400).json({ error: "Invalid wallet address format" });
  }
});

/**
 * GET /api/status/:walletAddress
 * Checks binding status for a wallet address.
 */
app.get("/api/status/:walletAddress", (req: Request, res: Response) => {
  try {
    const address = getAddress(req.params.walletAddress);
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
  } catch {
    res.status(400).json({ error: "Invalid wallet address format" });
  }
});

/**
 * POST /api/suggest
 * Used by vault owner during vault creation to suggest a beneficiary email.
 * CONSTRAINT #6: This NEVER marks the email as verified or active.
 * It is saved as PENDING with verified=false, receiving ZERO notifications
 * until the beneficiary wallet explicitly signs.
 */
app.post("/api/suggest", (req: Request, res: Response) => {
  try {
    const { walletAddress, email, suggestedBy } = req.body;

    if (!walletAddress || !email || !suggestedBy) {
      return res.status(400).json({
        error: "walletAddress, email, and suggestedBy are required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const target = getAddress(walletAddress);
    const owner = getAddress(suggestedBy);

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
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to record suggestion" });
  }
});

/**
 * POST /api/bind
 * Wallet owner or beneficiary signs the confirmation message to bind and verify email.
 * CONSTRAINT #6: Valid signature from walletAddress is strictly required.
 */
app.post("/api/bind", async (req: Request, res: Response) => {
  try {
    const { walletAddress, email, signature } = req.body;

    if (!walletAddress || !email || !signature) {
      return res.status(400).json({
        error: "walletAddress, email, and signature are required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const normalizedAddress = getAddress(walletAddress);

    // Verify signature with viem
    const verification = await verifyWalletBindingSignature(normalizedAddress, signature);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet signature",
        detail: verification.error || "Signature does not match wallet address and canonical message"
      });
    }

    // Signature is valid! Persist binding with verified=true
    const binding = db.confirmBinding(normalizedAddress, email, signature);

    console.log(`[BIND SUCCESS] Wallet ${normalizedAddress} bound to ${email}`);

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
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Binding failed" });
  }
});

/**
 * POST /api/notify/owner-reminder
 * Dispatches check-in reminder to vault owner (if verified).
 */
app.post("/api/notify/owner-reminder", async (req: Request, res: Response) => {
  try {
    const { ownerAddress, vaultId, daysRemaining, deadlineTimestamp } = req.body;
    if (!ownerAddress) {
      return res.status(400).json({ error: "ownerAddress is required" });
    }

    const result = await emailService.sendOwnerReminder({
      ownerAddress,
      vaultId,
      daysRemaining: daysRemaining ?? 7,
      deadlineTimestamp
    });

    if (!result.success) {
      return res.status(403).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to dispatch reminder" });
  }
});

/**
 * POST /api/notify/beneficiary-added
 * Dispatches notice to beneficiary when added (ONLY if beneficiary is verified).
 */
app.post("/api/notify/beneficiary-added", async (req: Request, res: Response) => {
  try {
    const { beneficiaryAddress, ownerAddress, vaultId, shareBps } = req.body;
    if (!beneficiaryAddress || !ownerAddress) {
      return res.status(400).json({ error: "beneficiaryAddress and ownerAddress are required" });
    }

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
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to dispatch notice" });
  }
});

/**
 * POST /api/notify/claim-ready
 * Dispatches claim ready notice to beneficiary (ONLY if beneficiary is verified).
 */
app.post("/api/notify/claim-ready", async (req: Request, res: Response) => {
  try {
    const { beneficiaryAddress, vaultId, claimableAmount, reason } = req.body;
    if (!beneficiaryAddress) {
      return res.status(400).json({ error: "beneficiaryAddress is required" });
    }

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
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to dispatch claim notice" });
  }
});

/**
 * POST /api/remind-wallet
 * Wrong-wallet recovery: looks up verified wallet addresses by email and sends an email reminder.
 *
 * ⚠️ STRICT PRIVACY & ANTI-FISHING CONSTRAINT:
 * Do NOT return matching wallet addresses or indicate whether an address was found to the UI.
 * The reveal ONLY happens via the email itself, sent to an address already verified.
 */
app.post("/api/remind-wallet", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
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
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to process reminder request" });
  }
});

/**
 * GET /api/outbox
 * Audit log of sent notifications.
 */
app.get("/api/outbox", (req: Request, res: Response) => {
  const outbox = emailService.getOutbox();
  res.json({ total: outbox.length, outbox });
});

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, () => {
    console.log(`[Cadence Notifications] Service running on http://localhost:${PORT}`);
    console.log(`[Cadence Notifications] Security Constraint #6 Active: Wallet signatures enforced.`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`[Cadence Notifications] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("[Cadence Notifications] HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

export default app;
