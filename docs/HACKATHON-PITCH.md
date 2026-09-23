# Cadence — Hackathon Top-1 Submission & Pitch Kit

> **The self-custodial, trust-minimized inheritance protocol for Ethereum.**  
> Eliminating single-point-of-failure dead man switches with Merkle allocation commitments, M-of-N proof-of-life consensus, and gasless EIP-712 stealth recovery.

---

## 1. Executive Summary & 1-Line Hook

### The Reframed Hook (Product-Market Fit & Retail Wealth Preservation)
> *"Cadence secures regulated, yield-bearing family wealth for the next generation of retail investors — not speculative crypto for DeFi natives."*

### The Real-World Problem
Retail investors are precisely the demographic most vulnerable to losing cryptocurrency and tokenized real-world assets upon sudden death, incapacitation, or forgotten credentials—and least equipped or willing to operate complex, DeFi-native "dead man's switches" built for protocol power users. Traditional estate options present a lose-lose: pay exorbitant legal retainers ($2,000–$10,000+) to surrender private keys to centralized custodians, or use naive smart contracts that expose family allocations on public block explorers and dump lump-sums into vulnerable heir wallets.

Cadence solves this with zero custodial trust, zero public ledger leaks, zero gas-linkage attack surfaces, and automated streaming family trusts.

### Key Metrics & Highlights
- **Regulated & Retail-First**: First-class support for regulated, yield-bearing dollar assets like Paxos USDG alongside ETH, USDC, USDT, and WBTC.
- **100% Self-Custodial**: Assets remain strictly under owner control until cryptographic proof-of-life consensus concludes.
- **Client-Side Privacy**: Beneficiary allocations and percentage shares are encrypted off-chain via **ECIES-secp256k1**; only a 32-byte Merkle Root is stored on-chain. Zero public ledger leaks.
- **Resilient 2-of-3 Guardian Consensus**: Upgraded default **2-of-3 guardian consensus quorum** with zero-custodial guardian backup nomination (`registerGuardianBackup`), eliminating the single-point-of-failure of unreachable guardians.
- **Gasless Stealth Recovery**: Compelled or compromised owners can halt liquidation via an off-chain **EIP-712 typed signature** (`cancelClaimWithSig`) broadcast by any relayer with zero gas-linkage to the owner's address.
- **Cadence Streams (Asset-Scoped Yield Engine)**: Autonomous multi-generational streaming trust with linear per-second vesting, immediate emergency liquidity tranches, and guardian emergency circuit breakers (`pauseStream`, `redirectStream`).
  - **Live Aave v3 Market Interest**: Unvested inheritance in supported assets is deposited directly into Aave v3's Arbitrum Sepolia pool on claim.
  - **Paxos USDG Modeled APY**: USDG-denominated vaults earn a modeled 7.00% APY pegged directly to USDG's published Robinhood Earn yields.
  - **Deployment Compliance Fact**: The yield engine has **no cross-chain dependency**, since both Cadence's contracts and Aave's Pool contract are on **Arbitrum Sepolia**. This is a compliance fact ensuring atomic local settlement.
  - **Lending, Not Staking**: Cadence Streams supplies locked principal to Aave's shared lending pool to earn borrower-paid interest; assets are never bonded or locked into network staking.
- **Smart Contract Quality & Integrity**:
  - **Testnet-Only Scope**: Explicitly deployed and verified on **Arbitrum Sepolia** (Chain ID: `421614`) and **Robinhood Chain Testnet** (Arbitrum Orbit L2, Chain ID: `46630`), alongside Ethereum Sepolia (`11155111`). Zero mainnet deployment, zero real funds at risk.
  - **Comprehensive Verification**: Backed by **208 / 208 Foundry tests** (and an expanded total of **240 / 240 tests across 17 suites**), **11 / 11 automated security regression suites**, and clean **Slither (0 Critical / 0 High)** and **Mythril** automated static analysis reports.

---

## 2. The Problem & Market Need

Over **$100 Billion** in cryptocurrency is estimated to be trapped in inaccessible addresses due to unexpected death, medical incapacitation, or permanent key loss.

Existing approaches suffer from critical flaws:
1. **Custodial Trustees & Centralized Services**: Third parties can be subpoenaed, compromised, hacked, or censor transactions. Not your keys, not your estate.
2. **Naive Dead Man Switches**:
   - **Privacy Leakage**: Writing beneficiary addresses and token allocations to public smart contracts invites targeted extortion, phishing, and family disputes.
   - **False Positive Liquidation**: If an owner misses a single check-in due to a flight or hospital stay, all assets are permanently liquidated.
   - **The "Gas Linkage" Surveillance Trap**: If an attacker drains an owner's ETH to trigger inactivity, the owner cannot cancel the switch without funding the account — alerting the attacker and getting front-run.
3. **The Lump-Sum "Inheritance Dump" & Drainer Phishing Trap**:
   - Dumping 100% of an estate into an heir's wallet in a single transaction exposes the family fortune to instant liquidation if the heir's seed phrase is compromised or drained by phishing bots.
   - Conventional lockers sit completely idle and generate 0% yield.

---

## 3. The Cadence Solution: 4 Cryptographic Pillars

```
+---------------------------------------------------------------------------------------------------------+
|                                           CADENCE PROTOCOL                                              |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   PILLAR 1: MERKLE PRIVACY    PILLAR 2: CONSENSUS     PILLAR 3: RECOVERY     PILLAR 4: CADENCE STREAMS  |
|   +---------------------+    +--------------------+  +--------------------+  +------------------------+ |
|   | • 32-byte Root      |    | • Configurable     |  | • 72-Hour Safe     |  | • Linear Per-Sec Vest  | |
|   | • ECIES-secp256k1   | -> |   Heartbeat (90d)  |->|   Contest Window   |->| • 10% Emergency Buffer | |
|   | • Zero Public Leaks |    | • 2-of-3 Guardians |  | • EIP-712 Gasless  |  | • Live Aave / 7% USDG  | |
|   | • Offline Proof Gen |    | • Backup Nomination|  |   Stealth Cancel   |  | • Circuit Breakers     | |
|   +---------------------+    +--------------------+  +--------------------+  +------------------------+ |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

### Pillar 1: Merkle Allocation Commitment & ECIES Client Encryption
- The contract stores only `allocationRoot = keccak256(...)`.
- The owner generates leaves locally: `leaf = keccak256(abi.encodePacked(beneficiary, basisPoints, salt))`.
- Allocation amounts and Merkle sibling proofs are encrypted using each beneficiary's secp256k1 public key and dispatched via private notification channels.
- **Result**: Block explorers show only arbitrary 32-byte hashes. Zero observer knows who inherits what.

### Pillar 2: Proof-of-Life Consensus Primitive (Resilient 2-of-3 Guardians)
- Owners configure a pulse cadence (e.g. 90 days for standard lockers; 5 minutes for rapid testing).
- Any on-chain heartbeat resets the timestamp.
- If the interval elapses, inactivity must be attested by a **2-of-3 guardian consensus quorum** before entering contest.
- Guardians can designate secondary backups with zero custodial override by vault owners, ensuring a single unreachable guardian never permanently freezes a family vault.

### Pillar 3: 72-Hour Contest Window & EIP-712 Stealth Cancel
- Once inactivity is certified, zero funds move immediately. An immutable **72-hour contest window** opens.
- If the owner is alive or compromised, they sign an **EIP-712 typed digest** off-chain:
  ```solidity
  cancelClaimWithSig(vaultAddress, nonce, deadline, signature)
  ```
- Any third-party relayer broadcasts this transaction. **Zero ETH is required from the owner wallet**, completely defeating frontrunning and address-linkage surveillance.

### Pillar 4: Cadence Streams — Autonomous Streaming Trust & Anti-Drainer Circuit Breakers (Flagship)
- Transforms Cadence from a simple locker into an autonomous, yield-bearing family trust.
- Pays an immediate emergency liquidity tranche (e.g. 10% Day 1 buffer for immediate needs).
- Unlocks the remaining 90% continuously per-second with live 100ms real-time UI ticker precision.
- **Asset-Scoped Yield Engine**:
  - *"Cadence Streams deposits unvested inheritance into Aave v3's live Arbitrum Sepolia market for supported assets, earning real, verifiable interest — USDG-denominated vaults use a modeled rate pegged to USDG's own published yield."*
  - Unvested supported assets (USDC) are deposited directly into Aave v3 pool (`pool.supply`), track dynamic yield via `balanceOf`, and withdraw directly on `claimStream()`.
  - USDG-denominated vaults earn a modeled 7.00% APY pegged to Paxos USDG's published Robinhood Earn yield.
- **Anti-Drainer Circuit Breaker**: If an heir's wallet is compromised or drained, designated guardians (via Merkle proof) or backup addresses can trigger `pauseStream` and `redirectStream` to freeze outflows and redirect unvested streams to a safe cold hardware wallet.

### Competitive Matrix: How Cadence Stands Out

| Capability | Sarcophagus | Inheriti | Safe (HeirSafe / Zodiac) | Casa / Unchained | **Cadence Protocol** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Target User** | Crypto-native power users | Enterprise / Crypto-native | Safe multi-sig users | HNW concierge clients | **Retail Families & Long-Term Wealth Holders** |
| **Asset Execution** | Seed phrase / file decryption | Secret shard reconstruction | Full Safe ownership transfer | Legal / Multi-sig concierge | **Direct On-Chain Settlement (USDG, ETH, USDC)** |
| **Payout Structure** | Lump sum (manual) | Lump sum (manual) | 100% lump sum takeover | Fiat/Custodial transfer | **Per-Second Streaming Trust (Cadence Streams)** |
| **Anti-Drainer Defense** | ❌ None (heir drainer loss) | ❌ None | ❌ None | ⚠️ Customer support delay | **✅ Instant Guardian Pause & Cold Wallet Redirection** |
| **Yield on Unvested Funds**| ❌ 0% (Idle capital) | ❌ 0% | ❌ 0% | ❌ 0% | **✅ Live Aave v3 Lending / 7% Robinhood Earn Peg** |
| **Privacy Model** | ⚠️ Public on-chain | ⚠️ Hardware-dependent | ❌ Public mappings | ❌ Exhaustive KYC / identity doxxing | **✅ ECIES-secp256k1 + Blinded Merkle Trees** |
| **False-Positive Cancel**| Re-wrap tx | Manual login | Direct owner tx | Legal affidavit | **✅ EIP-712 Relayed Stealth Cancel (0 Gas Linkage)** |
| **Heir UX** | CLI / SARCO token | SafeKey hardware token | Web3 wallet required | Web2 portal | **✅ ERC-4337 Smart Accounts (Gasless Claims)** |

### Product-Market Fit & Retail Wealth Preservation Flywheel

- **Built-In Heartbeat Retention**: Protocol architecture requires recurring check-ins (30–180 days). Sentinel email daemons trigger consistent, high-intent user re-engagement without relying on speculative trading cycles.
- **Targeting Real Retail Holdings**: Tailored for Robinhood and Arbitrum retail users holding cash-equivalent stablecoins (USDG, USDC) and core blue chips, rather than speculative altcoins.
- **Multi-Player Viral Onboarding (1 Creator = 5 Users)**: 1 vault naturally brings in 3 guardians and multiple beneficiaries. Each vault creator virally seeds new prospective vault creators with near-zero CAC.
- **Sticky, Generational Capital**: Inheritance funds have 5-to-20 year time horizons; locked TVL remains sticky and interest-bearing, unaffected by market cycle volatility.
- **Urgent Market Need**: Directly protects the $100B+ in lost crypto via 1-Click self-custodial provisioning, eliminating $2,000–$10,000+ legal fees.

---

## 4. Live Verified Contracts & Multi-Chain Deployments

All contracts are compiled with Solidity 0.8.24 (Via-IR enabled) and deployed at deterministic addresses across three networks:

### A. Ethereum Sepolia (Chain ID: `11155111`)
| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **InheritanceVault (Standard 90-Day)** | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74#code) |
| **InheritanceVault (Demo 180s Stream)** | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1#code) |
| **ProofOfLifeConsensus** | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1#code) |
| **GuardianRegistry** | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863#code) |
| **StealthAddressRegistry (EIP-5564)** | `0x583eC2de840034478a61EF572cea2904bFD8671E` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x583eC2de840034478a61EF572cea2904bFD8671E#code) |
| **BalanceCommitment** | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC#code) |
| **BeneficiaryAccountFactory (ERC-4337)** | `0x30489c0f3566AF47b71867bc992408B91E500823` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x30489c0f3566AF47b71867bc992408B91E500823#code) |

### B. Arbitrum Sepolia (Chain ID: `421614`)
| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **InheritanceVault (Standard 90-Day)** | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74) |
| **InheritanceVault (Demo 180s Stream)** | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1) |
| **ProofOfLifeConsensus** | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1) |
| **GuardianRegistry** | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863) |
| **StealthAddressRegistry (EIP-5564)** | `0x583eC2de840034478a61EF572cea2904bFD8671E` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x583eC2de840034478a61EF572cea2904bFD8671E) |
| **BalanceCommitment** | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC) |
| **BeneficiaryAccountFactory** | `0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf) |

### C. Robinhood Chain Testnet (Chain ID: `46630`)
| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **InheritanceVault (Standard 90-Day)** | `0x043d02c39B86CAd83E1Bf05728D32d24f6289e74` | [View on Robinhood Explorer](https://explorer.testnet.chain.robinhood.com/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74) |
| **InheritanceVault (Demo 180s Stream)** | `0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1` | [View on Robinhood Explorer](https://explorer.testnet.chain.robinhood.com/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1) |
| **ProofOfLifeConsensus** | `0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1` | [View on Robinhood Explorer](https://explorer.testnet.chain.robinhood.com/address/0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1) |
| **GuardianRegistry** | `0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863` | [View on Robinhood Explorer](https://explorer.testnet.chain.robinhood.com/address/0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863) |
| **StealthAddressRegistry (EIP-5564)** | `0x583eC2de840034478a61EF572cea2904bFD8671E` | [View on Robinhood Explorer](https://explorer.testnet.chain.robinhood.com/address/0x583eC2de840034478a61EF572cea2904bFD8671E) |
| **BalanceCommitment** | `0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC` | [View on Robinhood Explorer](https://explorer.testnet.chain.robinhood.com/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC) |
| **BeneficiaryAccountFactory** | `0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf` | [View on Robinhood Explorer](https://explorer.testnet.chain.robinhood.com/address/0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf) |

---

## 5. Protocol Evaluation Guide (Evaluate in 3 Minutes)

The Cadence protocol supports standard Web3 wallet connections (MetaMask, Rabby, Coinbase Wallet) and pre-deployed Sepolia test lockers for rapid evaluation:

1. **Owner Pulse & Fast Interval Adjustment (`/dashboard`)**:
   - Connect your wallet as the vault owner.
   - Inspect the real-time oscilloscope ECG monitor (`62 BPM Steady`).
   - Click **`[⚡ Adjust Interval]`** on the hero rhythm card: select **`5 Min (Test)`** (300s) to update both the vault and `ProofOfLifeConsensus.sol` on-chain.
   - Click **`[Send Heartbeat Check-In]`** to renew the on-chain pulse.
2. **Guardian Inactivity Attestation (`/contest`)**:
   - Switch to a guardian account in your wallet.
   - After the 5-minute interval lapses without a check-in, review guardian attestation records and affirm inactivity.
   - Quorum consensus triggers `ClaimPending` and begins the 72-hour Contest Window; the ECG switches to an amber arrhythmia (`92 BPM Erratic`).
3. **Zero-Gas Stealth Cancellation (`/contest`)**:
   - While in `ClaimPending`, click **`[RESET PROTOCOL: I'M ALIVE]`**.
   - The owner signs an off-chain **EIP-712 typed digest** (`cancelClaimWithSig`).
   - Any relayer can broadcast the cancellation with **zero gas linkage** to the owner's account, instantly returning the vault to `Active` status.
4. **Beneficiary Claim Portal & Cadence Streams (`/claim`)**:
   - Connect as a beneficiary (e.g. Alice).
   - **Zero Raw Private Key Exposure**: Alice signs a Web3 wallet authorization message (`personal_sign` over deterministic salt `keccak256(sig)`). The 32-byte ECIES decryption key is derived strictly in memory.
   - Browser decrypts her allocation and verifies her Merkle proof off-chain.
   - Click **`[Execute Inheritance Claim]`**: Receives an immediate emergency liquidity buffer (e.g. 10% on Day 1).
   - **Continuous Streaming Allowance**: Unlocks remaining 90% linearly per second, with a live 100ms ticker displaying accrued ETH to 7 decimal places.
   - **Anti-Drainer Defense**: Beneficiaries and guardians can click **`[Pause Stream]`** or redirect to a safe cold hardware wallet if keys are compromised.

---

## 6. 3-Minute Hackathon Demo Video Script

| Timestamp | Video Screen Action | Narration Script |
| :--- | :--- | :--- |
| **0:00 - 0:30** | Landing Page + Oscilloscope Animation (`/`) | *"Welcome to Cadence. Over 100 billion dollars in crypto has been permanently lost because the holder died without sharing their keys. But current dead man switches are broken: they broadcast your beneficiaries' addresses on public explorers, and if your keys are compromised, you can't even cancel them without getting frontrun. Cadence is the first self-custodial inheritance protocol that guarantees zero allocation leaks and zero gas-linkage."* |
| **0:30 - 1:15** | Vault Creation Flow (`/vault/create`) | *"Let's create a vault. Notice what happens when I add Alice at 40% and Bob at 60%. Cadence doesn't write their balances on-chain. Instead, our client encrypts their shares off-chain using their public keys with ECIES-secp256k1, and computes a 32-byte Merkle Root. On Sepolia Etherscan, observers only see an unreadable root hash. We also enable Cadence Streams to turn this locker into an autonomous family trust with linear per-second vesting."* |
| **1:15 - 1:55** | Pulse Dashboard & Heartbeat (`/dashboard`) | *"Here is the Pulse Dashboard with a live oscilloscope ECG monitor. As owner, I can send an on-chain heartbeat. Notice the toast: with ERC-4337, this check-in can be gaslessly sponsored by a paymaster. If I miss my check-ins, the background Sentinel daemon alerts my guardians, and the protocol requires a resilient 2-of-3 guardian quorum before any window opens."* |
| **1:55 - 2:25** | Contest Window & EIP-712 Stealth Cancel (`/contest`) | *"Now, suppose an attacker tries to grief my locker or I'm temporarily incapacitated. The 72-hour Contest Window opens. Even if an attacker drains all ETH from my main wallet, I am protected. I sign an off-chain EIP-712 cancellation typed digest. Any relayer can broadcast this without a single wei coming from my wallet — instantly restoring my vault to Active status."* |
| **2:25 - 3:00** | Cadence Streams Claim & Anti-Drainer Demo (`/claim`) | *"Finally, when a locker finalizes, beneficiaries unlock their allocation in-memory with zero raw key inputs. Instead of a dangerous 100% lump sum that drainers can steal, Cadence Streams pays an immediate 10% emergency buffer and streams the remaining 90% per-second down to 7 decimal places. Unvested inheritance deposits into Aave v3's live Arbitrum Sepolia market for supported assets to earn real interest, while USDG vaults earn a modeled 7% pegged to Robinhood Earn. If the heir's wallet is compromised, guardians or backup addresses can hit the on-chain circuit breaker to pause the stream and redirect future payouts to a safe cold wallet. Cadence is verified on Arbitrum Sepolia and Robinhood Chain testnets with 240 passing Foundry tests and Slither/Mythril static analysis."* |

---

## 7. Technical Accolades & Standard Compliance

- **EIP-712 (Typed Structured Signatures)**: Zero-gas-linkage stealth cancellation digests and cross-chain attestation replay defense with domain separator protection.
- **Safe In-Memory Key Derivation**: Client-side ECIES private key derivation from Web3 wallet signatures (`keccak256(sig)`), eliminating raw private key inputs in UI forms.
- **ERC-4337 (Account Abstraction)**: Smart contract account sponsorship and user operation gas sponsorship for proof-of-life check-ins.
- **EIP-5564 (Stealth Addresses)**: Support for ephemeral stealth addresses, preventing on-chain linking between vault owners and beneficiary payouts.
- **Cryptographic Merkle Proofs**: Efficient $O(\log n)$ on-chain proof verification (`MerkleProof.verify`) saving gas and preserving absolute privacy.
- **ECIES-secp256k1**: Elliptic Curve Integrated Encryption Scheme providing asymmetric encryption using Ethereum native keypairs.
- **Multi-RPC Fallback Resilience**: 4-pool RPC client with automatic fallback across PublicNode, Sepolia.org, 1RPC, and Tenderly.
- **Multi-Cloud Production Topology**: Render web service with persistent disk backend + Vercel edge-optimized frontend.

---

## 8. Hackathon Submission Checklist

- [x] **Smart Contracts Verified on Sepolia**: All contracts compiled, deployed, and verified with source code on Etherscan.
- [x] **Foundry Test Suite**: **208 / 208 unit, integration, and security regression tests passing across 15 suites** (`forge test`).
- [x] **Backend Test Suite**: 18 / 18 Sentinel & notification tests (`npm test`) and 11 / 11 full security audit regression suites (`npm run test:security`).
- [x] **Cadence Streams Engine**: Autonomous per-second linear vesting, compounding idle yield, and on-chain emergency circuit breakers.
- [x] **Zero TypeScript Errors**: Clean `tsc --noEmit` build on frontend and backend.
- [x] **Next.js Production Build**: Clean static output bundle without build warnings.
- [x] **Safe In-Memory Key Derivation**: Zero raw private key inputs in the UI; in-memory derivation via Web3 wallet signatures.
- [x] **Authentic On-Chain Evaluation**: Native 5m/10m check-in presets on `/vault/create` and runtime interval adjustment on `/dashboard`.
- [x] **Complete Documentation**: PRD, Architecture, Design System, Pitch Kit, Project Submission, and Handoff specifications.
