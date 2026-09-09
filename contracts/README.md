# Cadence Protocol — Smart Contracts

Core smart contract architecture for **Cadence Protocol**, implemented in **Solidity ^0.8.24** and tested using **Foundry**.

Cadence decouples **Proof-of-Life Consensus** into a standalone, composable on-chain primitive that powers non-custodial crypto inheritance with cryptographic privacy and a 72-hour contestable challenge window.

---

## Contract Inventory (`src/`)

| Contract | Purpose | Key Invariant |
|---|---|---|
| [`InheritanceVault.sol`](src/InheritanceVault.sol) | Primary vault holding ETH and ERC-20 assets. Executes gasless check-ins, Merkle allocation root commitment, and pro-rata distributions. | Zero plaintext on-chain; commits only to 32-byte `allocationRoot`. Supports runtime `setCheckInInterval()`. |
| [`ProofOfLifeConsensus.sol`](src/ProofOfLifeConsensus.sol) | Standalone consensus primitive managing heartbeat tracking, timeout checks, M-of-N guardian attestations, and contest transitions. | State machine: `Active` $\rightarrow$ `ClaimPending` $\rightarrow$ `Finalized`. Holds `cancelClaimWithSig()` for EIP-712 stealth cancellations. |
| [`GuardianRegistry.sol`](src/GuardianRegistry.sol) | Verifies M-of-N cryptographic guardian attestations against committed Merkle roots. | Guardian addresses remain private until claim time via Merkle proofs. |
| [`StealthAddressRegistry.sol`](src/StealthAddressRegistry.sol) | EIP-5564 stealth key registry and announcement mechanism. | Enables non-linkable deposit addresses and zero gas-linkage stealth cancellation. |
| [`BeneficiarySmartAccount.sol`](src/BeneficiarySmartAccount.sol) | ERC-4337 v0.7 smart account with EntryPoint integration. | Mandatory social recovery to eliminate catastrophic key-loss risk. |
| [`BalanceCommitment.sol`](src/BalanceCommitment.sol) | Pedersen balance commitment primitive. | Enables shielded vault balance verification with transparent accounting fallback. |
| [`VaultFactory.sol`](src/VaultFactory.sol) | Deterministic factory deploying new `InheritanceVault` instances. | Standardizes multi-step vault provisioning. |

---

## Verified Sepolia Testnet Addresses

| Contract | Address |
|---|---|
| **InheritanceVault (Primary 90d)** | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` |
| **ProofOfLifeConsensus** | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` |
| **GuardianRegistry** | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` |
| **StealthAddressRegistry** | `0x583eC2de840034478a61EF572cea2904bFD8671E` |
| **BalanceCommitment** | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` |
| **BeneficiaryAccountFactory** | `0x30489c0f3566AF47b71867bc992408B91E500823` |
| **VaultFactory** | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| **Demo Accelerated Vault** | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` |

---

## Deployment Scripts (`script/`)

### 1. Production Deployment (`Deploy.s.sol`)
Deploys all core protocol contracts in dependency order with standard 90-day intervals:
```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### 2. Live Demo Deployment (`DeployDemoVault.s.sol`)
Deploys an accelerated vault instance (exact same bytecode, initialized with shorter intervals):
```bash
DEMO_CHECK_IN_INTERVAL=180 DEMO_CONTEST_DURATION=900 forge script script/DeployDemoVault.s.sol:DeployDemoVault \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

---

## Testing & Verification

Run the comprehensive Foundry test suite (13 suites, 197 tests):
```bash
forge build
forge test -vvv
```

All 197 tests pass with 0 failures, covering:
- **`SecurityAudit.t.sol` (Phase 1 Security Hardening)**:
  - `test_RevertIf_UnauthorizedConsensusRegistration`: Prevents front-running of consensus registry configuration (`GuardianRegistry.setConsensusForVault`).
  - `test_RevertIf_CrossChainAttestationReplay`: Validates EIP-712 domain separation (`verifyingContract`, `block.chainid`, `deadline`), strictly reverting cross-chain and cross-contract signature replays.
  - `test_Claim_Succeeds_EvenIfOneTokenReverts`: Validates token claim isolation in `InheritanceVault._safeTransferCatching` (a reverting or paused ERC-20 token emits `TokenTransferFailed` without blocking ETH or healthy token payouts).
  - `test_RevertIf_UnauthorizedBalanceCommitment`: Enforces `onlyAuthorized(vault)` access control and OpenZeppelin `Ownable` on `BalanceCommitment.sol`.
- **Core Security Invariants**:
  - EIP-712 typed-data digests and zero-gas-linkage stealth cancellation (`ContestableClaim.t.sol`).
  - Merkle allocation proofs and tampered share rejection (`AllocationPrivacy.t.sol`).
  - Inactivity timeouts, state transitions, and M-of-N guardian thresholds (`ProofOfLifeConsensus.t.sol`, `GuardianAttestation.t.sol`).
  - Dual-path paymaster check-in handling and ERC-4337 social recovery (`BeneficiarySmartAccount.t.sol`).
  - Strict beneficiary backup claim delegation (`BeneficiaryBackupClaim.t.sol`).
  - Slither static analysis: **0 High, 0 Medium vulnerabilities**.
