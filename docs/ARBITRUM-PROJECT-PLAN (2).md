# Cadence × Arbitrum Open House Singapore — Buildathon Plan

**Status:** Separate submission, kept alongside the existing 3rd-Web-Hack entry — same core protocol, new deployment target, new feature, new pitch angle. Do not merge this doc with the 3rd-Web-Hack kit's ARBITRUM-PROJECT-PLAN.md; they serve different judging criteria and different audiences.

---

## 1. Judging Criteria (design every decision below against these)

- **Smart contract quality** — best practices, logical/efficient structure, minimal security vulnerabilities
- **Product-Market Fit** — clear potential to attract and retain real users
- **Innovation and Creativity** — original approaches that push boundaries
- **Real Problem Solving** — applications addressing genuine market needs
- **Extra consideration**: projects integrating Paxos' USDG stablecoin
- **Deployment requirement**: must deploy on an Arbitrum chain (Arbitrum Sepolia, Robinhood Chain testnet, or another Arbitrum testnet) to qualify at all — TESTNET ONLY for this submission, no mainnet deployment
- **Prize structure**: 3 prizes total — at minimum 1 reserved for a Robinhood Chain project, at minimum 1 reserved for an Arbitrum project

**Compliance confirmed:** every feature in this plan, including the Cadence Streams live yield integration (Section 5), sits entirely on qualifying Arbitrum chain(s) with no cross-chain dependency. The yield engine's external call target (Aave v3) is itself deployed on Arbitrum Sepolia, not a separate network — the whole feature qualifies cleanly under the deployment requirement.

---

## 2. Strategic Positioning — Why Robinhood Chain + USDG Is the Right Target, Not Just a Checkbox

Robinhood Chain is a real, live Arbitrum Orbit L2 — public testnet since February 2026, mainnet since July 1, 2026 — purpose-built for tokenized real-world assets and standard-EVM-tooling compatible. Its native, default stablecoin is **USDG** (Paxos' Global Dollar), fully backed 1:1 by cash and Treasuries with monthly reserve attestations, and it already generates roughly 7% APY for holders via Robinhood Earn's Morpho vaults.

This is a genuine strategic fit for Cadence, not a bolt-on:

1. **Robinhood Chain's actual user base is Cadence's actual target persona.** Robinhood users are retail, long-term-holding, and largely not crypto-native by default — exactly who Cadence was designed around (someone thinking about family succession, not a DeFi power user). This directly strengthens the Product-Market-Fit and Real-Problem-Solving criteria, which weren't part of your original hackathon's scoring and need real pitch attention here.
2. **USDG integration is architecturally synergistic, not just an added token.** USDG is yield-bearing by design. This plugs directly into the existing **Cadence Streams** feature (emergency buffer + per-second vesting + compounding yield) — a USDG-denominated vault can reference real, live yield infrastructure instead of a modeled/simulated rate, which is a stronger, more honest claim than what the original 3rd-Web-Hack submission could make with a hypothetical "Aave v3 model."
3. **Two separate reserved prize slots are addressable with one deployment strategy.** Deploying identical contracts to both Robinhood Chain (reserved slot #1) and Arbitrum Sepolia/One (reserved slot #2) is cheap — same Solidity codebase, same Foundry tooling, just different RPC configs — and puts you in contention for both pools rather than one.

**Reframed pitch, one line:** *"Cadence secures regulated, yield-bearing family wealth for the next generation of retail investors — not speculative crypto for DeFi natives."*

---

## 3. What's Reused vs. What's New

**Reused, unchanged, from the existing Cadence build:**
- InheritanceVault, ProofOfLifeConsensus, GuardianRegistry, StealthAddressRegistry, BeneficiarySmartAccount contracts
- The full privacy architecture: Merkle-committed allocations, ECIES client-side encryption, stealth deposit addresses
- Contestable Claim (`cancelClaimWithSig`, EIP-712) — the gas-linkage-safe cancellation mechanism
- The Vault Pulse / Pulse design system and all five core UI screens
- The Cadence Streams engine (emergency buffer + linear vesting + circuit breakers)
- The 208/208 test suite, Slither/Mythril static analysis results

**New for this buildathon:**
- Dual-chain deployment: Arbitrum Sepolia/One + Robinhood Chain testnet
- USDG added as a first-class supported asset (alongside ETH/USDC/USDT/WBTC)
- Cadence Streams' yield source updated/extended to reference USDG's real yield mechanism where a vault is USDG-denominated, rather than only a modeled rate
- **Guardian Resilience: default 2-of-3 guardian ratio (not 2-of-2) plus a real guardian backup-nomination mechanism** — fixes a genuine single-point-of-failure where a dead/unreachable guardian could permanently brick a vault (see Section 6)
- Reframed pitch deck and README targeting retail/PMF language, not DeFi-native language
- Stretch: a Stylus (Rust/WASM) contract for gas-efficient cryptographic verification, as an Arbitrum-specific technical differentiator

---

## 4. Feature: Dual-Chain Deployment

**Target chains:**
- **Arbitrum Sepolia** (testnet, for the general Arbitrum-reserved prize) — testnet only; no mainnet deployment for this submission.
- **Robinhood Chain testnet** (for the Robinhood-Chain-reserved prize) — docs at the chain's developer documentation site; bridge test assets in via the Arbitrum Bridge per Robinhood Chain's documented onboarding flow.

**What changes technically:** RPC endpoint configuration in `contracts.ts` and Foundry deploy scripts, chain ID handling in wagmi config, and confirming Chainlink Automation and the Pimlico paymaster both have coverage on the target chain(s) before relying on them there — verify this explicitly rather than assuming parity with Ethereum Sepolia support. Both target chains are testnets; no mainnet deployment is planned for this submission.

**What does not change:** contract logic, the privacy architecture, the UI, the test suite. This is a deployment-target expansion, not a rewrite — treat it that way in scheduling; it should not eat significant build time relative to the features below.

---

## 5. Feature: USDG Integration

**Scope:** add USDG to the existing asset whitelist pattern (the same mechanism already supporting USDC/USDT/WBTC) — an ERC-20-compatible token, no new contract architecture required for basic support. This part is unconditional — build it regardless of what happens with the yield synergy below.

**The differentiated part — Cadence Streams yield synergy.** This is the single highest-leverage, highest-effort item in the whole plan, so it gets a real go/no-go gate rather than an open-ended "see how far we get."

**Confirmed target for the live integration attempt: Aave v3 on Arbitrum Sepolia**, not the originally-considered Robinhood Earn/Morpho route. Aave v3 has an official testnet market on Arbitrum Sepolia with its own dedicated public faucet for test tokens — a well-documented, widely-used deployment, not a newer/less-certain one. This is also a direct upgrade of the original submission's existing "modeled after Aave v3" language, from modeled to genuinely live, rather than a pivot to a different story.

**Deployment-requirement compliance, confirmed:** this satisfies the buildathon's "must deploy on an Arbitrum chain" requirement cleanly, with no cross-chain dependency. Both halves of the feature sit on the same qualifying chain — Cadence's own contracts deploy to Arbitrum Sepolia, and the yield engine's external call target (Aave v3's Pool contract) is also on Arbitrum Sepolia, since that's specifically where Aave's official testnet market lives. Nothing in this feature requires reaching outside Arbitrum to function.

**Terminology note for all pitch/README/UI copy:** this is lending, not staking — the locked principal is supplied to Aave's shared lending pool and earns a share of the interest borrowers pay, not bonded to secure a network. Use "earns interest" or "earns yield," never "staking," anywhere this feature is described. Plain-language version for the pitch: *"The portion of the inheritance that hasn't streamed out yet keeps earning real interest while it waits — like a savings account that pays out gradually instead of all at once."*

**Important scoping note:** Aave's testnet market supports a fixed set of assets (typically DAI, USDC, WETH, WBTC-style test tokens) — USDG is very unlikely to be one of them, since it's a newer, Paxos/Robinhood-specific stablecoin. The realistic integration shape is: **the yield engine calls into Aave using an Aave-supported testnet asset, while USDG remains the asset the vault itself holds and distributes to beneficiaries.** These don't have to be the same token for the integration to be genuinely live — but the pitch must describe this precisely (see the checkpoint's fallback/success framing below) rather than implying USDG itself is deposited directly into Aave.

**Confirmed mechanism (not just a target — this is the actual flow):** when a beneficiary claims and `streamingDuration > 0`, the unvested remainder is deposited into Aave v3 via `pool.supply(asset, amount, address(this), 0)` on the claim transaction itself — not held idle in the vault. The resulting aTokens grow in value on their own as real interest accrues; `claimStream()` reads the current `aToken.balanceOf` to determine the vesting base, and withdraws via `pool.withdraw(asset, claimableAmount, beneficiaryAddress)` directly to the beneficiary. Full function-level design in ARBITRUM-ARCHITECTURE.md's "Aave v3 Integration — Concrete Design" section — this section covers the go/no-go gate on top of that design, not a separate mechanism.

### Day 11 Checkpoint — Cadence Streams Live Yield Go/No-Go Protocol

Evaluated by end of Day 11 (see Section 9's schedule), against three convergence criteria — all three must pass to proceed with the live integration described above:

1. **Vault accessibility:** Aave v3's Pool contract is confirmed callable on Arbitrum Sepolia via its official testnet deployment, with test assets obtained from Aave's own testnet faucet — confirmed by actually depositing and reading back an aToken balance on testnet, not just by reading documentation.
2. **Accounting compatibility:** depositing principal into Aave and reading back the accrued aToken value integrates cleanly with Cadence Streams' existing per-second linear vesting math, without introducing rounding drift or accounting mismatches beyond a defined small tolerance — proven by a test that runs the full streaming lifecycle against the live Aave integration and checks the numbers reconcile.
3. **Gas cost:** the additional deposit/withdraw/read calls stay within a reasonable gas budget for a claim-related transaction (same spirit as the original build's ~300k gas ceiling for the balance-commitment verification) — a live yield integration that makes claiming prohibitively expensive on testnet defeats the point.

**If any criterion fails, execute the de-scope immediately — do not let it bleed into Day 12's pitch-rework time:**
- Keep Cadence Streams' yield calculation internal/modeled, exactly as in the original build, but **re-peg the modeled rate to USDG's real, published Robinhood Earn APY** (currently cited publicly around 7%) instead of the prior generic "Aave v3 model" reference — this keeps the claim honest and specific to USDG without requiring a live vault integration.
- State this plainly in the pitch: *"Yield is modeled on USDG's real, published Robinhood Earn APY. A live Aave v3 integration was evaluated and is next on the roadmap, not shipped in this submission."* This is a stronger, more credible position than an unqualified "yield-bearing" claim that a judge could poke at by asking to see the actual vault call.

**If all three criteria pass**, state the integration precisely: *"Cadence Streams' yield engine deposits idle principal into Aave v3's live Arbitrum Sepolia market, earning real, verifiable interest — while the vault itself holds and distributes USDG to beneficiaries."* Do not blur this into implying USDG is what's sitting inside Aave, unless testing in Prompt 12 specifically confirms USDG is supported on Aave's testnet market (verify this directly rather than assuming either way).

**Pitch framing (either outcome):** "Family wealth held in a regulated, redeemable, yield-bearing dollar — not volatile crypto — inherited exactly the same way: privately, safely, and reversibly if something goes wrong."

---

## 6. Feature: Guardian Resilience (fixes a real gap — a dead/unreachable guardian must not permanently brick a vault)

**The problem, stated plainly:** the original design used fixed M-of-N guardian consensus (2-of-2 in the actual submission). If a guardian dies, loses their keys, or becomes permanently unreachable — which is not a hypothetical, given the entire product's premise is "people die unexpectedly" — a 2-of-2 threshold makes quorum mathematically impossible forever. The vault becomes permanently unclaimable, even when the owner has genuinely died. This is a real single point of failure, not an edge case worth deferring.

**Fix 1 — Change the default guardian ratio to N > M (build this first, costs almost nothing).**
Default new vaults to 2-of-3 guardians rather than 2-of-2. The M-of-N Merkle attestation logic already supports any ratio — this is a default-value and UI-copy change, not new contract logic. Losing any single guardian still leaves enough for quorum. Update the Create Vault screen's guardian-setup step to suggest 3 guardian slots by default (2 required to attest), and update any documentation/pitch language that references "2-of-2" to the new default.

**Fix 2 — Guardian backup nomination (real feature, reuses the existing Beneficiary Backup-Claim Address pattern architecturally).**
Each guardian can nominate their own backup guardian in advance, mirroring the beneficiary-side backup-address mechanism already built into Cadence. If a guardian is confirmed unreachable after a defined waiting period, their nominated backup can attest in their place instead of the original guardian. Build this as:
- A `guardianBackup` mapping/registration function, callable only by the guardian themselves for their own slot — this must follow the same zero-custodial-trust invariant as the beneficiary backup-address feature: neither the vault owner nor other guardians can set or override a guardian's backup nomination on their behalf.
- A waiting-period + fallback-activation mechanism: if a guardian doesn't respond/attest within the normal attestation window, their nominated backup becomes eligible to attest in their place, without requiring the original guardian's cooperation (since the whole point is they may be unreachable, incapacitated, or deceased).
- Tests confirming: a backup can successfully attest after the waiting period elapses with no response from the original guardian; a backup cannot attest before the waiting period elapses (prevents premature bypass); and a guardian's backup nomination cannot be set or changed by anyone other than that guardian.

**Scope note:** Fix 1 is unconditional — do it regardless of time constraints. Fix 2 is real, scheduled work (see Section 8's build plan) but is the actual fix that matters for a genuinely resilient system; don't treat Fix 1 alone as sufficient, since 2-of-3 still fails if two of three guardians become unavailable. Both fixes belong in this Arbitrum submission's contracts specifically, since this is where the build is starting from going forward.

## 7. Feature (Stretch): Stylus Verification Contract

Arbitrum's buildathon brief specifically calls out **Stylus** — contracts written in Rust/C/C++ compiled to WASM, running alongside Solidity contracts on the same chain. This is worth building only if Sections 4–5 are solid first; it's a genuine differentiator but not required to qualify or to hit the reserved prizes.

**Proposal:** reimplement the Merkle proof verification (and the balance-commitment reveal/verify, if that survived Cadence's original Day 13 gate) as a Stylus contract in Rust, called from the existing Solidity vault the same way it currently calls `ProofOfLifeConsensus.sol` — same composable-primitive architecture, one piece swapped for a WASM implementation.

**Why this specifically, not just "use Stylus somewhere":** cryptographic verification is exactly where Stylus's gas-efficiency advantage over EVM bytecode is real and measurable, giving an honest, technical answer to "why Arbitrum/Stylus specifically" rather than a generic port. This directly targets the Innovation and Creativity criterion.

**Honest scope boundary:** if this doesn't converge cleanly, do not let it threaten the core submission — Sections 4–5 alone are a complete, qualifying, well-targeted entry. Treat Stylus the same way the original build treated the Pedersen commitment: attempt it, gate it, de-scope cleanly if it's not converging, and note it as "next" in the pitch rather than a half-finished feature in the repo.

---

## 8. Technology Stack Additions

| Layer | Addition |
|---|---|
| Deployment targets | Arbitrum Sepolia; Robinhood Chain testnet — testnet only, no mainnet |
| New asset | USDG (Paxos Global Dollar) — ERC-20, added to existing whitelist pattern |
| Yield reference (if pursued) | Aave v3's official Arbitrum Sepolia testnet market (live), or a rate pegged to USDG's real Robinhood Earn APY (fallback) |
| Stretch | Arbitrum Stylus (Rust, compiled to WASM) for a cryptographic verification contract |
| Unchanged | Solidity, Foundry, OpenZeppelin, Chainlink Automation, ERC-4337/Pimlico, viem/wagmi, Next.js frontend |

---

## 9. Three-Week Build Plan

**Week 1 — Dual-chain deployment, Guardian Resilience, and USDG integration**
- Days 1–2: Robinhood Chain testnet access is CONFIRMED (Chain ID 46630, RPC `rpc.testnet.chain.robinhood.com`, faucet live — see ARBITRUM-ARCHITECTURE.md's network parameters table). Double-check the exact block explorer URL and current faucet cooldown window directly before scripting around them, since minor details there weren't fully consistent across sources. Bridge test assets, deploy existing contracts unmodified to Robinhood Chain testnet as a smoke test. Confirm Chainlink Automation and Pimlico coverage on both target chains — do not assume parity with prior Sepolia (Ethereum) support.
- Days 3–4: Deploy to Arbitrum Sepolia. Run the existing test suite against both new deployments; fix any chain-specific issues (gas estimation differences, block time assumptions affecting the check-in/countdown logic, etc.).
- Day 5: **Guardian Resilience Fix 1** — change the default guardian ratio from 2-of-2 to 2-of-3 across contracts, Create Vault UI, and any pitch/docs language referencing the old ratio. Cheap, do this unconditionally.
- Days 6–7: **Guardian Resilience Fix 2** — build the guardian backup-nomination mechanism (Section 6): registration function restricted to the guardian's own slot, the unreachable-guardian waiting period, backup-activation logic, and the three required tests (backup succeeds after waiting period, backup blocked before it, no third party can set another guardian's backup).

**Week 2 — USDG integration, yield synergy, pitch rework**
- Days 8–9: Add USDG to the asset whitelist. Update the Create Vault UI's token selector. Write tests confirming USDG deposits, allocation, and claims work identically to existing supported assets.
- Days 10–11: Attempt the USDG/Cadence-Streams yield synergy (Section 5). **Day 11 is a hard checkpoint** — evaluate against the three named criteria and execute the de-scope immediately if any fail, per the protocol in Section 5. Do not let this run open-ended into Day 12.
- Days 12–13: Rework the pitch deck, README, and in-app copy for the retail/PMF framing (Section 2) and to reflect the new 2-of-3 guardian default — this is not cosmetic, it's targeting judging criteria the original submission didn't need to address.
- Day 14: If ahead of schedule, begin the Stylus verification contract (Section 7) as a clearly-scoped, gated attempt — set a go/no-go checkpoint similar to the original build's Day 13 protocol, so it doesn't threaten the core submission if it stalls.

**Week 3 — Testing, polish, submission**
- Days 15–17: Full integration testing on both deployed chains — the complete lifecycle (deposit, check-in, contest, cancel/finalize, claim, guardian backup activation) verified live on Robinhood Chain testnet and Arbitrum Sepolia, not just locally.
- Days 18–19: Static analysis pass (Slither/Mythril) against any new or modified contracts (Guardian Resilience, USDG integration, Stylus contract if built). Update documentation with real, verifiable results.
- Days 20–21: Record demo video showing both deployments, finalize submission materials, buffer for last-minute fixes. Do not schedule new features this close to deadline.

---

## 10. Pitch Narrative

- **Hook:** Retail investors are exactly the people most likely to lose crypto to death or lost access — and least likely to want a DeFi-native "dead man's switch" built for power users.
- **Reframe:** Cadence secures regulated, yield-bearing family wealth for the next generation of retail investors — not speculative crypto for DeFi natives.
- **Why Robinhood Chain:** deployed where the actual target user already is, not just wherever a hackathon defaults to.
- **Why USDG:** family inheritance held in a redeemable, regulated, yield-bearing dollar closes the "will my kids inherit something with predictable value" question that a volatile-asset vault can't answer as cleanly.
- **Smart contract quality:** point directly to the existing 208/208 test suite and Slither/Mythril results — carried over from the original build, not new claims.
- **Innovation:** the Contestable Claim mechanism (reversible via a stealth-key signature, no gas-linkage risk) plus, if built, the Stylus verification contract as an Arbitrum-specific technical answer.
- **Honest scope statement:** state plainly which yield claims are live integrations vs. modeled, and confirm explicitly in the pitch that this is a testnet-only submission — no mainnet deployment, no real funds at risk. This mirrors the same honesty discipline as the original build.

---

## 11. Submission Checklist

- [x] Contracts deployed and verified on Robinhood Chain testnet (Vault: `0x65d7646e9da74e4d537b3f11ebc32acf3a4fe38f`, USDG: `0x499fc59f8847f4922850e426fbf9e82d2beaf5e3`)
- [x] Contracts deployed and verified on Arbitrum Sepolia (testnet) (Vault: `0x07f9e3f0c0bb2d45300711d4f425917fa493525d`, USDG: `0x75ef6c3f8cfa9410c6d45924d96aa5b107f166fb`)
- [x] USDG added as a supported asset, tested end-to-end (10/10 in `USDGIntegration.t.sol` + live dual-chain payout verification)
- [x] Guardian Resilience: 2-of-3 default ratio live, backup-nomination mechanism built and tested (31/31 in `GuardianAttestation.t.sol` + live on-chain `attestAsBackup`)
- [x] Full lifecycle demonstrable live on at least one deployed chain (verified end-to-end on BOTH chains in `run-dual-chain-e2e.mjs`)
- [x] Slither/Mythril results current for any new/modified contracts (Slither 0.11.6 clean: 0 Critical / 0 High / 0 Medium; CEI hardened)
- [x] README updated with dual-chain setup instructions (Section 9 & Section 12 updated for Arbitrum Sepolia & Robinhood Chain testnet)
- [x] Pitch deck reframed for PMF/Real-Problem-Solving criteria, not just Innovation/Technical Feasibility (`docs/HACKATHON-PITCH.md`)
- [ ] Demo video shows the deployed product, not just localhost (to record by presenter prior to final submission)


---

## 12. Open Decisions

- **Whether to attempt Stylus at all** — genuinely optional; only pursue if Sections 4–5 are solid with a full week of runway left.
