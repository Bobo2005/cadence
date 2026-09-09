import { getAddress, verifyMessage } from "viem";

/**
 * Expected message format for wallet-binding verification:
 * Cadence Notification Verification
 * Wallet: ${walletAddress}
 * Email: ${email.toLowerCase()}
 * Nonce: ${nonce}
 * Timestamp: ${timestamp}
 */
export function getBindingMessage(
  walletAddress: string,
  email: string,
  nonce: string | number = 0,
  timestamp: string | number = 0
): string {
  const normalized = getAddress(walletAddress);
  const cleanEmail = (email || "").trim().toLowerCase();
  return `Cadence Notification Verification\nWallet: ${normalized}\nEmail: ${cleanEmail}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

export interface VerificationResult {
  valid: boolean;
  normalizedAddress?: `0x${string}`;
  expectedMessage?: string;
  error?: string;
}

/**
 * Verifies that the given signature was created by walletAddress
 * for the canonical Cadence notification binding confirmation message
 * binding the specific email address.
 *
 * Constraint #6: An email must NEVER be stored as bound to a wallet
 * without a valid signature from that wallet strictly binding that email.
 */
export async function verifyWalletBindingSignature(
  walletAddress: string,
  email: string,
  signature: `0x${string}` | string,
  nonce: string | number = 0,
  timestamp: string | number = 0
): Promise<VerificationResult> {
  try {
    if (!walletAddress || !email || !signature) {
      return { valid: false, error: "Missing walletAddress, email, or signature" };
    }

    let normalized: `0x${string}`;
    try {
      normalized = getAddress(walletAddress);
    } catch {
      return { valid: false, error: "Invalid Ethereum wallet address format" };
    }

    const cleanEmail = email.trim().toLowerCase();
    const message = getBindingMessage(normalized, cleanEmail, nonce, timestamp);

    const isValid = await verifyMessage({
      address: normalized,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return {
        valid: false,
        normalizedAddress: normalized,
        expectedMessage: message,
        error: "Signature does not match wallet address and email binding",
      };
    }

    return {
      valid: true,
      normalizedAddress: normalized,
      expectedMessage: message,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || "Signature verification exception",
    };
  }
}

