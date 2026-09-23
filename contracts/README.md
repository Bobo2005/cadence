# Cadence Protocol — Smart Contracts

Core smart contract architecture for **Cadence Protocol**, implemented in **Solidity ^0.8.24** and tested using **Foundry**.

Cadence decouples **Proof-of-Life Consensus** into a standalone, composable on-chain primitive that powers non-custodial crypto inheritance with cryptographic privacy and a 72-hour contestable challenge window.

---

## Contract Inventory (`src/`)

| Contract | Purpose | Key Invariant |
|---|---|---|
| [`InheritanceVault.sol`](src/InheritanceVault.sol) | Primary vault holding ETH and ERC-20 assets. Executes gasless check-ins, Merkle allocation root commitment, pro-rata distributions, and the **Cadence Streams Engine** (per-second linear vesting, compounding idle yield, and anti-drainer circuit breakers). | Zero plaintext on-chain; commits only to 32-byte `allocationRoot`. Supports runtime `setCheckInInterval()` and `setStreamingConfig()`. |
| [`ProofOfLifeConsensus.sol`](src/ProofOfLifeConsensus.sol) | Standalone consensus primitive managing heartbeat tracking, timeout checks, M-of-N guardian attestations, and contest transitions. | State machine: `Active` $\rightarrow$ `ClaimPending` $\rightarrow$ `Finalized`. Holds `cancelClaimWithSig()` for EIP-712 stealth cancellations. |
| [`GuardianRegistry.sol`](src/GuardianRegistry.sol) | Verifies M-of-N cryptographic guardian attestations against committed Merkle roots. | Guardian addresses remain private until claim time via Merkle proofs. |
| [`StealthAddressRegistry.sol`](src/StealthAddressRegistry.sol) | EIP-5564 stealth key registry and announcement mechanism. | Enables non-linkable deposit addresses and zero gas-linkage stealth cancellation. |
| [`BeneficiarySmartAccount.sol`](src/BeneficiarySmartAccount.sol) | ERC-4337 v0.7 smart account with EntryPoint integration. | Mandatory social recovery to eliminate catastrophic key-loss risk. |
| [`BalanceCommitment.sol`](src/BalanceCommitment.sol) | Pedersen balance commitment primitive. | Enables shielded vault balance verification with transparent accounting fallback. |
| [`VaultFactory.sol`](src/VaultFactory.sol) | Deterministic factory deploying new `InheritanceVault` instances. | Standardizes multi-step vault provisioning. |
| [`OneClickInheritanceVault.sol`](src/OneClickInheritanceVault.sol) | Atomic 1-Click vault deployment contract. | Bundles contract deployment, ETH funding (`msg.value`), Merkle allocation commitment, guardian quorum registration, and custom contest window into a single atomic transaction (1 wallet signature). |

---

## Verified Deployed Addresses

All core contracts are deployed at identical deterministic addresses across all three supported networks:

| Contract | Ethereum Sepolia (`11155111`) | Arbitrum Sepolia (`421614`) | Robinhood Testnet (`46630`) |
|---|---|---|---|
| **InheritanceVault (Primary 90d)** | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` |
| **ProofOfLifeConsensus** | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` |
| **GuardianRegistry** | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` |
| **StealthAddressRegistry** | `0x583eC2de840034478a61EF572cea2904bFD8671E` | `0x583eC2de840034478a61EF572cea2904bFD8671E` | `0x583eC2de840034478a61EF572cea2904bFD8671E` |
| **BalanceCommitment** | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` |
| **VaultFactory** | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | `0xac0f91C7d7c3537896248C42fc880F6DFF838622` | `0xac0f91C7d7c3537896248C42fc880F6DFF838622` |
| **BeneficiaryAccountFactory** | `0x30489c0f3566AF47b71867bc992408B91E500823` | `0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf` | `0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf` |
| **Demo Streams Vault (180s)** | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` |

---

## Deployment Scripts (`script/`)

### 1. Production Deployment (`Deploy.s.sol`)
Deploys all core protocol contracts in dependency order with standard 90-day intervals:

```bash
# Ethereum Sepolia
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Arbitrum Sepolia
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --broadcast

# Robinhood Chain Testnet
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.testnet.chain.robinhood.com \
  --broadcast
```

### 2. Live Demo Deployment (`DeployDemoVault.s.sol`)
Deploys an accelerated vault instance (exact same bytecode, initialized with short intervals & Cadence Streams):

```bash
# Ethereum Sepolia
DEMO_CHECK_IN_INTERVAL=180 DEMO_CONTEST_DURATION=900 forge script script/DeployDemoVault.s.sol:DeployDemoVault \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast

# Arbitrum Sepolia
DEMO_CHECK_IN_INTERVAL=120 DEMO_CONTEST_DURATION=60 DEMO_STREAM_DURATION=180 forge script script/DeployDemoVault.s.sol:DeployDemoVault \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --broadcast

# Robinhood Chain Testnet
DEMO_CHECK_IN_INTERVAL=120 DEMO_CONTEST_DURATION=60 DEMO_STREAM_DURATION=180 forge script script/DeployDemoVault.s.sol:DeployDemoVault \
  --rpc-url https://rpc.testnet.chain.robinhood.com \
  --broadcast
```

---

## Testing & Verification

Run the comprehensive Foundry test suite (18 suites, 252 tests):
```bash
forge build
forge test -vvv
```

All 252 tests pass with 0 failures across 18 suites, covering:
- **`USDGIntegration.t.sol` (Paxos Global Dollar Integration)**:
  - Validates USDG whitelisting, deposits, Merkle allocation commitments, single/multi-token claims, caller binding, double-claim rejection, and 7.00% Robinhood Earn APY modeled yield.
- **`AaveYieldIntegration.t.sol` (Aave v3 Streaming & Dual-Yield Mechanics)**:
  - Validates all 3 Day 11 integration criteria: live on-claim supply/withdraw interface compatibility, 0.00% accounting drift across vesting lifecycles, gas cost within ~300k budget, USDG modeled rate isolation, and circuit breaker independence.
- **`StylusMerkleVerifier.t.sol` (Arbitrum Stylus WASM Parity & Integration)**:
  - Validates 100% exact leaf and proof verification parity between Rust/WASM Stylus verifier and Solidity `MerkleProofLib` across balanced/unbalanced trees, tampered proofs, primary beneficiary claims, and backup beneficiary claims.
- **`CadenceStreams.t.sol` (Autonomous Streaming Trust & Circuit Breakers)**:
  - Validates configuration limits, initial emergency buffer release, per-second linear vesting calculation across `vm.warp` time jumps, compounding idle yield generation, beneficiary pause/resume, guardian Merkle proof circuit breaks, and safe cold wallet redirection.
- **`OneClickVault.t.sol` (Atomic 1-Click Vault Setup)**:
  - Validates atomic deployment, `msg.value` ETH deposit credit, custom contest window duration, beneficiary allocation Merkle root commitment, and guardian registry consensus pairing all in a single transaction.
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

### Static Analysis (Current Run)
Slither static analysis (v0.11.6) was executed across all smart contracts in `contracts/src/` including new and modified contracts:
- **`GuardianRegistry.sol`** (Guardian Resilience, backup guardian registration, accelerated backup waiting period): **0 Critical, 0 High, 0 Medium**.
- **`InheritanceVault.sol`** (USDG whitelist, Cadence Streams Aave v3 supply/withdraw, CEI pattern hardening): **0 Critical, 0 High, 0 Medium**.
- **`StylusMerkleVerifier.sol`** (Stylus WASM interface & Solidity reference verifier): **0 Critical, 0 High, 0 Medium, 0 Low**.
- **Overall Codebase**: **0 Critical, 0 High, 0 Medium** vulnerabilities across all 55 analyzed contracts.
- **Tooling Status**: Slither 0.11.6 executed natively; Mythril is not supported on Python 3.14 (Windows) due to upstream C-extension compilation constraints in `coincurve`/`cffi`.

