# Cadence Stylus Merkle Verifier (Rust / WASM)

This directory contains the Arbitrum Stylus implementation of Cadence Protocol's cryptographic Merkle verification logic.

## Overview

Cadence enforces strict Allocation Privacy (**Architecture Constraint #3**): plaintext shares, beneficiary addresses, and dollar amounts never exist onchain in storage slots or transaction parameters. Instead, the contract stores only a single 32-byte Merkle root (`allocationRoot`).

At claim time, beneficiaries submit:
1. `shareBps` (their basis point allocation, e.g. `4000` = 40%)
2. `salt` (a secret 32-byte blinding scalar known only to the vault owner and that beneficiary)
3. `proof` (an array of sibling hashes verifying the path to `allocationRoot`)

The verification involves:
- Double-keccak leaf hashing (`keccak256(keccak256(abi.encode(beneficiary, shareBps, salt)))`) to prevent second preimage attacks.
- Commutative path reduction (`hash(min(a, b), max(a, b))`).

In EVM bytecode, multi-level Merkle path verification and leaf hashing incur recurring gas costs. With **Arbitrum Stylus**, this computation is executed in native WebAssembly (WASM) at near-native CPU speeds, significantly reducing L2 gas overhead for inheritance claims.

---

## Architecture & Integration Pattern

The Stylus contract is integrated as a **composable standalone primitive**, matching the architectural pattern used for `ProofOfLifeConsensus.sol`:

1. **Standard ABI**: The Stylus contract exposes the exact standard Solidity interface defined in `IMerkleVerifier.sol`:
   - `verify(bytes32[] calldata proof, bytes32 root, bytes32 leaf) external view returns (bool)`
   - `computeAllocationLeaf(address beneficiary, uint256 shareBps, bytes32 salt) external pure returns (bytes32)`
   - `computeGuardianLeaf(address guardian) external pure returns (bytes32)`
2. **Composable Vault Delegation**:
   - `InheritanceVault.sol` maintains an `IMerkleVerifier public merkleVerifier;` reference.
   - The vault owner can set the Stylus contract address via `setMerkleVerifier(address _verifier)`.
   - On `claim()` or `claimAsBackup()`, `InheritanceVault` invokes `merkleVerifier.verify(...)` via standard ABI-level contract calls.
   - If unconfigured (`address(0)`), `InheritanceVault` defaults to the internal `MerkleProofLib.sol` library, guaranteeing complete zero-downtime backward compatibility.

---

## Stylus Deployment Instructions

### Prerequisites
- Rust (`rustup default stable`)
- WebAssembly target: `rustup target add wasm32-unknown-unknown`
- Cargo Stylus CLI: `cargo install cargo-stylus`

### Verification & Dry Run
To verify the Stylus contract against Arbitrum Nitro WASM specifications:
```bash
cargo stylus check
```

### Deployment to Arbitrum Sepolia (Chain ID `421614`)
```bash
cargo stylus deploy \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Deployment to Robinhood Chain Testnet (Chain ID `46630`)
```bash
cargo stylus deploy \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.testnet.chain.robinhood.com
```

---

## Test Verification

The Stylus contract's logic is audited and verified against the canonical OpenZeppelin / Solidity implementation in `contracts/test/StylusMerkleVerifier.t.sol`:
- **12/12 dedicated parity and vault integration tests passing**:
  - Exact leaf hash parity for guardians and beneficiaries across arbitrary inputs.
  - Commutative proof verification matching for balanced and unbalanced trees.
  - Sibling, leaf, and root tampering detection parity.
  - Full `InheritanceVault` integration across primary and backup claim lifecycles.
