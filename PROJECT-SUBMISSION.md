# Cadence — Protocol Architecture & Technical Project Submission

---

## Problem Statement: Clearly define the unsolved problem you are addressing.

Over **$100 Billion in cryptocurrency** is estimated to be permanently lost, trapped in inaccessible addresses due to unexpected death, medical incapacitation, or forgotten private keys. The foundational ethos of Web3—*"not your keys, not your coins"*—creates a catastrophic blindspot: when a self-custodial asset holder dies, their wealth dies with them.

Today, crypto holders seeking to pass their life savings to their heirs face an impossible dilemma between two deeply flawed paradigms:

### 1. The Centralized Custodial Trap
Traditional estate planning and custodial crypto solutions require users to surrender private keys, seed phrases, or multi-sig master keys to institutional third parties, centralized exchanges, or legal custodians. This model suffers from severe vulnerabilities:
- **Destruction of Self-Sovereignty:** Asset holders forfeit autonomous custody of their funds.
- **Exorbitant Fees & Bureaucracy:** Estate lawyers and custodial trusts impose steep ongoing management fees, lengthy probate delays, and complex cross-border legal hurdles.
- **Single Points of Institutional Failure:** Custodians are vulnerable to internal fraud, regulatory freezes, subpoenas, and centralized data breaches.
- **Invasive Surveillance:** Requires exhaustive KYC/AML documentation, permanently doxxing both the benefactor and their beneficiaries.

### 2. The Naive On-Chain Dead Man’s Switch (The Storage & Guillotine Traps)
Existing decentralized alternatives typically rely on simplistic smart contract timer switches. These systems introduce critical vulnerabilities that make them unusable for real-world wealth preservation:
- **The On-Chain Storage Trap (Total Privacy Failure):** Naive contracts store beneficiary addresses, percentage shares, and asset balances in plaintext public storage slots (e.g., `mapping(address => uint256)`). Anyone running an archive node or calling `eth_getStorageAt` can inspect the exact net worth of the vault owner, the identity of their children or heirs, and the exact financial breakdown of their inheritance plan.
- **The Guillotine Timer (False-Positive Liquidation):** Simple countdown timers have no real-world nuance. If an owner is hospitalized, travels off-grid without internet connectivity, or misplaces their phone, a single missed check-in triggers irreversible distribution. Malicious front-runners and griefers can immediately trigger liquidation without confirming whether the owner is actually deceased.
- **The Gas Linkage De-Anonymization Trap:** If an owner uses a stealth or secondary recovery wallet to cancel an accidental challenge, they must fund that stealth address with ETH to pay for transaction gas. Tracing the funding transaction back to the owner's primary wallet permanently compromises their anonymity on public block explorers.

---

## Solution: Explain your proposed Blockchain/Web3-based solution and its unique value.

**Cadence** is a decentralized, self-custodial, zero-leak digital inheritance protocol built natively on Ethereum. It replaces fragile guillotine timers and custodial intermediaries with a **multi-signal proof-of-life consensus engine**, **client-side ECIES-secp256k1 encrypted allocations**, and **gasless EIP-712 stealth recovery**.

```mermaid
flowchart LR
    subgraph S1["1. Atomic Setup"]
        A["1-Click Signature"] --> B["Deposit Capital"]
        B --> C["Blinded Merkle Root"]
    end

    subgraph S2["2. Heartbeat Vitality"]
        D["Active 62 BPM ECG"] --> E["Paymaster Renewals"]
        E --> F["Sentinel Daemon Alerts"]
    end

    subgraph S3["3. Consensus Challenge"]
        G["Inactivity Arrhythmia"] --> H["2-of-2 Guardian Quorum"]
        H --> I["72h Grace Contest Window"]
    end

    subgraph S4["4. Claim or Stealth Cancel"]
        J{"Living Owner?"}
        J -- "Yes (Living)" --> K["EIP-712 Stealth Cancel<br/>(Zero Gas Linkage)"]
        J -- "No (Finalized)" --> L["In-Memory ECIES Decrypt<br/>Private Merkle Claim"]
    end

    S1 --> S2 --> S3 --> S4
```

| Lifecycle Phase | State & Telemetry | Core Mechanics |
| :--- | :--- | :--- |
| **1. 1-Click Setup** | `Initial` $\rightarrow$ `Active` | • 1 wallet signature deploys & deposits<br/>• Double-hashed blinded Merkle tree commit<br/>• Zero plaintext shares on-chain |
| **2. Heartbeat Rhythm** | `Active (62 BPM)` | • Pimlico Paymaster gasless check-ins<br/>• Sentinel daemon 20s watcher loop<br/>• Shoulder-surfing privacy balance toggle |
| **3. Consensus Challenge** | `Inactive (92 BPM)` | • 2-of-2 Guardian on-chain quorum verification<br/>• 72h contest grace period opens<br/>• Automated email dispatch to guardians |
| **4. Recovery vs. Claim** | `Active` or `Finalized (0 BPM)` | • **Living Owner:** EIP-712 stealth cancel (0 gas linkage)<br/>• **Beneficiary:** In-memory ECIES decrypt & Merkle claim |

### Key Architectural Pillars & Unique Value:

1. **Zero Plaintext On-Chain (Constraint #3):**
   The vault smart contract never stores beneficiary addresses or share distributions in contract storage slots. Instead, it commits strictly to a single 32-byte cryptographic Merkle root (`allocationRoot`). Each individual beneficiary allocation is encrypted client-side using the recipient’s public key via **ECIES-secp256k1**. The on-chain ledger records only opaque ciphertexts and blinded Merkle leaves.

2. **Multi-Signal Proof-of-Life Consensus Engine:**
   Liquidations can never occur from an expired timer alone. Cadence couples time-based heartbeats with an on-chain **M-of-N Guardian Consensus Quorum** (`GuardianRegistry.sol`). Inactivity merely opens an attestation window; only when designated guardians cryptographically verify inactivity on-chain can a contest challenge period begin.

3. **Zero "Gas-Linkage" Stealth Recovery (Constraint #1):**
   Living owners who need to dismiss a false-alarm claim never send a direct transaction from a funded wallet. Instead, the owner signs an off-chain **EIP-712 typed digest** (`CancelClaim`) using their stealth private key. Any third-party relayer can submit this signature on-chain to reset the protocol to `Active` with **zero ETH gas paid by the owner**, preventing forensic identity linkage.

4. **1-Click Atomic Vault Provisioning (`OneClickInheritanceVault.sol`):**
   Traditional multi-step protocols require 4 to 5 sequential transactions (Deploy Contract $\rightarrow$ Deposit Capital $\rightarrow$ Set Allocation Root $\rightarrow$ Configure Guardian Quorum $\rightarrow$ Set Grace Duration). Cadence condenses all 5 operations into **1 single wallet signature**, drastically reducing user error, gas costs, and onboarding drop-off.

5. **Autonomous Background Sentinel Daemon:**
   An off-chain background service (`notifications/sentinel.ts`) continuously monitors on-chain Sepolia state every 20 seconds. It tracks upcoming check-in deadlines, detects inactivity lapses, and automatically delivers email notices to owners, guardians, and heirs with persistent, cycle-keyed deduplication.

---

## Technology Stack: Mention the blockchain/network, protocols, tools, and frameworks used.

### Smart Contracts & Blockchain
- **Target Network:** Ethereum Sepolia Testnet (`Chain ID: 11155111`)
- **Smart Contract Language:** Solidity `^0.8.24`
- **Development & Testing Framework:** Foundry (`forge`, `cast`)
- **OpenZeppelin Contracts:**
  - `SafeERC20.sol` & `IERC20.sol`: Secure multi-token handling for ETH, USDC, USDT, and WBTC.
  - `MerkleProof.sol`: Cryptographic leaf verification for beneficiary allocations and guardian quorums.
  - `EIP712.sol` & `ECDSA.sol`: Structured domain hashing and off-chain typed signature recovery.
- **Chainlink Automation:** `AutomationCompatibleInterface.sol` for autonomous keeper upkeep execution.
- **Account Abstraction (ERC-4337):** EntryPoint `v0.7` integration with Pimlico Paymaster sponsorship via `permissionless.js`.

### Cryptography & Security
- **ECIES-secp256k1 (`eth-crypto`):** Asymmetric client-side encryption of beneficiary shares and blinding salts.
- **Double-Hashed Blinded Merkle Trees:** Leaves generated using OpenZeppelin-compatible double-keccak formatting:
  $$\text{Leaf} = \text{keccak256}(\text{keccak256}(\text{abi.encode}(\text{beneficiary}, \text{shareBps}, \text{salt})))$$
- **EIP-5564 Stealth Addresses:** Ephemeral stealth key derivation for non-traceable protocol cancellations.

### Frontend Web Application
- **Framework:** Next.js 16 (App Router + Turbopack)
- **UI Core:** React 19, TypeScript 5
- **Web3 Interaction:** Viem `^2.56.3`, Wagmi `^3.7.7`, TanStack React Query `^5.102.8`
- **Styling Architecture:** Custom Cyber-Minimalism ("Pulse" Design System) using pure Vanilla CSS tokens, dynamic SVG ECG oscilloscopes, and glassmorphic cards.
- **RPC Infrastructure:** High-availability 4-provider failover pool (`publicClient`) combining PublicNode, Ethereum Foundation, Automata 1RPC, and Tenderly Gateway.

### Autonomous Sentinel Microservice
- **Runtime:** Node.js, Express `^4.21.2`, TypeScript `^5.7.2`
- **On-Chain Watcher:** Viem client polling Sepolia block headers on a 20-second interval.
- **Email Delivery:** Nodemailer `^10.0.0` integrated with live SMTP transport (`smtp.gmail.com:587`) and Resend API.
- **Rate Limiting & Security:** `express-rate-limit`, strict EIP-712 wallet-signature email binding verifier (`bindingVerifier.ts`).

---

## Built With

> **Submission Tags (Up to 25 tags):**
> `ethereum`, `solidity`, `foundry`, `next.js`, `typescript`, `tailwindcss`, `viem`, `wagmi`, `erc-4337`, `account-abstraction`, `eip-712`, `ecies`, `cryptography`, `merkle-trees`, `openzeppelin`, `pimlico`, `node.js`, `express`, `resend`, `web3`, `smart-contracts`, `privacy`, `digital-inheritance`, `sepolia`, `zero-knowledge`

| # | Tag | Description / Role in Cadence |
|---|---|---|
| 1 | **`ethereum`** | Primary settlement layer for sovereign inheritance vaults. |
| 2 | **`solidity`** | Language powering `InheritanceVault`, `ProofOfLifeConsensus`, and `OneClickInheritanceVault`. |
| 3 | **`foundry`** | Rigorous contract test suite (**198/198 passing unit, integration, and fuzz tests**). |
| 4 | **`next.js`** | High-performance Next.js 16 frontend with Turbopack and React 19. |
| 5 | **`typescript`** | Strict static typing across frontend interfaces and Sentinel daemons. |
| 6 | **`tailwindcss`** | Cyber-minimalist "Pulse" design system, dark mode, and bespoke UI tokens. |
| 7 | **`viem`** | Type-safe Ethereum client with multi-provider automatic RPC failover. |
| 8 | **`wagmi`** | React hooks library for seamless Web3 wallet state and signature orchestration. |
| 9 | **`erc-4337`** | Account Abstraction standard enabling smart account paymaster sponsorship. |
| 10 | **`account-abstraction`** | Gasless heartbeat renewals and zero-friction vault lifecycle management. |
| 11 | **`eip-712`** | Gasless typed structured signatures for zero-gas stealth claim cancellation. |
| 12 | **`ecies`** | Client-side secp256k1 asymmetric encryption protecting beneficiary shares. |
| 13 | **`cryptography`** | Applied zero-leak privacy primitives, blinding salts, and ephemeral keys. |
| 14 | **`merkle-trees`** | Double-hashed blinded Merkle tree leaves verifying allocations on-chain. |
| 15 | **`openzeppelin`** | Battle-tested contract libraries (`SafeERC20`, `MerkleProof`, `EIP712`, `ReentrancyGuard`). |
| 16 | **`pimlico`** | ERC-4337 bundler and paymaster infrastructure. |
| 17 | **`node.js`** | Runtime for the background Sentinel service and test suites. |
| 18 | **`express`** | Microservice framework for the real-time Sentinel monitoring daemon. |
| 19 | **`resend`** | Transactional email infrastructure delivering real-time guardian and heir notifications. |
| 20 | **`web3`** | Trustless, self-sovereign application design pattern. |
| 21 | **`smart-contracts`** | Non-custodial, immutable consensus and inheritance logic. |
| 22 | **`privacy`** | Zero on-chain plaintext allocations, blinded Merkle roots, and stealth addresses. |
| 23 | **`digital-inheritance`** | Primary project domain: self-custodial multi-generational wealth preservation. |
| 24 | **`sepolia`** | Live Ethereum testnet where all Cadence contracts and daemons are active. |
| 25 | **`zero-knowledge`** | Blinded cryptographic commitments without on-chain plaintext exposure. |

---

## Inspiration

Cadence was born out of a realization that self-custody in Web3 is currently unforgiving. While the industry has spent a decade perfecting self-sovereign key management, we inadvertently created a digital cemetery where billions of dollars in hard-earned capital vanish into the void every year. 

Traditional inheritance solutions are alien to crypto: they demand that you reveal your seed phrase to a third party or trust an institution that may not understand digital assets. Conversely, existing dead man switches feel like an automated execution chamber—miss one timer notification while you are sick or offline, and your entire portfolio is dumped to your beneficiaries before you can stop it.

We wanted to build something fundamentally different: a protocol that mirrors the human cardiovascular system. Instead of an aggressive countdown timer, Cadence listens for a calm, organic **heartbeat rhythm**. If an irregularity occurs, the protocol doesn't immediately dump funds; it sounds an alarm, queries trusted guardian nodes, gives the owner ample opportunity to anonymously confirm their vitality, and only executes asset distribution when there is absolute cryptographic certainty.

---

## What it does

Cadence provides a complete, 5-phase trust-minimized inheritance lifecycle:

### Phase 1: 1-Click Vault Provisioning (`/vault/create`)
The asset owner deploys an autonomous locker in a single transaction:
- **Capital Deposit:** Deposits native ETH or whitelisted ERC-20 tokens.
- **Client-Side Allocation Encryption:** The owner specifies each heir’s wallet address and allocation percentage (e.g., Alice: 40%, Bob: 60%). The frontend generates a random 32-byte blinding salt for each heir, validates that shares sum to exactly 10,000 basis points (100%), encrypts each payload with the beneficiary’s public key, and computes the 32-byte `allocationRoot`.
- **Guardian Setup:** The owner assigns two independent Guardian Consensus Nodes (addresses and optional notification emails).
- **Atomic Deployment:** `OneClickInheritanceVault.sol` deploys the contract, deposits capital, pairs with the `ProofOfLifeConsensus.sol` state machine, and locks the Merkle roots in **1 single wallet signature**.

### Phase 2: Heartbeat Monitoring & Telemetry (`/dashboard`)
- **Real-Time ECG Rhythm Telemetry:** An interactive SVG oscilloscope monitor visualizes vault status in real-time (`62 BPM Steady` in Pulse Teal).
- **Dual-Path Check-Ins:**
  - *Smart Accounts (ERC-4337):* Owners check in with zero ETH gas using Pimlico Paymaster sponsorship.
  - *Standard EOAs:* Direct, standard on-chain heartbeat transactions updating `lastActiveTimestamp`.
- **Shoulder-Surfing Privacy Mask:** A dedicated **`[Private / Show]`** toggle allows owners to obscure their live balance (`•••••••• ETH`) during public presentations.
- **Proactive Sentinel Warnings:** The Sentinel daemon sends automated reminders to the owner's verified email when the check-in window approaches (e.g., $\le 2$ minutes on test intervals, $\le 3$ days on standard vaults).

### Phase 3: Multi-Signal Inactivity Challenge (`/contest`)
- **Heartbeat Expiration:** If the check-in timer lapses, the vault enters an inactive state, transitioning the ECG line to an erratic amber arrhythmia (`92 BPM Erratic`).
- **Autonomous Guardian Dispatch:** The Sentinel daemon automatically emails personalized alert notices with direct on-chain contest links to Guardian Node 1 and Guardian Node 2.
- **Consensus Quorum:** Guardians connect their wallets and submit Merkle proofs to attest to inactivity on Sepolia.
- **Challenge Window Activation:** Once a 2-of-2 guardian quorum is verified on-chain, the locker transitions to `ClaimPending`, opening a customizable contest challenge window (e.g., 5-minute fast testing or 72-hour default).

### Phase 4: Zero Gas-Linkage Stealth Cancellation
- If the owner is alive and the contest was triggered by a false alarm, they click **`[RESET PROTOCOL: I'M ALIVE]`**.
- The owner signs an off-chain EIP-712 typed digest (`CancelClaim`).
- Any relayer can submit the signature to `cancelClaimWithSig()`. The consensus contract verifies the stealth signature against the owner's registered key, resets `lastActiveTimestamp`, and reverts the vault back to `Active`. The owner pays zero gas and leaves zero forensic link between their stealth key and main wallet.

### Phase 5: 1-Click Finalization & Private Beneficiary Claim (`/claim`)
- **Grace Period Conclusion:** Once the contest countdown reaches zero without owner cancellation, the locker transitions to `Finalized` (`0 BPM Flatline` in Danger Coral).
- **Safe In-Memory Key Derivation:** The heir connects their wallet and clicks **`[🔑 Unlock & Decrypt Share]`**. They sign an ephemeral authorization message (`personal_sign` over a deterministic salt), deriving their 32-byte decryption key strictly in browser memory.
- **Local Decryption & Proof Generation:** The heir decrypts their `{ shareBps, salt }`, reads the on-chain distribution snapshot, and computes their Merkle proof path against `allocationRoot`.
- **Payout Execution:** The heir clicks **`[Execute Inheritance Claim]`**. The contract validates the Merkle proof on-chain and transfers their exact pro-rata ETH/token share directly to their wallet.

---

## How I built it

### 1. Smart Contract Architecture (Foundry)
- **`InheritanceVault.sol`**: Implements native ETH deposit functions (`receive()`, `depositETH()`) and token whitelisting using OpenZeppelin's `SafeERC20`. Manages check-in timestamps, inactivity checks (`isInactive()`), and distribution snapshots (`distributionSnapshot`) to preserve exact pro-rata calculations across asynchronous claims.
- **`ProofOfLifeConsensus.sol`**: Implements the 4-state protocol state machine:
  $$\text{ConsensusState}: \text{Active} \longrightarrow \text{ClaimPending} \longrightarrow \text{Finalized} \lor \text{Cancelled}$$
  Enforces 2-of-2 guardian attestation quorums and validates off-chain EIP-712 cancellations.
- **`OneClickInheritanceVault.sol`**: Designed an atomic factory constructor that receives all vault parameters, computes Merkle commitments, deploys child storage instances, deposits native capital, and binds consensus in a single atomic transaction.
- **`GuardianRegistry.sol`**: Manages guardian public keys and Merkle leaf verification for consensus attestation.

### 2. Client-Side Cryptographic Pipeline (`frontend/lib/`)
- **`merkle.ts`**: Engineered the double-hashing Merkle tree pipeline:
  ```typescript
  export function computeAllocationLeaf(beneficiary: Address, shareBps: bigint, salt: Hex): Hex {
    const encoded = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "bytes32" }],
      [beneficiary, shareBps, salt]
    );
    return keccak256(concat([keccak256(encoded)]));
  }
  ```
- **`encryption.ts`**: Built client-side ECIES encryption and decryption handlers using `eth-crypto`.
- **`ClaimPortal.tsx`**: Implemented an in-memory key derivation flow:
  $$\text{Private Decryption Key} = \text{keccak256}(\text{personal\_sign}(\text{deterministicSalt}))$$
  This completely removes raw private key input fields from the application UI.

### 3. Autonomous Sentinel Microservice (`notifications/`)
- Built `sentinel.ts` to poll Ethereum Sepolia state every 20 seconds.
- Implemented persistent, cycle-keyed deduplication:
  - `${vault}_owner_approaching_${lastActive}`
  - `${vault}_owner_overdue_${lastActive}`
  - `${vault}_heartbeat_${lastActive}`
  - `${vault}_concluded_${contestDeadline}`
- Integrated `emailService.ts` using Nodemailer and live SMTP transport (`smtp.gmail.com:587`), verified against strict EIP-712 wallet-signature email bindings (`bindingVerifier.ts`) per Constraint #6.

### 4. Cyber-Minimalist Frontend Experience
- Developed the Next.js 16 application using a clinical, medical-grade "Pulse" design system.
- Engineered dynamic SVG oscilloscope animations that react to real-time contract states.
- Implemented a 4-provider Viem fallback RPC pool to ensure zero UI freezes during hackathon live testing.

---

## Challenges i ran into

### 1. The "Gas Linkage" De-Anonymization Trap
- **The Problem:** In conventional stealth designs, if an owner needs to cancel an illegitimate claim, they must broadcast a transaction from their stealth address. However, newly derived stealth addresses have a 0 ETH balance. If the owner funds the stealth address with gas money from their main wallet, blockchain analytics tools can trivially link the two addresses, permanently de-anonymizing the owner.
- **How We Solved It:** We decoupled transaction execution from authorization by implementing **EIP-712 off-chain typed data signatures**. The owner signs a structured `CancelClaim` digest off-chain:
  ```solidity
  bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
      CANCEL_CLAIM_TYPEHASH,
      vault,
      nonce,
      deadline
  )));
  ```
  Any public relayer or automated bot can submit this digest via `cancelClaimWithSig()`. The contract recovers the stealth signer's address via `ECDSA.recover` and cancels the claim without the owner ever needing to fund the stealth address with ETH.

### 2. The On-Chain Storage Leak Trap
- **The Problem:** Writing plaintext allocation data (such as `mapping(address => uint256) public allocations`) to a smart contract exposes family inheritance structures to anyone running an archive node or calling `eth_getStorageAt`.
- **How We Solved It:** We eliminated on-chain storage mappings entirely. The contract stores only a single 32-byte `bytes32 public allocationRoot`. Plaintext shares and blinding salts are encrypted on the client side using the recipient's secp256k1 public key. Direct `vm.load` storage-slot audits in Foundry (`AllocationPrivacy.t.sol`) confirm that zero plaintext addresses or percentages can be extracted from the contract.

### 3. Single-Beneficiary vs. Multi-Beneficiary Merkle Proof Parity
- **The Problem:** In a vault with only 1 heir, the Merkle tree has a single leaf, meaning `leaf == root` and the proof array is empty (`[]`). Standard Merkle tree libraries crashed or rejected zero-length proofs when validating single-heir vaults.
- **How We Solved It:** We engineered OpenZeppelin-compliant proof handling in both TypeScript (`merkle.ts`) and Solidity (`InheritanceVault.sol`). If `tree.leaves.length === 1`, the library returns an empty proof array `[]`, and the contract’s `MerkleProof.verify` correctly confirms that the single leaf equals the root.

### 4. Eliminating the "Paste Private Key" UI Anti-Pattern
- **The Problem:** ECIES decryption requires a private key. Asking users to paste their private key into a browser text box is a critical security vulnerability.
- **How We Solved It:** We built an in-memory key derivation protocol. Beneficiaries sign an ephemeral authorization message using their connected Web3 wallet (`personal_sign` over a deterministic salt). The 32-byte ECIES decryption key is derived strictly in volatile browser RAM, used to decrypt `{ shareBps, salt }`, and then discarded. Zero raw private keys are ever typed, pasted, or stored.

### 5. Multi-RPC Failover Under High Traffic
- **The Problem:** High-frequency polling on public Sepolia testnet RPCs frequently triggered HTTP 429 rate-limiting and connection drops during end-to-end testing.
- **How We Solved It:** In `lib/contracts.ts`, we constructed a Viem `fallback([...])` transport pooling 4 independent RPC endpoints (PublicNode, Ethereum Foundation, Automata, and Tenderly). If an RPC node encounters an error or rate limit, the client seamlessly fails over to the next provider without interrupting the user experience.

---

## Accomplishments that i'm proud of

### 1. 100% Comprehensive Test Suite Across All Layers
- **Foundry Smart Contract Tests:** **198 / 198 Tests Passing** (14 comprehensive test suites covering security, lifecycle, access control, and privacy).
- **Client Allocation Privacy & Cryptography:** **18 / 18 Tests Passing** (`scripts/test-allocation-privacy.mjs`).
- **End-to-End Beneficiary Claim Flow:** **22 / 22 Tests Passing** (`scripts/test-beneficiary-claim-flow.mjs`).
- **Autonomous Sentinel & Constraint #6 Suite:** **18 / 18 Tests Passing** (`notifications/test/`).
- **Frontend Code Hygiene:** **0 ESLint Errors, 0 Warnings, and 0 TypeScript Errors** on Next.js 16 with Turbopack.

### 2. 1-Click Atomic Vault Provisioning
We completely eliminated multi-step onboarding friction by consolidating 5 complex cryptographic operations into **1 single transaction** via `OneClickInheritanceVault.sol`.

### 3. Fully Autonomous Sentinel Microservice
We engineered a true autonomous background daemon that operates 24/7 on Ethereum Sepolia, polling consensus state every 20 seconds and reliably delivering email alerts to owners and guardians with zero manual intervention required.

### 4. Clinical Cyber-Minimalist "Pulse" Design System
We designed an interface that transforms an anxiety-inducing topic (death and asset loss) into a calm, clinical, and intuitive experience. The live ECG oscilloscope line provides immediate visual clarity on protocol health, while the shoulder-surfing privacy balance mask empowers users to share their screens without exposing their net worth.

---

## What i learnt

1. **Applied Zero-Leak Cryptography in Solidity:** Gained deep practical expertise in combining asymmetric ECIES-secp256k1 client-side encryption with double-hashed blinded Merkle trees, ensuring that smart contracts can enforce complex economic logic without ever observing plaintext user data.
2. **Account Abstraction Constraints in Production:** Learned how to dynamically inspect on-chain bytecode (`code.length > 0`) to distinguish between smart accounts (sponsored via Pimlico ERC-4337 paymasters) and standard EOAs, ensuring honest gas fee transparency in the UI.
3. **Resilient Off-Chain Daemon Design:** Discovered the critical importance of deterministic cycle-keyed deduplication (`${vault}_${cycle}_${timestamp}`) when building autonomous monitoring daemons, preventing redundant on-chain RPC calls and email spam loops.
4. **Designing for Non-Technical Beneficiaries:** Recognized that inheritance protocols must cater to non-crypto-native family members. Designing safe in-memory key derivation and 1-click claim finalization proved that privacy and usability can coexist seamlessly.

---

## What's next for Cadence

1. **Multi-Asset & DeFi Yield Vaults:** Expanding beyond native ETH and ERC-20 balances to support automated streaming distribution of yield-bearing assets (e.g., Lido stETH, Aave aTokens) and NFT collections upon finalization.
2. **Cross-Chain Inheritance via Chainlink CCIP:** Extending Cadence to monitor heartbeat vitality on Ethereum while trustlessly orchestrating asset unlocks across Arbitrum, Optimism, Base, and Polygon.
3. **Passkey & WebAuthn Guardian Integration:** Integrating WebAuthn passkeys so non-technical family members and guardians can attest to proof-of-life consensus using device biometrics (FaceID or TouchID) without installing a Web3 browser wallet.
4. **Formal Verification & Mainnet Audit:** Conducting full formal verification of `ProofOfLifeConsensus.sol` and the Merkle proof verification libraries with top-tier security audit firms ahead of mainnet deployment.
