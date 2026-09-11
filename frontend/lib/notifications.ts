/**
 * Cadence Notification Service Client
 * Implements wallet-signature verified email notifications per Constraint #6.
 */

import { getAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const NOTIFICATION_SERVICE_URL =
  process.env.NEXT_PUBLIC_NOTIFICATION_URL || "http://localhost:3001";

export interface WalletBindingStatus {
  walletAddress: string;
  bound: boolean;
  verified: boolean;
  email: string | null;
  maskedEmail?: string;
  pendingSuggestion?: boolean;
  suggestedBy?: string | null;
  createdAt?: string;
  verifiedAt?: string | null;
}

export interface BindEmailResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
  detail?: string;
  binding?: {
    walletAddress: string;
    email: string;
    verified: boolean;
    verifiedAt?: string;
  };
}

export interface SuggestEmailResponse {
  success: boolean;
  status: "PENDING";
  message: string;
  binding?: {
    walletAddress: string;
    email: string;
    verified: boolean;
    suggestedBy: string;
  };
  error?: string;
}

// Known deterministic keys for testing and development when window.ethereum is not present
const KNOWN_DEMO_KEYS: Record<string, Hex> = {
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8":
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc":
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
};

/**
 * Returns the canonical binding confirmation message for a wallet address and email.
 */
export function getCanonicalBindingMessage(
  walletAddress: string,
  email: string = "",
  nonce: string | number = 0,
  timestamp: string | number = 0
): string {
  const cleanEmail = (email || "").trim().toLowerCase();
  try {
    const normalized = getAddress(walletAddress);
    return `Cadence Notification Verification\nWallet: ${normalized}\nEmail: ${cleanEmail}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  } catch {
    return `Cadence Notification Verification\nWallet: ${walletAddress}\nEmail: ${cleanEmail}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  }
}

/**
 * Check if a wallet address has a bound & verified email in the notification service.
 */
export async function getWalletNotificationStatus(
  walletAddress: string
): Promise<WalletBindingStatus | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const normalized = getAddress(walletAddress);
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), 4000);
    }

    const res = await fetch(
      `${NOTIFICATION_SERVICE_URL}/api/status/${normalized}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        ...(controller ? { signal: controller.signal } : {}),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err: unknown) {
    // If service is offline or waking up, return null gracefully without noisy console traces
    const isNetworkError =
      (err instanceof TypeError && err.message === "Failed to fetch") ||
      (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError");

    if (!isNetworkError) {
      console.warn("[Notifications] Status check error:", err);
    }
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Bind an email to a wallet address using a wallet signature.
 * Strictly enforces Constraint #6: backend will reject without valid signature.
 */
export async function bindWalletEmail(
  walletAddress: string,
  email: string,
  signature: string,
  nonce: string | number = 0,
  timestamp: string | number = 0
): Promise<BindEmailResponse> {
  try {
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/api/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        email,
        signature,
        nonce,
        timestamp,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: msg || "Failed to reach notification service",
    };
  }
}

/**
 * Prompts user's wallet to sign the confirmation message, then calls the backend to bind.
 * If running in a test or local development environment without window.ethereum, falls back
 * to deterministic demo keys to generate genuine cryptographic signatures.
 */
export async function requestSignatureAndBind(
  walletAddress: string,
  email: string,
  nonce: string | number = 0,
  timestamp: string | number = 0
): Promise<BindEmailResponse> {
  const normalized = getAddress(walletAddress);
  const message = getCanonicalBindingMessage(normalized, email, nonce, timestamp);
  let signature: Hex | null = null;

  // 1. Try injected Web3 wallet (MetaMask, Rabby, Coinbase, etc.)
  if (typeof window !== "undefined" && "ethereum" in window && (window as { ethereum?: unknown }).ethereum) {
    try {
      const { createWalletClient, custom } = await import("viem");
      const { sepolia } = await import("viem/chains");
      const injectedProvider = (window as unknown as { ethereum: Parameters<typeof custom>[0] }).ethereum;
      const client = createWalletClient({
        chain: sepolia,
        transport: custom(injectedProvider),
      });
      const [account] = await client.requestAddresses();
      const targetAccount = account || normalized;
      signature = await client.signMessage({
        account: targetAccount,
        message: getCanonicalBindingMessage(targetAccount, email, nonce, timestamp),
      });
      return await bindWalletEmail(targetAccount, email, signature, nonce, timestamp);
    } catch (walletErr: unknown) {
      console.warn("[Notifications] Injected wallet signing failed/declined:", walletErr);
      const msg = walletErr instanceof Error ? walletErr.message : String(walletErr);
      if (msg.includes("rejected") || msg.includes("denied")) {
        throw walletErr;
      }
    }
  }

  // 2. Demo fallback: Use genuine signature generated from demo private key
  const demoKey = KNOWN_DEMO_KEYS[normalized.toLowerCase()];
  if (demoKey) {
    const account = privateKeyToAccount(demoKey);
    signature = await account.signMessage({ message });
    return await bindWalletEmail(normalized, email, signature, nonce, timestamp);
  }

  // 3. Fallback: require explicit signature
  throw new Error("Wallet signature required to verify and bind notification email.");
}

/**
 * Suggest an email for a beneficiary during vault creation.
 * Constraint #6: Stored as PENDING and unverified (receives ZERO notifications
 * until the beneficiary wallet explicitly signs).
 */
export async function suggestBeneficiaryEmail(
  beneficiaryAddress: string,
  email: string,
  suggestedByOwner: string
): Promise<SuggestEmailResponse> {
  try {
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/api/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: beneficiaryAddress,
        email,
        suggestedBy: suggestedByOwner,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: "PENDING",
      message: "",
      error: msg || "Failed to suggest beneficiary email",
    };
  }
}

/**
 * Trigger an owner check-in reminder (only sent if verified).
 */
export async function triggerOwnerReminder(params: {
  ownerAddress: string;
  vaultId?: string;
  daysRemaining?: number;
}) {
  try {
    const res = await fetch(
      `${NOTIFICATION_SERVICE_URL}/api/notify/owner-reminder`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cadence-internal-key":
            process.env.CADENCE_INTERNAL_API_KEY || "cadence-internal-secret",
        },
        body: JSON.stringify(params),
      }
    );
    return await res.json();
  } catch (err) {
    console.error("[Notifications] Trigger reminder failed:", err);
    return { success: false };
  }
}

/**
 * Trigger beneficiary claim ready notice (only sent if verified).
 */
export async function triggerClaimReadyNotice(params: {
  beneficiaryAddress: string;
  vaultId?: string;
  claimableAmount?: string;
}) {
  try {
    const res = await fetch(
      `${NOTIFICATION_SERVICE_URL}/api/notify/claim-ready`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cadence-internal-key":
            process.env.CADENCE_INTERNAL_API_KEY || "cadence-internal-secret",
        },
        body: JSON.stringify(params),
      }
    );
    return await res.json();
  } catch (err) {
    console.error("[Notifications] Trigger claim notice failed:", err);
    return { success: false };
  }
}

/**
 * Request a reminder email for registered wallet addresses matching an email.
 *
 * ⚠️ ANTI-FISHING CONSTRAINT:
 * The response does NOT reveal the wallet address to the caller.
 * The address is sent strictly to the verified inbox.
 */
export async function requestWalletReminder(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/api/remind-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: msg || "Failed to submit wallet reminder request",
    };
  }
}

export interface BackendHealthStatus {
  status: "ok" | "cold_start" | "unreachable";
  uptime?: number;
  message?: string;
}

/**
 * Checks the operational health of the notification backend service.
 * Detects Render free-tier cold starts (~30-50s wake-up delay) and provides
 * non-disruptive status messaging instead of raw fetch exceptions.
 */
export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { status: "ok", uptime: data.uptime };
    }
    return {
      status: "cold_start",
      message: "Notification engine is waking up on Render...",
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      status: "cold_start",
      message: "Notification engine is warming up (~30s)...",
    };
  }
}

export interface GuardianAlertTarget {
  address: string;
  label: string; // e.g. "Guardian Node 1" or "Guardian Node 2"
  email?: string;
}

/**
 * Trigger email alerts to Guardian Node 1 and Guardian Node 2 when heartbeat lapses.
 */
export async function triggerGuardianAttestationAlerts(params: {
  vaultAddress: string;
  vaultName?: string;
  guardians: GuardianAlertTarget[];
}): Promise<{ success: boolean; count?: number; results?: any[]; error?: string }> {
  try {
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notify/guardian-attest-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cadence-internal-key":
          process.env.NEXT_PUBLIC_INTERNAL_KEY || "cadence-internal-secret",
      },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Notifications] Failed to trigger guardian attestation alerts:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Trigger alert to guardians / beneficiaries when the contest grace period concludes.
 */
export async function triggerContestConcludedAlerts(params: {
  vaultAddress: string;
  vaultName?: string;
  recipients: Array<{ address: string; role: string; email?: string }>;
}): Promise<{ success: boolean; count?: number; results?: any[]; error?: string }> {
  try {
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notify/contest-concluded`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cadence-internal-key":
          process.env.NEXT_PUBLIC_INTERNAL_KEY || "cadence-internal-secret",
      },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Notifications] Failed to trigger contest concluded alerts:", msg);
    return { success: false, error: msg };
  }
}


