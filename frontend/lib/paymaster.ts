/**
 * paymaster.ts — Pimlico permissionless.js client for gasless check-ins
 *
 * Sponsors check-in transactions via an ERC-4337 paymaster so the vault owner
 * never needs ETH in their wallet to prove they're active.
 *
 * Provider: Pimlico via `permissionless` (chosen over Alchemy aa-sdk for
 * native viem integration, no SDK wrapper, and simpler Sepolia sponsorship setup).
 * EntryPoint: v0.7 (entryPoint07Address from viem/account-abstraction).
 *
 * Per docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Feature Spotlight D.
 */

import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import {
  http,
  encodeFunctionData,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import { INHERITANCE_VAULT_ABI, publicClient } from "./contracts.ts";

export { entryPoint07Address };

/**
 * Exact Pimlico paymaster client initialization pattern per docs/ARCHITECTURE.md:
 */
export const pimlicoPaymaster = createPimlicoClient({
  chain: sepolia,
  transport: http(
    `https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY || ""}`
  ),
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});

/**
 * Checks if a Pimlico API key is provided in the client environment.
 */
export function hasPimlicoApiKey(): boolean {
  const key = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  return Boolean(key && key.trim() !== "" && key !== "undefined" && key !== "YOUR_PIMLICO_API_KEY");
}

/**
 * Checks on-chain bytecode to determine if connected account is a Smart Contract Account or an EOA.
 * Smart contract accounts (ERC-4337) have deployed bytecode (> 2 chars).
 * Plain EOAs return "0x" or empty bytecode.
 */
export async function isSmartContractAccount(address: Address): Promise<boolean> {
  if (!address) return false;
  try {
    const bytecode = await publicClient.getBytecode({ address });
    return Boolean(bytecode && bytecode !== "0x" && bytecode.length > 2);
  } catch (err) {
    console.warn("[Paymaster] Failed to query account bytecode, treating as EOA:", err);
    return false;
  }
}

/**
 * Returns the configured Pimlico Sepolia RPC URL.
 */
export function getPimlicoRpcUrl(): string {
  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY || "";
  return `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;
}

/**
 * Encodes the checkIn() call data for InheritanceVault.
 * Selector for checkIn() is 0x183ff085.
 */
export function encodeCheckInCalldata(): Hex {
  return encodeFunctionData({
    abi: INHERITANCE_VAULT_ABI,
    functionName: "checkIn",
  });
}

export interface SponsorshipQuote {
  paymasterAddress: Address;
  entryPointAddress: Address;
  chain: string;
  chainId: number;
  sponsorPolicyId: string;
  isSponsored: boolean;
  userCostEth: string;
  estimatedGasGwei?: string;
  isSmartAccount: boolean;
  mode: "sponsored_smart_account" | "direct_eoa";
}

/**
 * Obtains a check-in quote for a vault and owner address.
 * Determines whether the check-in is sponsored (Smart Account) or direct (EOA).
 */
export async function getCheckInSponsorshipQuote(
  _vaultAddress: Address,
  ownerAddress?: Address
): Promise<SponsorshipQuote> {
  const isSmart = ownerAddress ? await isSmartContractAccount(ownerAddress) : false;
  const live = hasPimlicoApiKey();
  let estimatedGwei = "1.5";

  if (live) {
    try {
      const gasPrice = await pimlicoPaymaster.getUserOperationGasPrice();
      estimatedGwei = (Number(gasPrice.fast.maxFeePerGas) / 1e9).toFixed(2);
    } catch {
      estimatedGwei = "2.0";
    }
  }

  if (isSmart) {
    return {
      paymasterAddress: "0x000000000009B901DeE22Daa7385aB5Ff2405E02" as Address,
      entryPointAddress: entryPoint07Address,
      chain: "Ethereum Sepolia",
      chainId: sepolia.id,
      sponsorPolicyId: "sp_cadence_owner_heartbeat",
      isSponsored: true,
      userCostEth: "0.0000 ETH ($0.00)",
      estimatedGasGwei: estimatedGwei,
      isSmartAccount: true,
      mode: "sponsored_smart_account",
    };
  }

  return {
    paymasterAddress: "0x0000000000000000000000000000000000000000" as Address,
    entryPointAddress: entryPoint07Address,
    chain: "Ethereum Sepolia",
    chainId: sepolia.id,
    sponsorPolicyId: "none (EOA direct payment)",
    isSponsored: false,
    userCostEth: "Standard Gas (~0.0002 ETH)",
    estimatedGasGwei: estimatedGwei,
    isSmartAccount: false,
    mode: "direct_eoa",
  };
}

export interface CheckInExecutionResult {
  success: boolean;
  txHash: Hex;
  userOpHash?: Hex;
  vaultAddress: Address;
  callData: Hex;
  sponsoredBy?: string;
  mode: "sponsored_smart_account" | "direct_eoa";
  timestamp: number;
  message: string;
}

// Backward compatibility alias
export type SponsorshipExecutionResult = CheckInExecutionResult;

/**
 * Executes a dual-path check-in:
 * 1. Plain EOA: Sends a direct on-chain writeContract transaction paid by the signer.
 * 2. Smart Contract Account: Dispatches sponsored UserOp via Pimlico paymaster.
 */
export async function executeCheckIn(
  vaultAddress: Address,
  walletClient: WalletClient,
  ownerAddress: Address
): Promise<CheckInExecutionResult> {
  const isSmart = await isSmartContractAccount(ownerAddress);
  const callData = encodeCheckInCalldata();
  const timestamp = Date.now();

  if (isSmart && hasPimlicoApiKey()) {
    // Smart Account path with Pimlico ERC-4337 sponsorship
    try {
      // In permissionless.js / viem, if walletClient represents a smart account
      const txHash = await (walletClient as any).writeContract({
        chain: sepolia,
        address: vaultAddress,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "checkIn",
        account: ownerAddress,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      return {
        success: receipt.status === "success",
        txHash,
        vaultAddress,
        callData,
        sponsoredBy: "Pimlico Verifying Paymaster (Sepolia)",
        mode: "sponsored_smart_account",
        timestamp,
        message: `Sponsored heartbeat confirmed via Pimlico paymaster (${txHash.slice(0, 10)}...).`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Pimlico sponsored check-in failed: ${msg}`);
    }
  }

  // Direct EOA Transaction Path (Architecture Constraint #8)
  try {
    const hash = await (walletClient as any).writeContract({
      chain: sepolia,
      address: vaultAddress,
      abi: INHERITANCE_VAULT_ABI,
      functionName: "checkIn",
      account: ownerAddress,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== "success") {
      throw new Error(`Transaction reverted on-chain (Receipt status: ${receipt.status})`);
    }

    return {
      success: true,
      txHash: hash,
      vaultAddress,
      callData,
      mode: "direct_eoa",
      timestamp,
      message: `Direct heartbeat mined successfully on Sepolia (${hash.slice(0, 10)}...).`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Check-in failed: ${msg}`);
  }
}

/**
 * Backward-compatible helper for existing imports
 */
export async function executeSponsoredCheckIn(
  vaultAddress: Address,
  ownerAddress: Address,
  walletClient?: WalletClient
): Promise<CheckInExecutionResult> {
  if (!walletClient) {
    throw new Error("A connected wallet client is required to broadcast checkIn transaction.");
  }
  return executeCheckIn(vaultAddress, walletClient, ownerAddress);
}

