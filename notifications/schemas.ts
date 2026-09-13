import { z } from "zod";
import { getAddress } from "viem";

/**
 * HTML entity escaping for XSS prevention.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strips raw HTML markup and control characters from text inputs.
 */
export function sanitizeString(val: string): string {
  return val
    .replace(/<[^>]*>?/gm, "") // strip any HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // strip ASCII control characters
    .trim();
}

// 1. Ethereum Address Schema (regex check + EIP-55 checksum normalization)
export const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address format" })
  .transform((val, ctx) => {
    try {
      return getAddress(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid Ethereum address checksum",
      });
      return z.NEVER;
    }
  });

// 2. Email Schema (RFC compliant, length bounds, normalized to lowercase)
export const emailSchema = z
  .string()
  .trim()
  .min(3, { message: "Email is too short" })
  .max(254, { message: "Email exceeds maximum RFC length of 254 characters" })
  .email({ message: "Invalid email format" })
  .transform((val) => val.toLowerCase());

// 3. Cryptographic Signature Schema
export const signatureSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{130,}$/, {
    message: "Invalid cryptographic signature format",
  });

// 4. Nonce / Timestamp Schema
export const nonceTimestampSchema = z
  .union([z.number().int().nonnegative(), z.string().trim()])
  .default(0);

// Route Schemas

export const SuggestSchema = z.object({
  walletAddress: addressSchema,
  email: emailSchema,
  suggestedBy: addressSchema,
});

export const BindSchema = z.object({
  walletAddress: addressSchema,
  email: emailSchema,
  signature: signatureSchema,
  nonce: nonceTimestampSchema.optional().default(0),
  timestamp: nonceTimestampSchema.optional().default(0),
});

export const RemindWalletSchema = z.object({
  email: emailSchema,
});

export const OwnerReminderSchema = z.object({
  ownerAddress: addressSchema,
  vaultId: z.string().trim().max(128).transform(sanitizeString).optional(),
  daysRemaining: z.number().int().min(0).max(3650).optional().default(7),
  deadlineTimestamp: z.union([z.number(), z.string().trim()]).optional(),
});

export const BeneficiaryAddedSchema = z.object({
  beneficiaryAddress: addressSchema,
  ownerAddress: addressSchema,
  vaultId: z.string().trim().max(128).transform(sanitizeString).optional(),
  shareBps: z.number().int().min(0).max(10000).optional(),
});

export const ClaimReadySchema = z.object({
  beneficiaryAddress: addressSchema,
  vaultId: z.string().trim().max(128).transform(sanitizeString).optional(),
  claimableAmount: z.string().trim().max(64).transform(sanitizeString).optional(),
  reason: z.string().trim().max(256).transform(sanitizeString).optional(),
});

const GuardianItemSchema = z.object({
  address: addressSchema,
  label: z.string().trim().max(64).transform(sanitizeString).optional(),
  email: emailSchema.optional(),
});

export const GuardianAttestRequestSchema = z.object({
  vaultAddress: addressSchema,
  vaultName: z.string().trim().max(128).transform(sanitizeString).optional(),
  guardians: z.array(GuardianItemSchema).max(20).optional(),
  guardianAddress: addressSchema.optional(),
  guardianLabel: z.string().trim().max(64).transform(sanitizeString).optional(),
  guardianEmail: emailSchema.optional(),
});

const RecipientItemSchema = z.object({
  address: addressSchema,
  role: z.string().trim().max(64).transform(sanitizeString).optional(),
  email: emailSchema.optional(),
});

export const ContestConcludedSchema = z.object({
  vaultAddress: addressSchema,
  vaultName: z.string().trim().max(128).transform(sanitizeString).optional(),
  recipients: z.array(RecipientItemSchema).max(20).optional(),
  recipientAddress: addressSchema.optional(),
  recipientRole: z.string().trim().max(64).transform(sanitizeString).optional(),
  recipientEmail: emailSchema.optional(),
});

export const MonitorVaultSchema = z.object({
  vaultAddress: addressSchema,
  name: z.string().trim().max(128).transform(sanitizeString).optional(),
  guardians: z.array(GuardianItemSchema).max(20).optional(),
});

export const WalletAddressParamSchema = z.object({
  walletAddress: addressSchema,
});
