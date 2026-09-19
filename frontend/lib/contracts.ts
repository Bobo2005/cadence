/**
 * frontend/lib/contracts.ts
 *
 * Backwards-compatible re-export hub for all Cadence smart contract ABIs,
 * bytecodes, addresses, and Viem client factories.
 *
 * Sub-modules:
 * - ABIs & Bytecodes: @/lib/abi
 * - Addresses & Clients: @/lib/config/contracts
 */

export * from "./abi";
export * from "./config/contracts";
