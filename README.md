# Cadence Protocol

**Privacy-Preserving Multi-Signal Crypto Inheritance & Proof-of-Life Consensus Primitive**

Built for the **3rd-Web-Hack** hackathon on Ethereum Sepolia.

> *"We didn't just build an inheritance app. We built a reusable on-chain primitive — Proof-of-Life Consensus — that any protocol can plug into."*

---

## 1. Executive Summary

Cadence is a non-custodial, privacy-preserving inheritance protocol on Ethereum Sepolia. It replaces vulnerable single-point "dead man's switches" with **Proof-of-Life Consensus** — requiring both inactivity timeouts and cryptographic M-of-N guardian confirmations — backed by a **72-hour contestable challenge window** that guarantees a living owner can always cancel false or premature claims with zero identity exposure.

### Key Architectural Invariants
1. **Zero Gas-Linkage Cancellation (Constraint #1)**: Vault owners cancel contested claims via `cancelClaimWithSig` using an off-chain EIP-712 stealth signature. The transaction can be submitted by any third-party relayer without linking the owner's primary wallet or identity on-chain.
2. **Multi-Signal Consensus Primitive (Constraint #2)**: Proof-of-Life consensus is decoupled into a standalone primitive (`ProofOfLifeConsensus.sol`). Heartbeat tracking, guardian attestations, and state transitions are independent of vault fund storage.
3. **Allocation Privacy via ECIES & Merkle Commitments (Constraint #3)**: Beneficiary shares and identities are strictly private. The smart contract commits *only* to a 32-byte `allocationRoot`. Allocations are encrypted client-side using ECIES (secp256k1) and decrypted exclusively in the inheritor's browser.
4. **Client-Side Off-Chain Sum Invariant (Constraint #4)**: Allocation trees strictly validate that all percentage shares sum to exactly 10,000 basis points (100.00%) before generating the Merkle root. Over-allocation or under-allocation is blocked at the interface level.
5. **Beneficiary Smart Accounts with Mandatory Social Recovery (Constraint #5)**: Inherited assets can be routed into ERC-4337 smart accounts (`BeneficiarySmartAccount.sol`) featuring nominated recovery guardians to eliminate catastrophic key-loss risk.
6. **EIP-712 Email Notification Binding (Constraint #6)**: Off-chain alerts require cryptographic proof of wallet ownership via signed typed data (`BindEmail`) before binding contact channels.
7. **Strict Beneficiary Control & Zero Custodial Trust (Constraint #7)**: Beneficiary backup claim addresses (`registerBackupClaimAddress`) resolve strictly to `msg.sender`. Neither the vault owner nor consensus guardians possess any method to redirect or override an inheritor's claim.
8. **Dual-Path Paymaster Architecture (Constraint #8)**: Smart accounts route through ERC-4337 verifying paymasters for 0-ETH user operations; plain EOAs execute direct on-chain check-ins without simulation.
9. **Zero-Simulation Production Integrity (Constraint #9)**: Zero mock fallbacks or fake hashes. All provisioning and check-ins execute real Sepolia transactions.

---

## 2. Live Deployments & Deployed Contracts (Ethereum Sepolia)

### Live Production Deployments
- 🚀 **Live Web App (Vercel)**: [`https://cadence-protocol.vercel.app`](https://cadence-protocol.vercel.app)
- ⚡ **Live API Service (Render)**: [`https://cadence-notifications.onrender.com`](https://cadence-notifications.onrender.com)
  - Microservice Health Check: [`https://cadence-notifications.onrender.com/health`](https://cadence-notifications.onrender.com/health)
- 🏆 **Hackathon Pitch Kit & 3-Min Video Script**: [`docs/HACKATHON-PITCH.md`](docs/HACKATHON-PITCH.md)

### Verified Smart Contracts (Ethereum Sepolia)

All contracts are compiled with Solidity 0.8.28 (Via-IR enabled) and verified with full source code on Sepolia Etherscan:

| Smart Contract | Network | Contract Address | Explorer Link | Source Status |
| :--- | :--- | :--- | :--- | :--- |
| **`InheritanceVault.sol`** (Primary 90d) | Ethereum Sepolia | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74#code) | ✅ Verified (`0x043d...9e74`) |
| **`ProofOfLifeConsensus.sol`** | Ethereum Sepolia | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1#code) | ✅ Verified (`0x7819...6Bc1`) |
| **`GuardianRegistry.sol`** | Ethereum Sepolia | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863#code) | ✅ Verified (`0xcFD0...4863`) |
| **`StealthAddressRegistry.sol`** (EIP-5564) | Ethereum Sepolia | `0x583eC2de840034478a61EF572cea2904bFD8671E` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x583eC2de840034478a61EF572cea2904bFD8671E#code) | ✅ Verified (`0x583e...671E`) |
| **`BalanceCommitment.sol`** | Ethereum Sepolia | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC#code) | ✅ Verified (`0x1AeA...A1BC`) |
| **`BeneficiarySmartAccount.sol`** (Factory) | Ethereum Sepolia | `0x30489c0f3566AF47b71867bc992408B91E500823` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x30489c0f3566AF47b71867bc992408B91E500823#code) | ✅ Verified (`0x3048...0823`) |
| **`InheritanceVault.sol`** (Fast Demo 5m) | Ethereum Sepolia | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1#code) | ✅ Verified (`0x6a55...97b1`) |
| **`VaultFactory.sol`** | Ethereum Sepolia | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0#code) | ✅ Verified (`0x9fE4...a6e0`) |

---

## 3. 3-Minute Walkthrough Guide

The Cadence interface supports standard Web3 wallet connections (MetaMask, Rabby, Coinbase Wallet, etc.) and pre-deployed Sepolia test lockers for rapid evaluation. Follow this sequential guide:

```
[ Step 1: Owner Pulse ]  ──>  [ Step 2: Guardian Quorum ]  ──>  [ Step 3: Beneficiary Claim ]  ──>  [ Step 4: Stealth Cancel ]
   Heartbeat & Interval          Attest Inactivity Lapses          In-Memory ECIES Decrypt & Payout     EIP-712 Zero-Gas Recovery
```

### Step 1: Connect as Owner $\rightarrow$ View Heartbeat $\rightarrow$ Test Interval Adjustment (5m)
1. Connect as **Owner** (`0xC09C...77e4` or your own testnet wallet) using your Web3 wallet.
2. Open [`/dashboard`](https://cadence-protocol.vercel.app/dashboard) to inspect the **Locker Heartbeat Rhythm**:
   - The live oscilloscope ECG line visualizes heartbeat status (`62 BPM Steady`).
   - Click **`[⚡ Adjust Interval]`** on the hero rhythm card. Select the **`5 Min (Test)`** preset (300s) and confirm the on-chain update on Sepolia.
   - Click **`[Send Heartbeat Check-In]`**: Confirms on-chain timestamp renewal with Etherscan receipt link.

### Step 2: Switch to Guardian $\rightarrow$ Attest Inactivity Lapse
1. Switch to **Guardian 1** or **Guardian 2** (`0x81C3...91a2` or `0x34d7...A1F0`) in your wallet.
2. Navigate to [`/contest`](https://cadence-protocol.vercel.app/contest):
   - Review guardian attestation records queried directly from `GuardianRegistry.sol`.
   - If the 5-minute interval lapses without a check-in, guardians affirm inactivity. Once the M-of-N threshold is reached, the locker transitions to `ClaimPending` and starts the 72-hour Contest Window.
   - The ECG line transitions to an amber erratic arrhythmia (`92 BPM Erratic`).

### Step 3: Switch to Beneficiary $\rightarrow$ Decrypt Allocation via In-Memory ECIES $\rightarrow$ Execute Claim
1. Connect as **Alice** (`0x7099...79C8` or your beneficiary wallet).
2. Open [`/claim`](https://cadence-protocol.vercel.app/claim):
   - Notice that Alice's 40% share is **not public on Etherscan**.
   - **Safe In-Memory Key Derivation**: Alice signs a cryptographic authorization message (`personal_sign` over deterministic salt `keccak256(sig)`). The 32-byte ECIES decryption key is derived strictly in memory—**zero raw private keys are ever pasted or exposed in UI text fields**.
   - The browser decrypts her allocation off-chain and generates her cryptographic Merkle proof against `allocationRoot`.
   - Once the locker enters finalized status, click **`[Claim Share]`**.
   - Alice receives her exact pro-rata ETH payout atomically on Sepolia.

### Step 4: Stealth Cancel Demo $\rightarrow$ Demonstrate EIP-712 Zero-Gas Cancellation
1. If testing false-positive or key-compromise defense, open [`/contest`](https://cadence-protocol.vercel.app/contest) while in `ClaimPending` state.
2. Click **`[RESET PROTOCOL: I'M ALIVE]`**:
   - The owner signs an off-chain **EIP-712 typed digest** (`cancelClaimWithSig`).
   - The cancellation is relayed by any third party with **zero gas linkage** to the owner's primary account, protecting compromised wallets from frontrunning.
   - The contest window halts immediately, guardian attestations reset, and the vault returns to `Active` status (`62 BPM Steady`).

---

## 4. Architecture & Security Invariant Matrix

Cadence enforces 9 strict cryptographic and architectural invariants across all layers of the stack:

| Invariant | Protocol Specification | Cryptographic Primitive | Failure Mode Prevented |
| :--- | :--- | :--- | :--- |
| **Constraint #1**<br>Zero Gas-Linkage Cancellation | Owners cancel contested claims via relayed EIP-712 typed signatures (`cancelClaimWithSig`). | `EIP-712` + `ECDSA.recover` + Domain Separator | **Surveillance & Frontrunning Trap**: Attacker cannot monitor owner's wallet for ETH top-ups or front-run on-chain cancellations. |
| **Constraint #2**<br>Decoupled Consensus Primitive | Proof-of-life consensus logic is decoupled into a standalone contract (`ProofOfLifeConsensus.sol`). | Modular Smart Contract Architecture | **Single-Point Failure**: Eliminates single-trigger dead man switches; enables third-party protocols to reuse consensus. |
| **Constraint #3**<br>Allocation Privacy via ECIES | Smart contracts store only a 32-byte `allocationRoot`. Shares are encrypted client-side per beneficiary. | `ECIES-secp256k1` + `MerkleProof.verify` | **Ledger Leakage**: Public explorers reveal zero beneficiary addresses, token counts, or inheritance percentages. |
| **Constraint #4**<br>Off-Chain 100% Sum Enforcement | Beneficiary shares must strictly sum to 10,000 basis points (100.00%) before Merkle root computation. | Client-side basis-point mathematical verification | **Estate Insolvency**: Prevents fractional under-allocation or impossible over-allocation (>100%) before funds lock. |
| **Constraint #5**<br>Smart Account Social Recovery | Inherited funds can route directly into ERC-4337 smart accounts with nominated recovery guardians. | `ERC-4337 v0.7` EntryPoint + Guardian Signatures | **Heir Key-Loss**: Inheritors who lose private keys after inheriting assets can socially recover their smart account. |
| **Constraint #6**<br>EIP-712 Notification Binding | Email notification addresses require cryptographic proof of wallet ownership via signed typed messages. | `EIP-712` `BindEmail` signature verification | **Phishing & Interception**: Attackers cannot bind unauthorized emails to victim wallets to intercept alerts. |
| **Constraint #7**<br>Strict Beneficiary Autonomy | Backup claim addresses resolve strictly to `msg.sender`. Vault owners and guardians have zero override power. | Strict `msg.sender` caller enforcement | **Custodial Griefing**: Vault creators or malicious guardians cannot redirect or confiscate an heir's payout. |
| **Constraint #8**<br>Dual-Path Paymaster Architecture | Paymaster sponsorship routes strictly to ERC-4337 smart accounts; EOAs execute honest direct transactions. | Bytecode check (`code.length > 0`) + Pimlico Paymaster | **Simulated Sponsoring Fallacy**: Plain EOAs cannot be falsely claimed as gasless; surfaces honest gas states. |
| **Constraint #9**<br>Zero Simulation Integrity | Zero fake transaction hashes, zero random hex generators. All provisioning and actions hit real Sepolia contracts. | Real on-chain contract execution & Etherscan receipts | **Demo Fragility**: Every button click produces verifiable, broadcasted Ethereum Sepolia transactions. |

---

## 5. Smart Contract Architecture

The core protocol contracts reside in `/contracts/src`:

| Contract | Description |
|---|---|
| [`InheritanceVault.sol`](contracts/src/InheritanceVault.sol) | Primary vault holding deposited ETH and whitelisted ERC-20 tokens (USDC, USDT, WBTC). Handles gasless check-ins, Merkle allocation root commitment, backup claim registrations, and pro-rata distributions. |
| [`ProofOfLifeConsensus.sol`](contracts/src/ProofOfLifeConsensus.sol) | Standalone consensus primitive managing heartbeat tracking, timeout checks, contest window transitions (`Active` $\rightarrow$ `ClaimPending` $\rightarrow$ `Finalized`), and EIP-712 stealth claim cancellation (`cancelClaimWithSig`). |
| [`GuardianRegistry.sol`](contracts/src/GuardianRegistry.sol) | Verifies M-of-N cryptographic guardian attestations against committed Merkle roots while keeping guardian identities private until claim time. |
| [`StealthAddressRegistry.sol`](contracts/src/StealthAddressRegistry.sol) | EIP-5564 stealth key registry and announcement mechanism enabling non-linkable deposit addresses. |
| [`BeneficiarySmartAccount.sol`](contracts/src/BeneficiarySmartAccount.sol) | ERC-4337 v0.7 compliant smart account with EntryPoint integration, M-of-N guardian recovery, and self-managed backup claim delegation. |
| [`BalanceCommitment.sol`](contracts/src/BalanceCommitment.sol) | Pedersen balance commitment primitive enabling optional shielded vault balance verification. |

---

## 6. Setup & Installation

### Prerequisites
- **Node.js** $\ge 18.0.0$ and `npm`
- **Foundry** (`forge`, `cast`, `anvil`) — install via [getfoundry.sh](https://getfoundry.sh)
- **Python 3** (optional, for running Slither static analyzer)

### Repository Setup
Clone the repository:
```bash
git clone https://github.com/your-org/cadence.git
cd Cadence
```

---

## 7. Smart Contract Deployment (Sepolia Testnet)

All smart contracts deploy deterministically using Foundry.

### 1. Configure Environment Variables
Copy and populate the contracts environment file:
```bash
cd contracts
cp .env.example .env
```
Populate the following variables in `contracts/.env`:
```env
RPC_URL="https://ethereum-sepolia-rpc.publicnode.com" # or your Alchemy/Infura RPC URL
PRIVATE_KEY="0x..."                                   # Deployer private key with Sepolia ETH
ETHERSCAN_API_KEY="your_etherscan_api_key"            # Optional, for contract verification
```

### 2. Compile and Test Contracts
```bash
forge install
forge build
forge test -vvv
```
*Expected: 13 test suites, 197/197 passed with 0 failures.*

### 3. Deploy Protocol to Sepolia
Execute the automated deployment script [`Deploy.s.sol`](contracts/script/Deploy.s.sol):
```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

The script deploys all contracts in dependency order:
1. `StealthAddressRegistry`
2. `GuardianRegistry`
3. `BalanceCommitment`
4. `ProofOfLifeConsensus`
5. `InheritanceVault` (configured with 90-day heartbeat interval)
6. `BeneficiaryAccountFactory` (ERC-4337 EntryPoint 0.7)

Take note of the logged contract addresses in the deployment output.

### 4. Deploying the Accelerated Demo Vault (Presentation / Live Demo)

Real production inheritance vaults enforce 30–180 day heartbeat check-in intervals and a 72-hour dispute challenge window. For live presentations, hackathon evaluations, and live demos, Cadence provides a dedicated deployment script: [`DeployDemoVault.s.sol`](contracts/script/DeployDemoVault.s.sol).

> [!IMPORTANT]
> **Strict Architectural Authenticity**:
> The demo vault deploys the **exact same** [`InheritanceVault.sol`](contracts/src/InheritanceVault.sol) and [`ProofOfLifeConsensus.sol`](contracts/src/ProofOfLifeConsensus.sol) smart contracts as a production vault. There is **zero** mock or special-cased "demo mode" logic in the contracts themselves. It simply initializes the contract with an accelerated check-in interval parameter (e.g. 3 minutes / 180s) and contest duration (e.g. 15 minutes / 900s) directly via the standard constructor.

#### How to Redeploy (Run Fresh the Morning of a Presentation):
```bash
cd contracts
forge script script/DeployDemoVault.s.sol:DeployDemoVault \
  --rpc-url $RPC_URL \
  --broadcast
```

Optional environment variable overrides (in `contracts/.env`):
- `DEMO_CHECK_IN_INTERVAL`: Check-in interval in seconds (default: `180` = 3 minutes).
- `DEMO_CONTEST_DURATION`: Contest window in seconds (default: `900` = 15 minutes).
- `DEMO_DEPOSIT_WEI`: Initial ETH deposit (default: `50000000000000000` = 0.05 ETH).
- `CONSENSUS_ADDRESS`: Reuse existing `ProofOfLifeConsensus` deployment (optional).
- `GUARDIAN_REGISTRY_ADDRESS`: Reuse existing `GuardianRegistry` deployment (optional).

#### Timing Guide for Live Presentations:
To ensure the vault is sitting in or near the **Contest Window** when your demo begins, deploy the demo vault **5 to 8 minutes before your presentation**:

| Timeline | Elapsed | Protocol State & Action | Visual & Demo Impact |
|---|---|---|---|
| **$T - 8\text{ min}$** | 0:00 | Run `DeployDemoVault.s.sol`. Script deploys vault with 180s interval, commits 2-of-2 guardian root, and deposits initial ETH. | Vault deployed; heartbeat timer starts counting down from 3:00. |
| **$T - 5\text{ min}$** | 3:00 | 180-second check-in interval expires (`isTimeoutExpired() == true`). Guardian Node 1 & 2 submit attestations to `GuardianRegistry`. | Consensus threshold 2-of-2 met. `triggerClaimPending()` is executed on `ProofOfLifeConsensus`. |
| **$T - 0\text{ min}$** | 8:00 | **Presentation Starts**: Open [`/contest`](http://localhost:3000/contest). | **Locker is sitting live in the Contest Window!** ECG monitor displays chaotic amber arrhythmia (92 BPM Erratic). |
| **Live On Stage** | Live | **Demonstrate Zero-Gas Stealth Cancellation**: Click *"RESET PROTOCOL: I'M ALIVE"*. Owner signs EIP-712 cancellation off-chain with stealth key. Relayer broadcasts `cancelClaimWithSig`. | Vault resets instantly to **Active** state with steady teal pulse (62 BPM) and zero gas linkage to the owner's identity. |
| **Alternative Path** | Live | **Demonstrate Finalization & Claim**: If letting the 15-minute contest window elapse, call `finalizeContest()`. Switch to [`/claim`](http://localhost:3000/claim). | ECG line flatlines to 0 BPM red. Alice decrypts allocation locally via ECIES and claims 40% payout directly on-chain. |

#### Frontend Configuration for Demo Vault
Update `frontend/.env.local` to point to the newly deployed demo vault:
```env
NEXT_PUBLIC_VAULT_ADDRESS="<deployed_demo_vault_address>"
```

---

## 8. Live Testing Presets & Rapid Heartbeat Adjustment

Testing inactivity lapses on testnets should not require waiting months or hours. Cadence provides native fast-testing configurations:

1. **New Vault Creation Presets (`/vault/create`)**:
   - **`5 Min (Test)`** (300 seconds)
   - **`10 Min (Test)`** (600 seconds)
   - Alongside production intervals (`30 Days`, `60 Days`, `90 Days`, `180 Days`).
2. **On-Chain Interval Adjustment on Existing Vaults (`/dashboard`)**:
   - Vault owners can click **`[⚡ Adjust Interval]`** directly on the **Locker Heartbeat Rhythm** card.
   - Signs `InheritanceVault.setCheckInInterval(seconds)` on Sepolia, updating both the vault and `ProofOfLifeConsensus.sol`.
   - Countdown and oscilloscope ECG monitor update in real time (accelerating to 95 BPM when interval $\le 300\text{s}$).

---

## 9. Production Deployment Guide (Vercel & Render)

Cadence is built as a decoupled, production-grade architecture ready for instant cloud deployment:

### A. Deploying the Notification Service to Render
The backend microservice is fully configured for Render via the root [`render.yaml`](render.yaml) Blueprint:
1. Fork or push the Cadence repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint** (or **Web Service**).
3. Connect your repository. Render automatically reads `render.yaml`:
   - **Build Command**: `cd notifications && npm install && npm run build`
   - **Start Command**: `cd notifications && npm start`
   - **Health Check Path**: `/health`
4. Optionally configure email delivery in the Render environment variables:
   - `RESEND_API_KEY`: Your Resend API key (free tier 3,000 emails/mo)
   - `SMTP_FROM`: `Cadence Protocol <onboarding@resend.dev>`
5. Your service will be live at `https://<your-service>.onrender.com`.

### B. Deploying the Frontend to Vercel
The frontend is optimized for Next.js 16 on Vercel with automated security headers and multi-RPC resilience:
1. In the [Vercel Dashboard](https://vercel.com), click **Add New...** $\rightarrow$ **Project**.
2. Select your Cadence repository.
   - If importing from repo root, set **Root Directory** to `frontend` (or leave blank; root [`vercel.json`](vercel.json) routes automatically).
3. Open `frontend/.env.production.example` and paste the pre-configured variables into **Environment Variables**:
   - `NEXT_PUBLIC_CHAIN_ID`: `11155111`
   - `NEXT_PUBLIC_RPC_URL`: `https://ethereum-sepolia-rpc.publicnode.com`
   - Contract addresses (`NEXT_PUBLIC_VAULT_ADDRESS`, `NEXT_PUBLIC_CONSENSUS_ADDRESS`, etc.)
   - `NEXT_PUBLIC_NOTIFICATION_URL`: `https://<your-render-service>.onrender.com`
4. Click **Deploy**. Your frontend is live with multi-RPC failover across 4 Sepolia nodes!

---

## 10. Frontend Setup & Configuration (Local Development)

The user interface is built with **Next.js 16 (Turbopack)**, **Viem**, **Permissionless.js**, and custom Vanilla CSS following [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

### 1. Install Dependencies
```bash
cd ../frontend
npm install
```

### 2. Configure Frontend Environment (`.env.local`)
Create `frontend/.env.local` with the deployed contract addresses and API keys:
```env
# RPC & Network
NEXT_PUBLIC_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
NEXT_PUBLIC_CHAIN_ID="11155111"

# Contract Addresses (from Deploy.s.sol)
NEXT_PUBLIC_VAULT_ADDRESS="0x043d02c39B86CAd83E1Bf05728D32d24f6289e74"
NEXT_PUBLIC_CONSENSUS_ADDRESS="0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1"
NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS="0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863"
NEXT_PUBLIC_STEALTH_REGISTRY_ADDRESS="0x583eC2de840034478a61EF572cea2904bFD8671E"
NEXT_PUBLIC_FACTORY_ADDRESS="0x30489c0f3566AF47b71867bc992408B91E500823"

# Pimlico ERC-4337 Paymaster (Gasless Check-Ins)
NEXT_PUBLIC_PIMLICO_API_KEY=

# Notification Backend
NEXT_PUBLIC_NOTIFICATION_URL="http://localhost:3001"
```

### 3. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 11. Testing & Quality Assurance

Cadence features automated testing across smart contracts, cryptographic routines, ERC-4337 sponsorship, and full-lifecycle simulations.

### 1. Automated Foundry Test Suite
```bash
cd contracts
forge test
```
- **13 Test Suites / 197 Tests Passing (0 Failures)**:
  - `SecurityAuditTest`: Front-run protection on consensus registration, cross-chain/cross-contract EIP-712 attestation replay defense, independent token claim isolation, and authorized balance commitments.
  - `InheritanceVaultTest`: Deposits, check-ins, token whitelists, upkeep triggers.
  - `ProofOfLifeConsensusTest`: Timeout expiration, consensus state machines.
  - `ContestableClaimTest`: EIP-712 stealth cancellations, challenge deadlines, replay protection.
  - `AllocationPrivacyTest`: Merkle proof validation, plaintext leakage prevention.
  - `BeneficiaryClaimFlowTest`: Pro-rata payouts, tampered share rejection, stranger protection.
  - `BeneficiaryBackupClaimTest`: Beneficiary-controlled backup addresses and veto windows.
  - `BeneficiarySmartAccountTest`: ERC-4337 account abstraction, guardian recovery.
  - `StealthAddressRegistryTest`: EIP-5564 announcements and key recovery.
  - `BalanceCommitmentTest`: Pedersen balance proofs and pro-rata deductions.
  - `GuardianAttestationTest`: M-of-N attestation verification.

### 2. Frontend Cryptographic & Paymaster Integration Suites
```bash
cd ../frontend
# Pimlico ERC-4337 Paymaster verification
node scripts/test-paymaster.mjs

# ECIES encryption & Merkle proof flow
node scripts/test-beneficiary-claim-flow.mjs

# 10,000 bps off-chain allocation validator (Constraint #4)
node scripts/test-beneficiary-validation.mjs

# Allocation privacy & isolation tests
node scripts/test-allocation-privacy.mjs

# EIP-712 typed data hashing & signature recovery
node scripts/test-eip712.mjs
```

### 3. Sepolia Full-Lifecycle Manual Verification
Run the end-to-end simulation script verifying both cancellation and claim paths against genuine contract calldata:
```bash
node scripts/test-sepolia-lifecycle.mjs
```
*Validates 21/21 checks including deposit, gasless check-in, silence timeout, guardian attestations, contest challenge window, off-chain EIP-712 cancellation, and ECIES beneficiary decryption.*
*The frontend also incorporates `parseUserFriendlyError` to ensure graceful in-modal pause and retry handling if transactions are declined or cancelled in connected browser wallets.*

### 4. Notification Service & Security Test Suite
```bash
cd ../notifications
npm test            # Runs unit tests + security regression tests (15/15 passed)
npm run test:e2e    # Runs end-to-end HTTP integration tests (10/10 passed)
```
*Validates 15/15 unit and security tests (`notifications.test.mjs` and `security.test.ts`) covering canonical email-bound signature verification, forged signature rejection, unverified recipient blocking, claim notices, instant welcome confirmation emails, wallet-revealing notices, wrong-wallet recovery lookups, email substitution rejection, internal secret verification, admin outbox bearer authorization, and IP rate limiting. Also passes 10/10 live e2e integration tests.*

---

## 12. Security Audit & Analysis Summary

### Comprehensive 3-Phase Security Hardening Completed

Cadence has undergone an exhaustive multi-layer security audit and hardening process across contracts, backend services, and client applications:

#### Phase 1: Smart Contract Access Control, Replay Defense & Claim Isolation
1. **Front-Run Defense in Consensus Initialization (`GuardianRegistry.sol`)**:
   - `setConsensusForVault(address vault, address _consensus)` strictly reverts if `vaultOwners[vault] == address(0)` (unregistered vault) or if `msg.sender != vaultOwners[vault] && msg.sender != vault`.
   - Prevents unauthenticated front-running of consensus registrations.
2. **Cross-Chain / Cross-Contract Attestation Replay Defense (`GuardianRegistry.sol`)**:
   - `attestWithSig` enforces standard EIP-712 domain separation incorporating `name: "GuardianRegistry"`, `version: "1"`, `chainId: block.chainid`, and `verifyingContract: address(this)`.
   - Typed data struct: `GuardianAttestation(address vault,address guardian,uint256 cycle,uint256 deadline)`.
   - Enforces `block.timestamp <= deadline`. Attestation signatures cannot be replayed across different contracts or chains.
3. **Strict Access Control on Balance Commitments (`BalanceCommitment.sol`)**:
   - Inherits OpenZeppelin `Ownable(msg.sender)`.
   - Maintains an authorized vault registry (`isAuthorizedVault` mapping).
   - Enforces `onlyAuthorized(vault)` modifier across `recordDeposit`, `commitTransparentBalance`, and `deductPayout`.
4. **Resilient Token Claim Isolation (`InheritanceVault.sol`)**:
   - Token distributions execute via `_safeTransferCatching`, catching any low-level token revert and emitting `TokenTransferFailed(token, beneficiary, amount)`.
   - A single paused, blacklisting, or defective ERC-20 token can **never** revert the overall claim transaction or trap the beneficiary's ETH or other healthy token payouts.
   - Enforces a `MAX_WHITELISTED_TOKENS = 20` cap with $O(1)$ swap-and-pop removal to prevent unbounded gas loops.
5. **Stealth Registration Replay Protection (`StealthAddressRegistry.sol`)**:
   - `registerKeysOnBehalf` strictly binds `deadline`, `block.chainid`, and `address(this)` within the signed digest.

#### Phase 2: Notification Backend Hardening, PII Privacy & Rate Limiting
1. **Canonical Email-Bound Signature Payload (`bindingVerifier.ts` & `index.ts`)**:
   - `getBindingMessage(walletAddress, email, nonce)` strictly includes the lowercase email address in the message text.
   - `POST /api/bind` verifies that the wallet signature was produced specifically for the requested email address, preventing email-substitution attacks.
2. **Sensitive Endpoint Protection & PII Privacy (`index.ts`)**:
   - `GET /api/outbox` requires an `Authorization: Bearer <ADMIN_API_KEY>` header and is disabled when `NODE_ENV === 'production'`, preventing public PII enumeration.
   - Internal notification hooks (`/api/trigger-claim-notice` and `/api/notify/*`) require internal shared secret verification (`x-cadence-internal-key`).
3. **Tiered Rate Limiting (`express-rate-limit`)**:
   - Global rate limiter (100 requests / 15 minutes).
   - Sensitive endpoint limiter (10 requests / 15 minutes) applied strictly to `/api/bind`, `/api/suggest`, and `/api/remind-wallet` to defeat brute-force email enumeration and spamming.
4. **Strict CORS Origin Whitelist**:
   - Restricts API access exclusively to trusted origins (`CLIENT_URL`, localhost, `*.vercel.app`, and server-to-server requests).

#### Phase 3: Safe Key Management & Automated Regression Testing
1. **Safe In-Memory Key Derivation (`ClaimPortal.tsx`)**:
   - Completely eliminates raw private key text boxes from the user interface.
   - Derives the 32-byte ECIES decryption key strictly in-memory from a Web3 wallet signature (`personal_sign` over deterministic salt `keccak256(sig)`).
   - Retains local ephemeral signing fallback exclusively for headless automated test scripts (`KNOWN_HEADLESS_KEYS`).
2. **Automated Security Regression Suites**:
   - `contracts/test/SecurityAudit.t.sol`: 4 Foundry tests validating front-run protection, domain separation, token claim isolation, and unauthorized balance commitment rejection.
   - `notifications/test/security.test.ts`: 3 test categories validating email substitution rejection, admin outbox protection, internal secret enforcement, and rate limiting.

### Static Analysis (Slither)
Slither static analysis was executed across all smart contracts in `contracts/src/`:
- **Critical / High / Medium Vulnerabilities**: **0 Found**
- **Low / Informational Findings**:
  - Timestamp comparisons: Used intentionally for countdown timeouts and contest deadlines.
  - Low-level calls: Used in `claim` and `execute`, strictly guarded by OpenZeppelin `ReentrancyGuard` (`nonReentrant`).
- **Proactive Hardening Performed**:
  - Refactored `BeneficiaryAccountFactory.createAccount` to record account mappings before external initialization, adhering strictly to the Checks-Effects-Interactions pattern.

---

## 13. Documentation Index

| Document | Description |
|---|---|
| [`DEPLOYMENT-GUIDE.md`](DEPLOYMENT-GUIDE.md) | Complete step-by-step production deployment runbook (Sepolia contracts, Render microservice, Vercel frontend, Preflight tool) |
| [`docs/HACKATHON-PITCH.md`](docs/HACKATHON-PITCH.md) | Hackathon Top-1 pitch kit, submission metadata, and 3-minute video demo script |
| [`docs/PRD.md`](docs/PRD.md) | Product requirements and hackathon MVP scope |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical architecture and 9 core constraints |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | "Pulse" dark clinical design tokens and component specs |
| [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md) | Implementation schedule and milestones |
| [`docs/MEMORY.md`](docs/MEMORY.md) | Living project session log and audit trail |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Session handoff notes and quick-start instructions |

---

## 14. License

MIT License. Developed for open-source evaluation and hackathon judging.


