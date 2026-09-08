/**
 * eip712.ts — cancelClaimWithSig digest builder and signer
 *
 * Implements EIP-712 typed-data hashing and signing for the cancelClaimWithSig path.
 * Enables the stealth owner to cancel a ClaimPending state without broadcasting a direct
 * transaction, keeping the owner's funding trail completely unlinkable.
 *
 * Typehash (from docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Feature Spotlight A):
 *   keccak256("CancelClaim(uint256 vaultId,uint256 nonce,uint256 deadline)")
 *
 * ⚠️ ARCHITECTURE CONSTRAINT #1 — "Gas Linkage" Trap:
 * The signature-based path is the primary cancel path. Funding a stealth address's
 * gas from a known wallet permanently de-anonymizes it. By signing this off-chain EIP-712
 * digest, any relayer, paymaster, or frontend can submit the cancel transaction on-chain.
 */

import {
  hashTypedData,
  recoverTypedDataAddress,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const CANCEL_CLAIM_TYPES = {
  CancelClaim: [
    { name: "vaultId", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export interface CancelClaimDomain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

export interface CancelClaimMessage {
  vaultId: bigint;
  nonce: bigint;
  deadline: bigint;
}

export interface CancelClaimTypedData {
  domain: CancelClaimDomain;
  types: typeof CANCEL_CLAIM_TYPES;
  primaryType: "CancelClaim";
  message: CancelClaimMessage;
}

/**
 * Constructs the standard EIP-712 domain for ProofOfLifeConsensus.
 *
 * @param chainId Network chain ID (e.g. 11155111 for Sepolia, 31337 for local anvil).
 * @param verifyingContract Address of the deployed ProofOfLifeConsensus contract.
 */
export function getCancelClaimDomain(
  chainId: number | bigint,
  verifyingContract: Address
): CancelClaimDomain {
  return {
    name: "ProofOfLifeConsensus",
    version: "1",
    chainId: typeof chainId === "bigint" ? Number(chainId) : chainId,
    verifyingContract,
  };
}

/**
 * Normalizes vault address, nonce, and deadline into a typed CancelClaim message.
 *
 * @param vault Vault contract address or numeric vaultId.
 * @param nonce Current cancellation nonce for the vault.
 * @param deadline Unix timestamp after which the signature expires.
 */
export function buildCancelClaimMessage(
  vault: Address | bigint,
  nonce: bigint | number,
  deadline: bigint | number
): CancelClaimMessage {
  const vaultId = typeof vault === "string" ? BigInt(vault) : vault;
  return {
    vaultId,
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
  };
}

/**
 * Builds the complete EIP-712 typed-data structure for cancelClaim.
 */
export function buildCancelClaimTypedData(
  chainId: number | bigint,
  verifyingContract: Address,
  vault: Address | bigint,
  nonce: bigint | number,
  deadline: bigint | number
): CancelClaimTypedData {
  return {
    domain: getCancelClaimDomain(chainId, verifyingContract),
    types: CANCEL_CLAIM_TYPES,
    primaryType: "CancelClaim",
    message: buildCancelClaimMessage(vault, nonce, deadline),
  };
}

/**
 * Computes the 32-byte EIP-712 digest hash for a CancelClaim message.
 */
export function hashCancelClaim(typedData: CancelClaimTypedData): Hex {
  return hashTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });
}

/**
 * Signs the CancelClaim typed data using an ephemeral stealth private key.
 *
 * @param stealthPrivateKey The 32-byte private key of the stealth address that owns the vault.
 * @param typedData The complete typed data object.
 * @returns The 65-byte hex-encoded ECDSA signature (r, s, v).
 */
export async function signCancelClaim(
  stealthPrivateKey: Hex,
  typedData: CancelClaimTypedData
): Promise<Hex> {
  const account = privateKeyToAccount(stealthPrivateKey);
  return account.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });
}

/**
 * Recovers the signer address from an EIP-712 CancelClaim signature.
 *
 * @param typedData The typed data that was signed.
 * @param signature The 65-byte ECDSA signature.
 * @returns The recovered Ethereum address.
 */
export async function verifyCancelClaimSignature(
  typedData: CancelClaimTypedData,
  signature: Hex
): Promise<Address> {
  return recoverTypedDataAddress({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
    signature,
  });
}
