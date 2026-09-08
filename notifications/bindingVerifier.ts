import { getAddress, verifyMessage } from "viem";

/**
 * Expected message format for wallet-binding verification:
 * "I confirm this email is associated with wallet 0x... for Cadence notifications"
 */
export function getBindingMessage(walletAddress: string): string {
  const normalized = getAddress(walletAddress);
  return `I confirm this email is associated with wallet ${normalized} for Cadence notifications`;
}

export interface VerificationResult {
  valid: boolean;
  normalizedAddress?: `0x${string}`;
  expectedMessage?: string;
  error?: string;
}

/**
 * Verifies that the given signature was created by walletAddress
 * for the canonical Cadence notification binding confirmation message.
 *
 * Constraint #6: An email must NEVER be stored as bound to a wallet
 * without a valid signature from that wallet confirming it.
 */
export async function verifyWalletBindingSignature(
  walletAddress: string,
  signature: `0x${string}` | string
): Promise<VerificationResult> {
  try {
    if (!walletAddress || !signature) {
      return { valid: false, error: "Missing walletAddress or signature" };
    }

    let normalized: `0x${string}`;
    try {
      normalized = getAddress(walletAddress);
    } catch {
      return { valid: false, error: "Invalid Ethereum wallet address format" };
    }

    const message = getBindingMessage(normalized);

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
        error: "Signature does not match wallet address",
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
