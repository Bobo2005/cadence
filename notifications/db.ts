import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAddress } from "viem";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const BINDINGS_FILE = path.join(DATA_DIR, "bindings.json");

export interface WalletBinding {
  walletAddress: `0x${string}`;
  email: string;
  verified: boolean;
  signature?: `0x${string}` | null;
  suggestedBy?: `0x${string}` | null;
  createdAt: string;
  verifiedAt?: string | null;
}

class NotificationDatabase {
  private bindings: Map<string, WalletBinding> = new Map();

  constructor() {
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(BINDINGS_FILE)) {
        const raw = fs.readFileSync(BINDINGS_FILE, "utf8");
        const list: WalletBinding[] = JSON.parse(raw);
        for (const item of list) {
          const key = getAddress(item.walletAddress).toLowerCase();
          this.bindings.set(key, {
            ...item,
            walletAddress: getAddress(item.walletAddress),
          });
        }
      }
    } catch (err) {
      console.error("[DB] Failed to load bindings file:", err);
    }
  }

  private persist(): void {
    try {
      this.ensureDataDir();
      const list = Array.from(this.bindings.values());
      fs.writeFileSync(BINDINGS_FILE, JSON.stringify(list, null, 2), "utf8");
    } catch (err) {
      console.error("[DB] Failed to persist bindings file:", err);
    }
  }

  public getBinding(walletAddress: string): WalletBinding | undefined {
    try {
      const key = getAddress(walletAddress).toLowerCase();
      return this.bindings.get(key);
    } catch {
      return undefined;
    }
  }

  public isVerified(walletAddress: string): boolean {
    const binding = this.getBinding(walletAddress);
    return !!binding && binding.verified === true && !!binding.signature;
  }

  /**
   * Save or update an explicit wallet-verified binding.
   * STRICT CONSTRAINT #6: Must have a valid signature proving ownership by walletAddress.
   */
  public confirmBinding(
    walletAddress: string,
    email: string,
    signature: `0x${string}`
  ): WalletBinding {
    const normalized = getAddress(walletAddress);
    const key = normalized.toLowerCase();
    const existing = this.bindings.get(key);

    const updated: WalletBinding = {
      walletAddress: normalized,
      email: email.trim().toLowerCase(),
      verified: true,
      signature,
      suggestedBy: existing?.suggestedBy || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    this.bindings.set(key, updated);
    this.persist();
    return updated;
  }

  /**
   * Suggest an email for a beneficiary.
   * STRICT CONSTRAINT #6: Must remain PENDING (verified = false) with NO notifications
   * until the beneficiary wallet explicitly signs confirmation.
   */
  public suggestBinding(
    walletAddress: string,
    email: string,
    suggestedBy: string
  ): WalletBinding {
    const normalized = getAddress(walletAddress);
    const key = normalized.toLowerCase();
    const existing = this.bindings.get(key);

    // If already verified by the wallet itself, keep verified!
    if (existing && existing.verified && existing.signature) {
      return existing;
    }

    const pending: WalletBinding = {
      walletAddress: normalized,
      email: email.trim().toLowerCase(),
      verified: false,
      signature: null,
      suggestedBy: getAddress(suggestedBy),
      createdAt: existing?.createdAt || new Date().toISOString(),
      verifiedAt: null,
    };

    this.bindings.set(key, pending);
    this.persist();
    return pending;
  }

  public getAllBindings(): WalletBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Find verified wallet addresses associated with an email address.
   * STRICT SECURITY CONSTRAINT #6: Only returns bindings where verified === true and signature is present.
   */
  public getVerifiedWalletsByEmail(email: string): `0x${string}`[] {
    const cleanEmail = email.trim().toLowerCase();
    const matches: `0x${string}`[] = [];
    for (const binding of this.bindings.values()) {
      if (binding.verified && binding.signature && binding.email.toLowerCase() === cleanEmail) {
        matches.push(binding.walletAddress);
      }
    }
    return matches;
  }

  public clear(): void {
    this.bindings.clear();
    this.persist();
  }
}

export const db = new NotificationDatabase();
