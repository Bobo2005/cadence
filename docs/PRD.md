# PRD.md — Product Requirements Document

## Project
**Cadence** — Privacy-Preserving Multi-Signal Crypto Inheritance Protocol
Hackathon: 3rd-Web-Hack | Timeline: 23 days | Network: Ethereum Sepolia

## Judging Criteria (design every decision against these)
Innovation · Technical Feasibility · Uniqueness · Design

## Problem
Crypto assets are permanently lost when holders die or lose access, because:
1. Existing dead-man-switch tools trigger on a single signal (inactivity timeout) and cannot distinguish "dead" from "temporarily unreachable."
2. Guardian/heir lists are publicly exposed on-chain, making guardians a bribery/coercion target.
3. No tool supports active DeFi positions, only idle token balances.
4. No tool lets a beneficiary discover, verify, or safely claim their inheritance if their own wallet access fails.

## Target User (primary persona)
A long-term crypto holder with a meaningful balance and no formal succession plan — not crypto-native by necessity, thinking about family, wary of anything that feels like "one wrong click loses everything" (bridge-style anxiety).

## Core Product
A vault smart contract + web app where:
- Owner deposits funds, sets beneficiaries (with private, encrypted allocations) and guardians (privacy-preserving via Merkle commitment).
- Owner proves activity via periodic gasless check-ins.
- If checked-in periods lapse and guardians confirm, a **contestable claim window** opens (72h) — reversible by the owner via a signature, irreversible after.
- Beneficiaries privately discover and claim their allocation once finalized.

## UX Invariants: Human-Centric Design Philosophy
> *"It’s not about piling on more and more features — it’s about making the UX effortlessly simple so everyday users never get stuck or overwhelmed."*
- **Zero Crypto Jargon**: Plain-English actions ("Deposit with 1 Click", "Unlock Allocation", "Unlock Inherited Box") replace technical terminology like ECIES or Merkle roots.
- **Assisted QR Funding**: Dynamic QR codes for Coinbase, Binance, Kraken, and mobile Web3 wallets enable zero-password, FaceID-confirmed deposits without manual contract copy-pasting.
- **1-Click Atomic Deployment**: `OneClickInheritanceVault.sol` deploys, deposits, commits Merkle roots, and configures consensus in 1 single signature.
- **Zero-Password Claiming**: Grieving heirs connect their wallet, click "Unlock Allocation", and client-side Web Crypto handles derivation and decryption in seconds.

## MVP Feature Scope (all core, none optional — see ARCHITECTURE.md for build order)

| Feature | Why it's core |
|---|---|
| Vault deposit + beneficiary allocation | Base functionality |
| Check-in / heartbeat + Chainlink Automation | Base trigger mechanism |
| Guardian Merkle commitment + M-of-N attestation | Privacy + false-positive resistance |
| Proof-of-Life Consensus as standalone contract | Innovation/Uniqueness — composable primitive framing |
| Stealth deposit address (EIP-5564) | Owner identity privacy |
| Contestable Claim + `cancelClaimWithSig` (EIP-712) | Reversibility — flagship differentiator |
| Shielded balance (Pedersen commitment) | Balance privacy — subject to Day 13 go/no-go gate |
| Encrypted-to-beneficiary allocation (ECIES) + `allocationRoot` Merkle commitment | Allocation privacy, correctly enforced on-chain |
| Encrypted Vault Box & Heir Decryption Portal (Off-Chain Secrets: CEX, Seed Shards, Passwords, Wills) | Bridges off-chain legacy instructions via hybrid AES-256-GCM + ECIES on IPFS, decrypted in volatile RAM |
| RFC-6238 Live 2FA Google Authenticator Engine | Synchronized 6-digit TOTP generation in Heir Decryption Portal to bypass CEX 2FA |
| Assisted 1-Click QR Deposit Modal (Coinbase, Binance, Kraken, Mobile) | Zero password/API key funding via native FaceID/2FA on exchange apps |
| Safe In-Memory Key Derivation | Derives ECIES private seed via Web3 signatures without raw key UI inputs or disk persistence |
| Beneficiary Smart Account (ERC-4337) + recovery guardians | Solves beneficiary-side wallet loss (common case) |
| Beneficiary backup-claim address | Secondary fallback for wallet loss |
| Gasless check-ins (Pimlico paymaster) | Removes gas-as-adoption-blocker |
| Vault Pulse dashboard (heartbeat design motif) | Design centerpiece |
| Fast Heartbeat Testing Presets (5m/10m) & Interval Adjustment | Authentic on-chain evaluation without mock delays |
| Comprehensive Security Hardening & Regression Testing | Eliminates front-running, cross-chain replay, and claim blockage |
| Slither/Mythril static analysis pass | Technical credibility |

## Explicitly Out of Scope for MVP
Full ZK-SNARK guardian proofs, multi-chain deployment (BTC/XRP/Solana — roadmap only, see ARCHITECTURE.md), DeFi position unwinding, external legal/oracle death-record integration beyond a mock EAS attestation, mainnet deployment.

## Success Criteria (demo day)
- Full lifecycle demonstrable live on Sepolia in under 3 minutes via authentic wallet connections and fast interval presets: deposit → check-in → interval adjustment / silence → guardian confirm → contest window → stealth cancel or finalize → safe in-memory ECIES beneficiary claim & volatile RAM legacy box decryption.
- 100% automated test coverage passing: 257 Foundry contract tests across 19 suites, 40 dedicated secret box security tests, 8 RFC-6238 TOTP unit tests, 11 notification security regression suites, and live e2e integration tests.
- Zero critical or high findings from Slither static analysis.
- Pitch deck leads with the composable-primitive reframe, not just "another inheritance app."

## Non-Goals / Honest Limitations (state these proactively, don't let judges find them)
- Claim transactions themselves are visible on-chain (amount, addresses) — allocation and balance are private pre-claim, settlement is not. Framed as "private allocation, transparent settlement."
- A beneficiary who sets up zero recovery info and loses their wallet is unrecoverable — no protocol can fix this.
- Not audited; not for mainnet/real funds without a professional security audit and legal review.