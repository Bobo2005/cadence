# Cadence Protocol — Comprehensive Buildathon Project Submission

---

## 📌 Elevator Pitch & Tagline

> **"Cadence secures regulated, yield-bearing family wealth for the next generation of retail investors — not speculative crypto for DeFi natives."**

**Cadence Protocol** is a self-custodial, zero-leak digital inheritance and estate planning protocol built for Arbitrum Sepolia and Robinhood Chain Testnet. It replaces fragile dead man's switches and centralized custodial trusts with a multi-signal Proof-of-Life consensus engine, client-side ECIES encryption, autonomous yield-bearing distribution streams (Cadence Streams) powered by production Aave v3 adapters and regulated stablecoins (Paxos USDG), and an end-to-end Encrypted Vault Box bridging off-chain accounts, password managers, and live ticking 2FA authenticators to heirs with zero disk persistence.

- **Live dApp (Vercel):** [https://cadence-ebon-six.vercel.app/](https://cadence-ebon-six.vercel.app/)
- **Live Notifications & Sentinel API (Render):** [https://cadence-notifications.onrender.com/health](https://cadence-notifications.onrender.com/health)
- **Core Deployments:** Arbitrum Sepolia (`421614`), Robinhood Chain Testnet (`46630`), Ethereum Sepolia (`11155111`)

---

## 💡 Inspiration & Problem Statement: Over $100 Billion in Trapped Wealth

Over **$100 Billion in cryptocurrency** is estimated to be permanently lost, trapped in inaccessible addresses due to death, sudden incapacitation, or lost keys. The core ethos of Web3 — *"not your keys, not your coins"* — creates a catastrophic blindspot: when a self-custodial asset holder dies, their digital wealth dies with them.

Today, holders face an impossible choice between two flawed models:

### 1. The Centralized Custodial Trap
Traditional estate trusts or centralized exchange custodians require surrendering private keys or multi-sigs to third-party institutions. This destroys self-sovereignty, incurs exorbitant probate fees (often 2–5% of estate value), introduces institutional bankruptcy risk (e.g., Celsius, FTX, Prime Trust), and permanently doxxe families through invasive KYC/AML procedures.

### 2. The Naive On-Chain "Guillotine" Switch
Existing decentralized dead man's switches suffer from four critical architectural failures:
- **Zero Privacy (The On-Chain Storage Leak):** Storing heir addresses and allocation percentages in plaintext public contract storage slots exposes family net worth to anyone calling `eth_getStorageAt` or viewing block explorers.
- **The Guillotine Timer (False Liquidation):** Simple countdown timers lack nuance. Hospitalization, off-grid travel, or a lost phone triggers irreversible, premature asset distribution before death is verified.
- **The Lump-Sum "Inheritance Dump" & Drainer Risk:** Dumping 100% of an estate into an heir's wallet in a single transaction makes grieving families immediate targets for phishing drainer bots and impulsive liquidation, while idle capital earns 0% yield.
- **The Off-Chain Estate Black Hole:** Real-world estates are not purely on-chain tokens. Heirs routinely lose access to centralized exchange balances (Coinbase, Kraken, Binance), password managers (1Password master keys), and cold storage seed shards because there is no secure, zero-knowledge way to pass credentials without exposing them in cloud plaintext. Furthermore, leaving passwords alone is useless because exchange logins are permanently blocked by Google Authenticator (2FA).

---

## 🛠️ What It Does: The 6 Pillars of Cadence

Cadence provides institutional-grade digital estate protection paired with human-centric, consumer-friendly UX:

### 1. Multi-Signal Proof-of-Life Consensus Engine
Instead of relying on a single countdown timer or third-party death certificates, Cadence combines:
- **Heartbeat Telemetry:** Periodic owner check-ins via standard transactions or gasless ERC-4337 Pimlico paymasters.
- **2-of-3 Guardian Quorum (`GuardianRegistry.sol`):** Trusted contacts attest on-chain to trigger the inheritance sequence, backed by non-custodial backup guardian nomination for institutional resilience.
- **72-Hour Contest Window:** An unforgeable grace period for living owners to contest accidental, unauthorized, or malicious claims.

### 2. Cadence Streams: Autonomous Yield-Bearing Vesting
- **No Lump-Sum Dump:** Upon activation, heirs receive an immediate emergency buffer (e.g., 10%) while the remaining 90% is streamed linearly per second over an agreed horizon (e.g., months or years).
- **Production-Ready Lending Yield (Never Staked):** Unvested principal integrates production-ready `IAavePool`/`IAToken` lending adapters (`InheritanceVault.sol`, evaluated against a high-fidelity `MockAavePool` on testnet, ready for Arbitrum One mainnet) alongside Paxos USDG vaults pegged to published Robinhood Earn yield (7.00% APY). Capital works for the family continuously rather than sitting idle. Unvested assets are supplied to lending pools, **never staked**.
- **Anti-Drainer Circuit Breaker:** If an heir’s wallet is compromised by a drainer bot, guardians or pre-registered backup addresses can call `pauseStream()` and `redirectStream()` to immediately halt outflows and re-route unvested assets to a secure cold wallet.

### 3. Zero Plaintext On-Chain Storage
Allocations, beneficiary addresses, and blinding salts are encrypted client-side using ECIES-secp256k1 and committed to the contract as an opaque 32-byte blinded Merkle root (`allocationRoot`). Family net worth, heir identities, and percentage splits remain completely invisible to block explorers and `eth_getStorageAt` queries.

### 4. Zero Gas-Linkage Stealth Cancellation
If a false alarm occurs, the living owner clicks `[RESET PROTOCOL: I'M ALIVE]` to generate an off-chain EIP-712 typed signature. Gasless relayers broadcast the reset transaction on the owner's behalf with zero gas paid by the owner, preventing blockchain forensics from linking the owner’s active wallet to the estate vault.

### 5. Arbitrum Stylus WASM Verification
Merkle allocation verification is implemented in Rust as an Arbitrum Stylus WASM contract (`stylus_merkle`), achieving sub-cent gas execution with bit-for-bit equivalence against OpenZeppelin Solidity standards.

### 6. Encrypted Vault Box with Live 2FA Authenticator & Assisted CEX Onramp
Cadence bridges off-chain digital estates with a two-phase architecture:
- **Funding Today (While Alive):** An Assisted 1-Click QR Deposit Modal generates dynamic QR codes for Coinbase, Binance, Kraken, and mobile Web3 wallets. The owner scans from their mobile exchange app and authorizes deposits via native FaceID/2FA. Zero exchange passwords or API keys are ever entered into Cadence.
- **Post-Mortem Heir Recovery (Tomorrow):** Benefactors seal exchange credentials, seed shards, and 2FA setup keys via hybrid AES-256-GCM + ECIES envelope encryption anchored on-chain. When finalized, the heir decrypts the box in browser RAM. An in-browser RFC-6238 TOTP Engine generates live, synchronized 6-digit Google Authenticator codes with 30-second countdowns, allowing the heir to bypass the 2FA lockout barrier with zero disk persistence.

---

## 🎨 User Experience & Human-Centric Design Philosophy

> *"It’s not about piling on more and more features — it’s about making the UX effortlessly simple so everyday users never get stuck or overwhelmed."*

Estate planning is an emotional and intimidating topic. When an everyday retail investor or a grieving heir arrives at Cadence, the last thing they want is cryptic cryptographic steps, confusing 20-word forms, or technical friction.

### 1. Zero Crypto Jargon in the UI
Instead of asking users to configure *"ECIES public key envelopes"* or *"asymmetric ciphertexts"*, we give them clean, plain English: **"Deposit with 1 Click"** or **"Unlock Inherited Box"**. Smart defaults guide them with intuitive presets (e.g. 5-minute testing for hackathon evaluation vs. 180-day production standard).

### 2. The Assisted QR / Deep Link instead of Manual Hassle
Users never need to copy-paste contract addresses or worry about network mismatches. They tap or scan with **Coinbase, Binance, Kraken, or mobile Web3 wallets**, native FaceID/TouchID confirms it, and it's done.

### 3. 1-Click Atomic Deployment
Behind the scenes, Cadence deploys an Aave-connected vault, sets up Proof-of-Life consensus, and registers guardians in **one single transaction** (`OneClickInheritanceVault.sol`). The user clicks once and their family is protected.

### 4. Zero-Password Claiming for Heirs
The heir never has to hunt for a master password or worry about lost passphrases. Connecting their wallet and clicking **"Unlock Allocation"** does all the math and decryption silently in the background in seconds.

---

## 🏗️ How We Built It: Technical Architecture & Stack

### Architecture Layers
- **Smart Contracts:** Solidity `^0.8.24` (InheritanceVault, ProofOfLifeConsensus, GuardianRegistry, OneClickInheritanceVault) & Rust (Arbitrum Stylus WASM `stylus_merkle`). Built and tested with Foundry.
- **Networks:** Arbitrum Sepolia (`421614`), Robinhood Chain Testnet (`46630`), Ethereum Sepolia (`11155111`).
- **Frontend:** Next.js 16 (App Router + Turbopack), React 19, TypeScript 5, Viem `^2.56.3`, Wagmi `^3.7.7`, TanStack Query `^5.102.8`.
- **Design System:** Custom Vanilla CSS "Pulse" Light Editorial Theme, dynamic SVG ECG oscilloscope rhythm (`62 BPM Steady` to `92 BPM Arrhythmia`).
- **Account Abstraction & Signatures:** ERC-4337 (Pimlico Paymaster), EIP-712 Typed Data, EIP-191 Personal Sign, ECIES-secp256k1.
- **Cryptography & Off-Chain Storage:** Web Crypto API (AES-256-GCM 256-bit + 12-byte IV), ECIES Key Wrapping, IPFS Pinning Gateway (`/api/secret-box/*`).
- **In-Browser TOTP Engine:** RFC-6238 Time-Based One-Time Password engine in browser RAM using Base32 decoding and dynamic HMAC-SHA1 truncation with live 30-second interval synchronization.
- **Notifications & Sentinel Daemon:** Node.js, Express `^4.21.2`, TypeScript `^5.7.2`, Viem multi-chain event watcher, Nodemailer SMTP / Resend API, strict EIP-712 binding verifier (`bindingVerifier.ts`).
- **DeFi & Stablecoin Yield Integrations:**
  - **Aave v3 Yield Architecture:** Production-ready `IAavePool` and `IAToken` interfaces in `InheritanceVault.sol` with dynamic supply/withdraw accounting, verified against a high-fidelity testnet harness (`MockAavePool`) and architected for canonical Arbitrum One mainnet deployment.
  - **Paxos USDG Yield Engine:** Modeled 7.00% APY compounding yield pegged directly to Robinhood Earn published APY on Robinhood Chain and Arbitrum Sepolia. Unvested capital is supplied to lending pools, **never staked**.

---

## 🧗 Challenges We Overcame

1. **The "Gas Linkage" De-Anonymization Trap:** Broadcasting cancellations from newly derived stealth addresses requires funding them with gas, creating an on-chain forensic link to the owner. We solved this with off-chain **EIP-712 typed signatures** (`CancelClaim`). Relayers broadcast the cancellation; the contract recovers the signer address via `ECDSA.recover` with zero owner gas spent.
2. **The On-Chain Storage Leak Trap:** Storing beneficiary allocations on-chain in public mapping slots exposes family net worth to `eth_getStorageAt`. We engineered a blinded Merkle tree structure where the contract stores only a 32-byte `allocationRoot`. Allocations and blinding salts are encrypted client-side via **ECIES-secp256k1**. `vm.load` audits in Foundry (`AllocationPrivacy.t.sol`) verify zero plaintext exposure.
3. **Single-Beneficiary vs. Multi-Beneficiary Merkle Parity:** In 1-heir vaults (`leaf == root`), standard Merkle libraries crash on empty proof arrays (`[]`). We engineered OpenZeppelin-compliant proof handling in both TypeScript and Solidity, verifying that an empty proof against a single leaf correctly validates against the root.
4. **Eliminating the "Paste Private Key" UI Anti-Pattern:** Requiring users to paste private keys for ECIES decryption is a severe security vulnerability. We engineered ephemeral key derivation: beneficiaries sign an ephemeral message (`personal_sign` over deterministic salt), derive the 32-byte ECIES key in browser memory, decrypt `{ shareBps, salt }`, and discard the key. Zero private keys are ever typed or stored.
5. **Multi-RPC Failover Under High Traffic:** High-frequency polling on public testnet RPCs triggers HTTP 429 rate limits and browser CORS blocks. We implemented Viem `fallback([...])` transports pooling independent CORS-enabled endpoints across Arbitrum Sepolia, Robinhood Chain, and Ethereum Sepolia with 6000ms request timeouts.
6. **The "Inheritance Drainer & Zombie Pulse" Dilemma:** A thief with stolen owner keys could make small transfers to indefinitely reset a dead man's switch ("zombie pulse"). Alternatively, compromising an heir's wallet allows drainer bots to steal a lump-sum inheritance instantly. We enforced strict intentional heartbeats (`checkIn()` only) to eliminate zombie pulses, and built **Cadence Streams** with guardian circuit breakers (`pauseStream` and `redirectStream`) to rescue unvested streams.
7. **The "Off-Chain Secret & Plaintext Exposure" Dilemma:** Real-world wealth involves off-chain accounts: centralized exchange portfolios (Coinbase, Kraken), master passwords (1Password), and cold storage seed shards. We built an end-to-end Client-Side Hybrid Encryption Engine (AES-256-GCM + ECIES). Benefactors encrypt credentials locally in browser memory before pinning to IPFS. The ciphertext CID and wrapped AES key are anchored immutably to `InheritanceVault.sol`. Heirs unwrap and decrypt strictly in volatile browser RAM upon finalized claim with zero disk or cookie persistence.
8. **The 2FA Authenticator Barrier & Password-Free CEX Funding Dilemma:** Passing exchange passwords to heirs is useless because logins are blocked by Google Authenticator (TOTP). Furthermore, forcing living users to type passwords or export API keys to fund their vaults creates severe attack surfaces. We separated the estate lifecycle into two distinct phases: for living owners, an **Assisted 1-Click QR Deposit Modal** enables instant transfers from Coinbase/Binance apps approved via native FaceID/2FA without entering passwords or exposing API keys. For post-mortem heir access, an in-browser **RFC-6238 TOTP Engine** generates synchronized 6-digit Google Authenticator codes live in RAM from an encrypted seed.
9. **Rigorous On-Chain Aave Truth:** When verifying Aave v3 on Arbitrum Sepolia, we discovered that Aave DAO does not maintain a canonical deployment on this testnet. Rather than asserting false claims, we engineered production-ready `IAavePool`/`IAToken` interfaces in `InheritanceVault.sol`, evaluated them against a faithful `MockAavePool` harness on testnet, and documented the exact mainnet migration path to Arbitrum One.

---

## 🏆 Accomplishments & Verification Metrics

- **Foundry Smart Contract Suite:** `257 / 257` tests passing across 19 test suites (`contracts/test/`).
- **Dedicated Secret Box Security Suite:** `40 / 40` security tests passing across 6 domains (`frontend/scripts/test-secret-box-security.mjs`).
- **RFC-6238 TOTP Engine Suite:** `8 / 8` tests passing verifying Base32 decoding, HMAC-SHA1 dynamic truncation, and zero-disk/network isolation (`frontend/scripts/test-totp.mjs`).
- **Heir Claim Decryption Flow:** `11 / 11` tests passing verifying end-to-end in-memory claim and secret box unwrapping.
- **Hybrid Cryptography Suite:** `16 / 16` tests passing for AES-256-GCM + ECIES key wrapping and 2FA preservation.
- **Slither Static Analysis (v0.11.6):** `0 Critical, 0 High, 0 Medium` vulnerabilities across 55 smart contracts.
- **Notification Security Suite:** `11 / 11` security regression suites passing covering rate limiting, timing-safe auth, XSS sanitization, and strict Zod validation.
- **Frontend Code Quality:** Strict TypeScript compilation and ESLint verification with `0 errors, 0 warnings` across all 108 source files.
- **Dependency Audits:** `0 vulnerabilities` on `npm audit` across both frontend and backend services.
- **Financial Compliance:** `0 instances of "staking"`; strictly lending.

---

## 🧠 What We Learned

1. **Applied Zero-Leak Cryptography:** Combining client-side ECIES-secp256k1 asymmetric encryption with double-hashed blinded Merkle trees enables smart contracts to enforce complex distribution logic without touching plaintext user data.
2. **Arbitrum Stylus WASM Composability:** Demonstrated seamless interoperation between Rust-compiled WASM contracts and Solidity contracts via standard EVM ABI calls on Arbitrum Nitro chains.
3. **Designing for Non-Crypto Heirs:** Inheritance tools must serve non-technical family members. In-memory key derivation and 1-click claim flows prove that institutional-grade privacy and effortless UX can coexist.

---

## 🚀 What's Next for Cadence

1. **Mainnet Deployment on Arbitrum One & Robinhood Chain:** Production deployment with formal verification of `ProofOfLifeConsensus.sol` and `GuardianRegistry.sol`.
2. **Multi-Asset & DeFi Yield Vaults:** Support automated streaming distribution of additional yield-bearing assets (e.g. native Aave aTokens, Lido wstETH).
3. **Cross-Chain Inheritance via Chainlink CCIP:** Monitor heartbeat vitality on Arbitrum while trustlessly orchestrating asset unlocks across Optimism, Base, and Ethereum.
4. **Passkey & WebAuthn Guardian Integration:** Enable non-technical guardians to attest to proof-of-life consensus using device biometrics (FaceID / TouchID) via WebAuthn without installing browser extensions.

---

## 📋 Verified Deployments

| Contract | Arbitrum Sepolia (`421614`) | Robinhood Chain Testnet (`46630`) | Ethereum Sepolia (`11155111`) |
| :--- | :--- | :--- | :--- |
| **Primary USDG Vault** | [`0x07f9e3f0c0bb2d45300711d4f425917fa493525d`](https://sepolia.arbiscan.io/address/0x07f9e3f0c0bb2d45300711d4f425917fa493525d) | [`0x65d7646e9da74e4d537b3f11ebc32acf3a4fe38f`](https://explorer.testnet.chain.robinhood.com/address/0x65d7646e9da74e4d537b3f11ebc32acf3a4fe38f) | [`0x043d02c39B86CAd83E1Bf05728D32d24f6289e74`](https://sepolia.etherscan.io/address/0x043d02c39B86CAd83E1Bf05728D32d24f6289e74#code) |
| **Paxos USDG Token** | [`0x75ef6c3f8cfa9410c6d45924d96aa5b107f166fb`](https://sepolia.arbiscan.io/address/0x75ef6c3f8cfa9410c6d45924d96aa5b107f166fb) | [`0x499fc59f8847f4922850e426fbf9e82d2beaf5e3`](https://explorer.testnet.chain.robinhood.com/address/0x499fc59f8847f4922850e426fbf9e82d2beaf5e3) | N/A (ETH Native) |
| **Consensus Engine** | [`0xe340662aad9cce18ffba38449e585fd8d7c78ae1`](https://sepolia.arbiscan.io/address/0xe340662aad9cce18ffba38449e585fd8d7c78ae1) | [`0x30454c1dc8d230665b2b6693c11937cc8af7f18b`](https://explorer.testnet.chain.robinhood.com/address/0x30454c1dc8d230665b2b6693c11937cc8af7f18b) | [`0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1`](https://sepolia.etherscan.io/address/0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1#code) |
| **Guardian Registry** | [`0xe09c19696990fc99c92f8eba070c36ba51cdade7`](https://sepolia.arbiscan.io/address/0xe09c19696990fc99c92f8eba070c36ba51cdade7) | [`0x2d3c214c54a01c13a1e17f1d4112ea95bb3549ee`](https://explorer.testnet.chain.robinhood.com/address/0x2d3c214c54a01c13a1e17f1d4112ea95bb3549ee) | [`0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863`](https://sepolia.etherscan.io/address/0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863#code) |
| **Demo 180s Vault** | [`0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1`](https://sepolia.arbiscan.io/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1) | [`0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1`](https://explorer.testnet.chain.robinhood.com/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1) | [`0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1`](https://sepolia.etherscan.io/address/0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1#code) |
| **Stealth Registry** | [`0x583eC2de840034478a61EF572cea2904bFD8671E`](https://sepolia.arbiscan.io/address/0x583eC2de840034478a61EF572cea2904bFD8671E) | [`0x583eC2de840034478a61EF572cea2904bFD8671E`](https://explorer.testnet.chain.robinhood.com/address/0x583eC2de840034478a61EF572cea2904bFD8671E) | [`0x583eC2de840034478a61EF572cea2904bFD8671E`](https://sepolia.etherscan.io/address/0x583eC2de840034478a61EF572cea2904bFD8671E#code) |
| **Balance Commitment** | [`0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC`](https://sepolia.arbiscan.io/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC) | [`0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC`](https://explorer.testnet.chain.robinhood.com/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC) | [`0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC`](https://sepolia.etherscan.io/address/0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC#code) |
| **Vault Factory** | [`0xac0f91C7d7c3537896248C42fc880F6DFF838622`](https://sepolia.arbiscan.io/address/0xac0f91C7d7c3537896248C42fc880F6DFF838622) | [`0xac0f91C7d7c3537896248C42fc880F6DFF838622`](https://explorer.testnet.chain.robinhood.com/address/0xac0f91C7d7c3537896248C42fc880F6DFF838622) | [`0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`](https://sepolia.etherscan.io/address/0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0#code) |
| **Beneficiary Factory** | [`0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf`](https://sepolia.arbiscan.io/address/0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf) | [`0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf`](https://explorer.testnet.chain.robinhood.com/address/0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf) | [`0x30489c0f3566AF47b71867bc992408B91E500823`](https://sepolia.etherscan.io/address/0x30489c0f3566AF47b71867bc992408B91E500823#code) |
