/**
 * frontend/types/secretBox.ts
 *
 * Core data models and schema definitions for the "Encrypted Vault Box" (Off-Chain Secrets).
 * Enables benefactors to securely attach exchange accounts, password managers,
 * hardware seed shards, and personal wills that unlock alongside Cadence Streams.
 */

export type CredentialType =
  | "centralized_exchange"
  | "password_manager"
  | "hardware_wallet_seed"
  | "email_recovery"
  | "personal_note";

export interface SecretBoxItem {
  id: string;
  type: CredentialType;
  title: string;
  identifier?: string;
  secret: string;
  totpSecret?: string; // Optional Base32 encoded 2FA secret key for live TOTP generation
  instructions?: string;
}

export interface SecretBoxPayload {
  version: "1.0";
  vaultAddress: string;
  beneficiaryAddress: string;
  items: SecretBoxItem[];
  personalMessage?: string;
  createdAt: number;
}
