# Cadence — Hackathon Top-1 Submission & Pitch Kit

> **The self-custodial, trust-minimized inheritance protocol for Ethereum.**  
> Eliminating single-point-of-failure dead man switches with Merkle allocation commitments, M-of-N proof-of-life consensus, and gasless EIP-712 stealth recovery.

---

## 1. Executive Summary & 1-Line Hook

### The Hook
> *"Billions in crypto are lost forever when holders pass away or lose access. Existing solutions force an impossible choice: surrender your private keys to a custodial trust, or use a naive on-chain dead man switch that leaks your family's allocations and gets griefed by frontrunners. Cadence solves this with zero custody, zero balance leakage, and zero gas-linkage."*

### Key Metrics & Highlights
- **100% Self-Custodial**: Assets remain strictly under owner control until cryptographic inactivity consensus concludes.
- **Client-Side Privacy**: Beneficiary allocations and share percentages are encrypted off-chain via **ECIES-secp256k1**; only a 32-byte Merkle Root is stored on-chain. Zero public ledger leaks.
- **Gasless Stealth Recovery**: Compelled or compromised owners can halt liquidation via an off-chain **EIP-712 typed signature** broadcast by any relayer with zero gas-linkage to the owner's address.
- **Account Abstraction (ERC-4337)**: Native Pimlico Paymaster sponsorship for check-ins and gasless claims.
- **Fully Deployed & Verified**: Live on **Sepolia Ethereum Testnet** with 182/182 Foundry tests and 11/11 backend integration tests passing.

---

## 2. The Problem & Market Need

Over **$100 Billion** in cryptocurrency is estimated to be trapped in inaccessible addresses due to unexpected death, medical incapacitation, or permanent key loss.

Existing approaches suffer from critical flaws:
1. **Custodial Trustees & Centralized Services**: Third parties can be subpoenaed, compromised, hacked, or censor transactions. Not your keys, not your estate.
2. **Naive Dead Man Switches**:
   - **Privacy Leakage**: Writing beneficiary addresses and token allocations to public smart contracts invites targeted extortion, phishing, and family disputes.
   - **False Positive Liquidation**: If an owner misses a single check-in due to a flight or hospital stay, all assets are permanently liquidated.
   - **The "Gas Linkage" Surveillance Trap**: If an attacker drains an owner's ETH to trigger inactivity, the owner cannot cancel the switch without funding the account — alerting the attacker and getting front-run.

---

## 3. The Cadence Solution: 3 Cryptographic Pillars

```
+-----------------------------------------------------------------------------------+
|                                CADENCE PROTOCOL                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   PILLAR 1: MERKLE PRIVACY         PILLAR 2: CONSENSUS      PILLAR 3: RECOVERY     |
|   +--------------------------+    +--------------------+   +--------------------+ |
|   | • 32-byte Merkle Root    |    | • Configurable     |   | • 72-Hour Safe     | |
|   | • ECIES-secp256k1        | -> |   Heartbeat (90d)  |-> |   Contest Window   | |
|   | • Zero Allocation Leaks  |    | • M-of-N Guardians |   | • EIP-712 Gasless  | |
|   | • Offline Proof Gen      |    | • No Single Trigger|   |   Stealth Cancel   | |
|   +--------------------------+    +--------------------+   +--------------------+ |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Pillar 1: Merkle Allocation Commitment & ECIES Client Encryption
- The contract stores only `allocationRoot = keccak256(...)`.
- The owner generates leaves locally: `leaf = keccak256(abi.encodePacked(beneficiary, basisPoints, salt))`.
- Allocation amounts and Merkle sibling proofs are encrypted using each beneficiary's secp256k1 public key and dispatched via private notification channels.
- **Result**: Block explorers show only arbitrary 32-byte hashes. Zero observer knows who inherits what.

### Pillar 2: Proof-of-Life Consensus Primitive
- Owners configure a pulse cadence (e.g. 90 days for standard lockers; 5 minutes for rapid testing).
- Any on-chain heartbeat resets the timestamp.
- If the interval elapses, inactivity must be attested by an optional **M-of-N quorum of designated guardians** (trusted nodes, family members, or legal signers) before entering contest.

### Pillar 3: 72-Hour Contest Window & EIP-712 Stealth Cancel
- Once inactivity is certified, zero funds move immediately. An immutable **72-hour contest window** opens.
- If the owner is alive or compromised, they sign an **EIP-712 typed digest** off-chain:
  ```solidity
  cancelClaimWithSig(vaultAddress, nonce, deadline, signature)
  ```
- Any third-party relayer broadcasts this transaction. **Zero ETH is required from the owner wallet**, completely defeating frontrunning and address-linkage surveillance.

---

## 4. Live Verified Contracts on Ethereum Sepolia

All contracts are compiled with Solidity 0.8.28 (Via-IR enabled) and verified on Sepolia Etherscan:

| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **InheritanceVault (Standard 90-Day)** | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74#code) |
| **InheritanceVault (Demo 5-Min Test)** | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1#code) |
| **ProofOfLifeConsensus** | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1#code) |
| **GuardianRegistry** | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863#code) |
| **StealthAddressRegistry (EIP-5564)** | `0x583eC2de840034478a61EF572cea2904bFD8671E` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x583eC2de840034478a61EF572cea2904bFD8671E#code) |
| **BalanceCommitment** | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC#code) |
| **BeneficiaryAccountFactory (ERC-4337)** | `0x30489c0f3566AF47b71867bc992408B91E500823` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x30489c0f3566AF47b71867bc992408B91E500823#code) |

---

## 5. Judge Fast-Track Guide (Evaluate in 3 Minutes)

The Cadence UI includes a sticky **"Judge Fast-Track"** bar engineered for instant hackathon evaluation:

1. **Top Bar Persona Switching**:
   - Click **`[Owner]`**: Inspect heartbeat, deposit ETH, update intervals, or send proof-of-life pulses.
   - Click **`[Alice (40%)]`**: Seamlessly load the Claim Portal; test client-side Merkle proof verification and zero-claim recovery.
   - Click **`[Bob (60%)]`**: Verify multi-beneficiary independent claim isolation.
   - Click **`[Guardian 1]`** / **`[Guardian 2]`**: Attest inactivity or review quorum consensus.
2. **Locker Selector**:
   - Toggle between **`Standard (90d)`** and **`Fast Demo (5m)`** to test on-chain state transitions without waiting months.
3. **Interactive Cryptography Modal**:
   - Click **"Architecture & Cryptography"** to view interactive diagrams of ECIES encryption, Merkle trees, and EIP-712 digests.
4. **Keys & Faucets Drawer**:
   - Pre-configured test accounts and 1-click Sepolia faucet links.

---

## 6. 3-Minute Hackathon Demo Video Script

| Timestamp | Video Screen Action | Narration Script |
| :--- | :--- | :--- |
| **0:00 - 0:30** | Landing Page + Oscilloscope Animation (`/`) | *"Welcome to Cadence. Over 100 billion dollars in crypto has been permanently lost because the holder died without sharing their keys. But current dead man switches are broken: they broadcast your beneficiaries' addresses on public explorers, and if your keys are compromised, you can't even cancel them without getting frontrun. Cadence is the first self-custodial inheritance protocol that guarantees zero allocation leaks and zero gas-linkage."* |
| **0:30 - 1:15** | Vault Creation Flow (`/vault/create`) | *"Let's create a vault. Notice what happens when I add Alice at 40% and Bob at 60%. Cadence doesn't write their balances on-chain. Instead, our client encrypts their shares off-chain using their public keys with ECIES-secp256k1, and computes a 32-byte Merkle Root. On Sepolia Etherscan, observers only see an unreadable root hash. Beneficiaries receive their encrypted proofs directly."* |
| **1:15 - 1:55** | Pulse Dashboard & Heartbeat (`/dashboard`) | *"Here is the Pulse Dashboard with a live oscilloscope ECG monitor. As owner, I can send an on-chain heartbeat. Notice the toast: with ERC-4337, this check-in can be gaslessly sponsored by a paymaster. If I miss my check-ins, the protocol requires an M-of-N guardian quorum before any window opens."* |
| **1:55 - 2:30** | Contest Window & EIP-712 Stealth Cancel (`/contest`) | *"Now, suppose an attacker tries to grief my locker or I'm temporarily incapacitated. The 72-hour Contest Window opens. Even if an attacker drains all ETH from my main wallet, I am protected. I sign an off-chain EIP-712 cancellation typed digest. Any relayer can broadcast this without a single wei coming from my wallet — instantly restoring my vault to Active status."* |
| **2:30 - 3:00** | Claim Portal & Conclusion (`/claim`) | *"Finally, when a locker finalizes, beneficiaries connect their wallet to the Claim Portal. Alice generates her Merkle proof client-side and claims her exact 40% share in one atomic transaction. Cadence is fully tested with 182 Foundry tests, verified on Sepolia, and ready for production."* |

---

## 7. Technical Accolades & Standard Compliance

- **EIP-712 (Typed Structured Signatures)**: Zero-gas-linkage stealth cancellation digests with domain separator replay protection.
- **ERC-4337 (Account Abstraction)**: Smart contract account sponsorship and user operation gas sponsorship for proof-of-life check-ins.
- **EIP-5564 (Stealth Addresses)**: Support for ephemeral stealth addresses, preventing on-chain linking between vault owners and beneficiary payouts.
- **Cryptographic Merkle Proofs**: Efficient $O(\log n)$ on-chain proof verification (`MerkleProof.verify`) saving gas and preserving absolute privacy.
- **ECIES-secp256k1**: Elliptic Curve Integrated Encryption Scheme providing asymmetric encryption using Ethereum native keypairs.
- **Multi-RPC Fallback Resilience**: 4-pool RPC client with automatic fallback across PublicNode, Sepolia.org, 1RPC, and Tenderly.
- **Multi-Cloud Production Topology**: Render web service with persistent disk backend + Vercel edge-optimized frontend.

---

## 8. Hackathon Submission Checklist

- [x] **Smart Contracts Verified on Sepolia**: All 7 contracts compiled, deployed, and verified with source code on Etherscan.
- [x] **Foundry Test Suite**: 182 / 182 unit and integration tests passing (`forge test`).
- [x] **Backend Test Suite**: 11 / 11 email notification and signature binding tests passing.
- [x] **Zero TypeScript Errors**: Clean `tsc --noEmit` build on frontend and backend.
- [x] **Next.js Production Build**: Clean static output bundle without build warnings.
- [x] **Interactive Judge Mode**: 1-click persona switcher and cryptographic architecture modal.
- [x] **Complete Documentation**: PRD, Architecture, Design System, Pitch Kit, and Handoff specifications.
