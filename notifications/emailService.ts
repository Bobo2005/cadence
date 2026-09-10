import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAddress } from "viem";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const OUTBOX_FILE = path.join(DATA_DIR, "outbox.json");

export function getClientBaseUrl(): string {
  const url = process.env.CLIENT_URL || "https://cadence-ebon-six.vercel.app";
  return url.replace(/\/$/, "");
}

function formatTruncatedAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export type NotificationType =
  | "WALLET_BOUND_CONFIRMATION"
  | "OWNER_CHECKIN_REMINDER"
  | "BENEFICIARY_ADDED"
  | "CLAIM_READY"
  | "WALLET_REMINDER";

export interface OutboxEntry {
  id: string;
  type: NotificationType;
  recipientWallet: `0x${string}`;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  vaultId?: string;
  timestamp: string;
}

export interface SendResult {
  success: boolean;
  notificationId?: string;
  reason?: string;
  error?: string;
  entry?: OutboxEntry;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isLiveSmtpConfigured = false;

  constructor() {
    this.ensureDataDir();
    this.initTransporter();
  }

  private initTransporter(): void {
    const resendKey = process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS;

    if (resendKey) {
      this.transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: resendKey,
        },
      });
      this.isLiveSmtpConfigured = true;
      console.log("[EmailService] Configured live SMTP transport via Resend.");
    } else if (smtpHost && smtpUser && rawPass) {
      const cleanPass = rawPass.replace(/^["']|["']$/g, "").replace(/\s+/g, "");
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const secure = process.env.SMTP_SECURE === "true" || port === 465;
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: cleanPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.isLiveSmtpConfigured = true;
      console.log(`[EmailService] Configured live SMTP transport via ${smtpHost}:${port} (secure: ${secure})`);
    } else {
      this.isLiveSmtpConfigured = false;
      console.log("[EmailService] Running in Local Outbox mode (data/outbox.json). Set RESEND_API_KEY or SMTP_* in .env to enable live inbox delivery.");
    }
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOutbox(): OutboxEntry[] {
    try {
      if (fs.existsSync(OUTBOX_FILE)) {
        const raw = fs.readFileSync(OUTBOX_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("[EmailService] Failed to load outbox:", err);
    }
    return [];
  }

  private recordOutbox(entry: OutboxEntry): void {
    try {
      this.ensureDataDir();
      const outbox = this.loadOutbox();
      outbox.push(entry);
      fs.writeFileSync(OUTBOX_FILE, JSON.stringify(outbox, null, 2), "utf8");
    } catch (err) {
      console.error("[EmailService] Failed to record outbox entry:", err);
    }
  }

  public getOutbox(): OutboxEntry[] {
    return this.loadOutbox();
  }

  /**
   * Dispatches an email notification ONLY IF the wallet address is strictly verified
   * via signature verification (Constraint #6).
   */
  public async dispatchNotification(params: {
    type: NotificationType;
    walletAddress: string;
    vaultId?: string;
    subject: string;
    bodyText: string;
    bodyHtml: string;
  }): Promise<SendResult> {
    let normalized: `0x${string}`;
    try {
      normalized = getAddress(params.walletAddress);
    } catch {
      return { success: false, reason: "INVALID_WALLET_ADDRESS", error: "Invalid Ethereum address format" };
    }

    const binding = db.getBinding(normalized);

    // SECURITY CONSTRAINT #6: Reject unverified emails
    if (!binding || !binding.verified || !binding.signature) {
      console.warn(
        `[SECURITY GUARD] Constraint #6 violation blocked: Refusing to send ${params.type} to unverified wallet ${normalized}. Email is ${binding ? "pending confirmation" : "not registered"}.`
      );
      return {
        success: false,
        reason: "WALLET_UNVERIFIED",
        error: `Refusing to send notification to unverified wallet ${normalized}. Wallet signature required before any notifications can be sent.`,
      };
    }

    const entry: OutboxEntry = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: params.type,
      recipientWallet: normalized,
      recipientEmail: binding.email,
      subject: params.subject,
      bodyText: params.bodyText,
      bodyHtml: params.bodyHtml,
      vaultId: params.vaultId,
      timestamp: new Date().toISOString(),
    };

    this.recordOutbox(entry);
    console.log(`[EMAIL DISPATCHED] Type: ${params.type} | To: ${binding.email} (${normalized}) | Subject: "${params.subject}"`);

    // Live SMTP transmission (if configured in .env)
    if (this.transporter && this.isLiveSmtpConfigured) {
      const from = process.env.SMTP_FROM || `"Cadence Protocol" <${process.env.SMTP_USER || "notifications@cadenceprotocol.io"}>`;
      try {
        const info = await this.transporter.sendMail({
          from,
          to: binding.email,
          subject: params.subject,
          text: params.bodyText,
          html: params.bodyHtml,
        });
        console.log(`[LIVE SMTP DELIVERED] Message ID: ${info.messageId} | Recipient: ${binding.email}`);
      } catch (err: any) {
        console.error(`[LIVE SMTP ERROR] Failed to deliver email to ${binding.email}:`, err?.message || err);
      }
    }

    return {
      success: true,
      notificationId: entry.id,
      entry,
    };
  }

  /**
   * 0. Welcome & Email Binding Confirmation
   * Dispatched immediately upon successful wallet-signature binding.
   */
  public async sendWelcomeConfirmation(params: {
    walletAddress: string;
    email: string;
  }): Promise<SendResult> {
    const appUrl = getClientBaseUrl();
    const subject = `[Cadence Protocol] Email Verified & Bound to Wallet`;
    const bodyText = `Welcome to Cadence Protocol.\n\nYour email address (${params.email}) has been successfully verified and cryptographically bound to wallet ${params.walletAddress}.\n\nYou will receive timely, privacy-preserving alerts whenever your vault check-in deadline approaches or when an inheritance allocation becomes ready to claim.\n\nDashboard: ${appUrl}/dashboard`;

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0B0E14; color: #E6EDF3; padding: 32px; border: 1px solid #1E2638; border-radius: 12px;">
        <h2 style="color: #2EE6A8; margin-top: 0; font-size: 22px;">✓ Email Verified &amp; Bound</h2>
        <p>Your email address <strong>${params.email}</strong> has been cryptographically confirmed and linked to wallet:</p>
        <div style="background: #12161F; padding: 12px 16px; border-radius: 8px; font-family: monospace; color: #00E5FF; border: 1px solid #232838; margin: 16px 0; font-size: 13px;">
          ${params.walletAddress}
        </div>
        <p style="color: #8993A6; font-size: 14px; line-height: 1.6;">
          You will now receive automated, privacy-preserving alerts whenever:
        </p>
        <ul style="color: #E6EDF3; font-size: 14px; line-height: 1.6; padding-left: 20px;">
          <li>Your vault heartbeat check-in deadline is approaching.</li>
          <li>A vault designates your wallet as a verified beneficiary.</li>
          <li>An inheritance allocation challenge period has passed and funds are claimable.</li>
        </ul>
        <div style="margin: 28px 0;">
          <a href="${appUrl}/dashboard" style="background: #2EE6A8; color: #0B0E14; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-size: 14px;">Open Vault Dashboard</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #1E2638; margin: 24px 0;" />
        <p style="font-size: 12px; color: #8993A6; margin: 0;">Cadence Protocol — Non-Custodial Inheritance &amp; Proof-of-Life Consensus</p>
      </div>
    `;

    return this.dispatchNotification({
      type: "WALLET_BOUND_CONFIRMATION",
      walletAddress: params.walletAddress,
      subject,
      bodyText,
      bodyHtml,
    });
  }

  /**
   * 1. Owner check-in reminder before deadline
   */
  public async sendOwnerReminder(params: {
    ownerAddress: string;
    vaultId?: string;
    daysRemaining: number;
    deadlineTimestamp?: number;
  }): Promise<SendResult> {
    const appUrl = getClientBaseUrl();
    const subject = `[Cadence] Action Required: Check-in deadline in ${params.daysRemaining} days`;
    const bodyText = `Your Cadence inheritance vault heartbeat check-in deadline is approaching in ${params.daysRemaining} days.\n\nPlease connect your wallet at ${appUrl}/dashboard and record your heartbeat to maintain active locker status.`;
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0B0E14; color: #E6EDF3; padding: 32px; border: 1px solid #1E2638; border-radius: 12px;">
        <h2 style="color: #00E5FF; margin-top: 0;">Cadence Protocol Heartbeat Reminder</h2>
        <p>Your vault heartbeat check-in deadline is approaching in <strong>${params.daysRemaining} days</strong>.</p>
        <p>If you fail to check in before your deadline, the guardian attestation consensus countdown will commence.</p>
        <div style="margin: 28px 0;">
          <a href="${appUrl}/dashboard" style="background: #00E5FF; color: #0B0E14; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">Record Heartbeat Now</a>
        </div>
        <p style="font-size: 12px; color: #8B949E;">Vault ID: ${params.vaultId || "Default"} | Owner: ${params.ownerAddress}</p>
      </div>
    `;

    return this.dispatchNotification({
      type: "OWNER_CHECKIN_REMINDER",
      walletAddress: params.ownerAddress,
      vaultId: params.vaultId,
      subject,
      bodyText,
      bodyHtml,
    });
  }

  /**
   * 2. Beneficiary-added notice (only if already verified)
   * Displays the actual registered wallet address on file (both truncated and full to copy).
   */
  public async sendBeneficiaryAdded(params: {
    beneficiaryAddress: string;
    ownerAddress: string;
    vaultId?: string;
    shareBps?: number;
  }): Promise<SendResult> {
    const appUrl = getClientBaseUrl();
    const trunc = formatTruncatedAddress(params.beneficiaryAddress);
    const shareText = params.shareBps ? ` (${(params.shareBps / 100).toFixed(1)}% allocation)` : "";
    const subject = `[Cadence] You've been listed as a beneficiary (Wallet ${trunc})`;
    const bodyText = `You've been listed as a beneficiary on a Cadence vault, linked to wallet ${trunc} (full address: ${params.beneficiaryAddress})${shareText}.\n\nConnect that wallet at ${appUrl}/dashboard to confirm.\n\nDesignated by owner: ${params.ownerAddress}`;
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0B0E14; color: #E6EDF3; padding: 32px; border: 1px solid #1E2638; border-radius: 12px;">
        <h2 style="color: #00E5FF; margin-top: 0;">Cadence Protocol — Beneficiary Notice</h2>
        <p style="font-size: 15px; color: #E8ECF1; line-height: 1.5;">
          You've been listed as a beneficiary on a Cadence vault, linked to wallet <strong>${trunc}</strong>${shareText}.
        </p>

        <div style="background: #12161F; border: 1px solid #232838; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #8993A6; margin-bottom: 6px;">
            Registered Beneficiary Wallet (Must Connect This Wallet)
          </div>
          <div style="font-family: 'SFMono-Regular', Consolas, Menlo, monospace; color: #2EE6A8; font-size: 14px; word-break: break-all; user-select: all;">
            ${params.beneficiaryAddress}
          </div>
        </div>

        <p style="color: #8993A6; font-size: 14px; line-height: 1.5;">
          Connect that wallet at <a href="${appUrl}/dashboard" style="color: #00E5FF; text-decoration: underline;">${appUrl}/dashboard</a> to confirm your allocation.
        </p>

        <div style="margin: 24px 0;">
          <a href="${appUrl}/dashboard" style="background: #00E5FF; color: #0B0E14; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-size: 14px;">Open Cadence Dashboard</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #1E2638; margin: 24px 0;" />
        <p style="font-size: 12px; color: #8993A6; margin: 0;">Vault Owner: ${params.ownerAddress} | Vault ID: ${params.vaultId || "Default"}</p>
      </div>
    `;

    return this.dispatchNotification({
      type: "BENEFICIARY_ADDED",
      walletAddress: params.beneficiaryAddress,
      vaultId: params.vaultId,
      subject,
      bodyText,
      bodyHtml,
    });
  }

  /**
   * 3. Beneficiary claim-ready notice when vault enters ClaimPending / Finalized
   * Displays the actual registered wallet address on file (both truncated and full to copy).
   */
  public async sendClaimReady(params: {
    beneficiaryAddress: string;
    vaultId?: string;
    claimableAmount?: string;
    reason?: string;
  }): Promise<SendResult> {
    const appUrl = getClientBaseUrl();
    const trunc = formatTruncatedAddress(params.beneficiaryAddress);
    const subject = `[Cadence] Immediate Notice: Vault allocation ready to claim (Wallet ${trunc})`;
    const bodyText = `A Cadence inheritance vault has finalized. Your allocation is ready to claim, linked to wallet ${trunc} (full address: ${params.beneficiaryAddress}).\n\nConnect that wallet at ${appUrl}/claim to claim your funds.\n${params.claimableAmount ? `Claimable Allocation: ${params.claimableAmount}` : ""}`;
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0B0E14; color: #E6EDF3; padding: 32px; border: 1px solid #1E2638; border-radius: 12px;">
        <h2 style="color: #00E5FF; margin-top: 0;">Cadence Vault Claim Portal Ready</h2>
        <p style="font-size: 15px; color: #E8ECF1; line-height: 1.5;">
          A Cadence inheritance vault has finalized. Your allocation is now ready to claim, linked to wallet <strong>${trunc}</strong>.
        </p>

        <div style="background: #12161F; border: 1px solid #232838; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #8993A6; margin-bottom: 6px;">
            Registered Beneficiary Wallet (Must Connect This Wallet)
          </div>
          <div style="font-family: 'SFMono-Regular', Consolas, Menlo, monospace; color: #00E5FF; font-size: 14px; word-break: break-all; user-select: all;">
            ${params.beneficiaryAddress}
          </div>
        </div>

        ${params.claimableAmount ? `<p style="font-size: 18px; color: #2EE6A8; margin: 16px 0;"><strong>Claimable Allocation: ${params.claimableAmount}</strong></p>` : ""}

        <p style="color: #8993A6; font-size: 14px; line-height: 1.5;">
          Connect that wallet at <a href="${appUrl}/claim" style="color: #00E5FF; text-decoration: underline;">${appUrl}/claim</a> to claim your inheritance.
        </p>

        <div style="margin: 24px 0;">
          <a href="${appUrl}/claim" style="background: #00E5FF; color: #0B0E14; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-size: 14px;">Open Claim Portal</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #1E2638; margin: 24px 0;" />
        <p style="font-size: 12px; color: #8993A6; margin: 0;">Vault ID: ${params.vaultId || "Default"}</p>
      </div>
    `;

    return this.dispatchNotification({
      type: "CLAIM_READY",
      walletAddress: params.beneficiaryAddress,
      vaultId: params.vaultId,
      subject,
      bodyText,
      bodyHtml,
    });
  }

  /**
   * 4. Wrong-wallet recovery reminder: reveals registered wallet(s) only via email
   * to a recipient whose email has been verified.
   */
  public async sendWalletReminder(params: {
    email: string;
    wallets: `0x${string}`[];
  }): Promise<SendResult> {
    const appUrl = getClientBaseUrl();
    const subject = `[Cadence Protocol] Reminder: Your Registered Inheritance Wallet Address`;

    const formattedWalletsText = params.wallets
      .map((w, i) => `Wallet ${i + 1}: ${w} (${formatTruncatedAddress(w)})`)
      .join("\n");

    const bodyText = `Here is a reminder of the Ethereum wallet address(es) registered with Cadence inheritance for this email:\n\n${formattedWalletsText}\n\nPlease connect the appropriate wallet at ${appUrl}/claim to view and execute your inheritance allocations.`;

    const walletCardsHtml = params.wallets
      .map(
        (w, i) => `
        <div style="background: #12161F; border: 1px solid #232838; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #8993A6;">Registered Wallet ${params.wallets.length > 1 ? `#${i + 1}` : ""}</span>
            <span style="font-size: 11px; font-family: monospace; color: #2EE6A8;">Verified</span>
          </div>
          <div style="font-family: 'SFMono-Regular', Consolas, Menlo, monospace; color: #00E5FF; font-size: 14px; word-break: break-all; user-select: all;">
            ${w}
          </div>
        </div>`
      )
      .join("");

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0B0E14; color: #E6EDF3; padding: 32px; border: 1px solid #1E2638; border-radius: 12px;">
        <h2 style="color: #00E5FF; margin-top: 0;">Cadence Protocol — Wallet Reminder</h2>
        <p style="font-size: 15px; color: #E8ECF1;">You requested a reminder of which wallet address is registered for inheritance notifications with Cadence.</p>
        <p style="color: #8993A6; font-size: 13px;">Below is the verified wallet address linked to <strong>${params.email}</strong>:</p>
        
        <div style="margin: 20px 0;">
          ${walletCardsHtml}
        </div>

        <p style="color: #8993A6; font-size: 14px; line-height: 1.5;">
          Connect this wallet at the Claim Portal to check for and execute your designated allocations:
        </p>
        
        <div style="margin: 24px 0;">
          <a href="${appUrl}/claim" style="background: #00E5FF; color: #0B0E14; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-size: 14px;">Open Claim Portal</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #1E2638; margin: 24px 0;" />
        <p style="font-size: 12px; color: #8993A6; margin: 0;">If you did not request this reminder, no action is needed. Your vault allocations remain private and secure.</p>
      </div>
    `;

    const primaryWallet = params.wallets[0];
    const entry: OutboxEntry = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "WALLET_REMINDER",
      recipientWallet: primaryWallet,
      recipientEmail: params.email,
      subject,
      bodyText,
      bodyHtml,
      timestamp: new Date().toISOString(),
    };

    this.recordOutbox(entry);
    console.log(`[EMAIL DISPATCHED] Type: WALLET_REMINDER | To: ${params.email} | Subject: "${subject}"`);

    if (this.transporter && this.isLiveSmtpConfigured) {
      const from = process.env.SMTP_FROM || `"Cadence Protocol" <${process.env.SMTP_USER || "notifications@cadenceprotocol.io"}>`;
      try {
        const info = await this.transporter.sendMail({
          from,
          to: params.email,
          subject,
          text: bodyText,
          html: bodyHtml,
        });
        console.log(`[LIVE SMTP DELIVERED] Message ID: ${info.messageId} | Recipient: ${params.email}`);
      } catch (err: any) {
        console.error(`[LIVE SMTP ERROR] Failed to deliver wallet reminder to ${params.email}:`, err?.message || err);
      }
    }

    return {
      success: true,
      notificationId: entry.id,
      entry,
    };
  }
}

export const emailService = new EmailService();
