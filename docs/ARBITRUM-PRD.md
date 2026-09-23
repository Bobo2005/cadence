# ARBITRUM-PRD.md — Cadence × Arbitrum Open House Singapore Buildathon (Update, not a rebuild)

## Context
Cadence (the crypto inheritance protocol) is already built and tested — 208/208 tests passing, Slither/Mythril clean, full privacy architecture (Merkle-committed allocations, ECIES encryption, stealth addresses), Contestable Claim, Cadence Streams. This is a **separate submission** to a different buildathon, reusing that codebase and adding a scoped set of new features. Do not rebuild anything already working — see ARBITRUM-ARCHITECTURE.md's "Reused vs. New" list before touching existing contracts.

## Judging Criteria (this buildathon — different from the original hackathon's criteria)
- Smart contract quality (best practices, structure, minimal vulnerabilities)
- Product-Market Fit (real user potential)
- Innovation and Creativity (original approaches)
- Real Problem Solving (genuine market need)
- Extra consideration: Paxos USDG stablecoin integration
- **Hard requirement:** must deploy on an Arbitrum chain — TESTNET ONLY for this submission (Arbitrum Sepolia and/or Robinhood Chain testnet), no mainnet
- Prize structure: 3 prizes, at minimum 1 reserved for Robinhood Chain, at minimum 1 reserved for Arbitrum

## What's New for This Submission
1. **Dual-chain deployment** — Arbitrum Sepolia + Robinhood Chain testnet (same contracts, no logic changes)
2. **Guardian Resilience** — fixes a real gap where a dead/unreachable guardian could permanently brick a vault under the original 2-of-2 design:
   - Fix 1: default ratio changed to 2-of-3
   - Fix 2: guardian backup-nomination mechanism (mirrors the existing Beneficiary Backup-Claim Address pattern)
3. **USDG integration** — added to the existing asset whitelist (ETH/USDC/USDT/WBTC → + USDG)
4. **USDG/Cadence-Streams yield synergy** — attempt a live reference to USDG's real yield infrastructure (Robinhood Earn/Morpho); gated by a Day 11 go/no-go checkpoint with a clean, honest fallback
5. **Pitch reframe** — retail/PMF-focused narrative ("regulated, yield-bearing family wealth for retail investors," not "crypto for DeFi natives")
6. **Stretch: Stylus verification contract** — Rust/WASM reimplementation of Merkle proof verification, gated by a Day 13 decision checkpoint

## Target Persona (unchanged from original, but now the pitch says so explicitly)
Robinhood Chain's own user base — retail, long-term-holding, not crypto-native by default — is a closer match to Cadence's original target persona than a typical DeFi-native Arbitrum audience. State this explicitly in the pitch; it wasn't necessary for the original hackathon's criteria but directly targets PMF and Real Problem Solving here.

## Non-Goals / Honest Limitations (carry forward from the original build, plus new ones)
- Testnet only — no mainnet deployment, no real funds, stated plainly in the pitch.
- Guardian Resilience Fix 2 does not solve the case of *all* nominated guardians and backups being simultaneously unreachable — state this as a known edge case, not a claimed full solve.
- The USDG yield synergy may end up modeled/pegged rather than a live vault integration, depending on the Day 11 checkpoint outcome — whichever it is, state it accurately, never imply a live integration that isn't there.
- Stylus contract, if built, may only be deployed on Arbitrum Sepolia if Robinhood Chain's Stylus support can't be confirmed — verify this before committing schedule time to it.

## Success Criteria (submission day)
- [x] **Contracts deployed and verified on both target testnets**:
  - Arbitrum Sepolia (`421614`): Vault `0x07f9e3f0c0bb2d45300711d4f425917fa493525d`, USDG `0x75ef6c3f8cfa9410c6d45924d96aa5b107f166fb`.
  - Robinhood Chain Testnet (`46630`): Vault `0x65d7646e9da74e4d537b3f11ebc32acf3a4fe38f`, USDG `0x499fc59f8847f4922850e426fbf9e82d2beaf5e3`.
- [x] **Guardian Resilience fully tested**:
  - Backup succeeds after waiting period (`test_resilience_1_backupAttestsAfterWaitingPeriodElapses`).
  - Backup blocked before waiting period (`test_resilience_2_backupAttestationBeforeWaitingPeriodRejected`).
  - No third-party override (`test_resilience_3_guardianBackupNominationZeroCustodialTrust`, `test_vaultOwnerCannotSetOrOverrideGuardianBackup`).
  - 31/31 tests passing in `GuardianAttestation.t.sol` + live on-chain `attestAsBackup()` execution.
- [x] **USDG integration tested end-to-end**:
  - Whitelist, deposit, Merkle allocation, state guards, and claims verified in `USDGIntegration.t.sol` (10/10 tests).
  - Live dual-chain testnet run reconciled exact 4,000 USDG (Alice 40%) and 6,000 USDG (Bob 60%) with 0 residual dust.
- [x] **Pitch materials reflect the retail/PMF reframe and state all yield/chain claims accurately**:
  - Framed around regulated family wealth preservation for retail investors (`docs/HACKATHON-PITCH.md`).
  - Stated testnet-only scope plainly (Arbitrum Sepolia & Robinhood Chain testnet).
  - Cleanly distinguished live Aave v3 flow from USDG 7.00% Robinhood Earn modeled yield without blurring claims.
  - Zero "staking" terminology; zero cross-chain bridge dependencies.

