# ARBITRUM-ARCHITECTURE.md — Cadence × Arbitrum Buildathon (Update)

## Reused vs. New (check this before touching any contract)

**Reused, unchanged:** InheritanceVault, ProofOfLifeConsensus, GuardianRegistry (base logic), StealthAddressRegistry, BeneficiarySmartAccount, the full privacy architecture (Merkle allocationRoot, ECIES encryption, stealth deposits), Contestable Claim (`cancelClaimWithSig`), the Cadence Streams engine's core mechanics (emergency buffer, per-second vesting, pause/resume, `redirectStream`'s backup-address usage), the existing test suite, Slither/Mythril baseline.

**New/modified for this submission:**
- Deployment config for two additional chains (Arbitrum Sepolia, Robinhood Chain testnet)
- `GuardianRegistry.sol` — default ratio change (2-of-2 → 2-of-3) + new backup-nomination functions
- `pauseStreamWithGuardian` — extended to accept an attesting backup guardian under the same waiting-period rules as the main consensus flow (see Guardian Resilience section below)
- Asset whitelist — add USDG
- Cadence Streams yield source — for Aave-supported testnet assets, streaming unvested principal is deposited into Aave v3 on Arbitrum Sepolia and earns real interest via aTokens; USDG-denominated vaults keep the modeled formula pegged to USDG's real published APY. See "Aave v3 Integration — Concrete Design" below. Full build sequencing and go/no-go gate in ARBITRUM-PROJECT-PLAN.md Section 5.
- New (stretch): a Stylus (Rust/WASM) contract for Merkle proof verification, gated by the Day 13 checkpoint (see ARBITRUM-PROJECT-PLAN.md Section 7)

## Critical Constraints for This Update

1. **Testnet only.** No mainnet deployment anywhere in this submission — Arbitrum Sepolia and Robinhood Chain testnet only. Do not add Arbitrum One mainnet config.
2. **Guardian Resilience Fix 2 must follow the same zero-custodial-trust invariant as the existing Beneficiary Backup-Claim Address feature.** A guardian's backup nomination can only be set by that guardian for their own slot — never by the vault owner or another guardian. If you find yourself writing a function that lets a non-guardian configure a guardian's backup, stop — that's the same class of bug caught earlier in the original build (see the original kit's ARBITRUM-MEMORY.md constraint #7 for the pattern this mirrors).
3. **Guardian backup activation requires a real waiting period, not an instant fallback.** The backup guardian only becomes eligible to attest after the original guardian has failed to respond within a defined window — an instant fallback would undermine the security the M-of-N threshold exists to provide.
4. **USDG integration uses the existing whitelist pattern.** No new contract architecture required — treat it exactly like the existing USDC/USDT support.
5. **The yield synergy claim must match what's actually built.** If the Day 11 checkpoint fails any criterion, the fallback (re-pegged modeled rate) must be reflected accurately in both code comments and pitch copy — never leave "Aave v3" or implied-live-integration language in place if the fallback path was taken.
6. **Stylus is CONFIRMED enabled on Robinhood Chain testnet**, not just Arbitrum Sepolia. Robinhood Chain runs on the Arbitrum Nitro stack with Stylus explicitly enabled — standard `cargo-stylus` tooling works against its RPC endpoint. This removes the earlier open question entirely; the Day 13 checkpoint's condition (b) is satisfied regardless of which chain the Stylus contract targets. See Deployment Targets below for confirmed network parameters. Two minor details (block explorer URL, faucet cooldown window) should be double-checked directly against current docs before scripting around them — sources found slightly different values than initially reported.

## Guardian Resilience — Contract-Level Design

```
GuardianRegistry.sol additions:
  - DEFAULT_THRESHOLD change: 2-of-2 → 2-of-3 (or configurable, defaulting to 2-of-3)
  - registerGuardianBackup(address backup) — callable ONLY by msg.sender acting as an existing guardian, sets backup for their own slot only
  - guardianBackupOf(address guardian) → address — public read
  - attestAsBackup(...) — callable by a registered backup ONLY after the original guardian's response window has elapsed with no attestation; verifies the waiting period on-chain before allowing the backup's attestation to count toward quorum
```

**Required tests:**
- Backup successfully attests after the waiting period elapses with no response from the original guardian
- Backup attestation attempted before the waiting period elapses is rejected
- A guardian's backup nomination cannot be set or changed by the vault owner, another guardian, or any address other than the guardian themselves

### Consistency fix: extend backup-guardian eligibility to Cadence Streams' circuit breaker

Cadence Streams' `pauseStreamWithGuardian` lets a "designated consensus guardian" freeze a draining stream via Merkle proof. As originally scoped, Guardian Resilience only covered the main `ProofOfLifeConsensus` attestation flow — meaning a dead/unreachable guardian's backup could attest to the owner's death, but **could not** step in to freeze a compromised beneficiary's stream. That's an inconsistency in a security feature: resilience shouldn't stop at the one function it was designed against first.

**Fix:** `pauseStreamWithGuardian`'s Merkle-proof-based guardian check must accept an attesting backup guardian under the same waiting-period rules already built for the consensus flow (Section above). This is a small extension of existing logic, not new architecture — the backup-eligibility check (`guardianBackupOf` + waiting-period verification) should be reusable across both call sites rather than duplicated.

**Confirmed correct, no change needed:** `redirectStream`'s use of a "pre-registered backup claim address" for the beneficiary side is exactly the Beneficiary Backup-Claim Address feature from the original build, applied correctly here. No action required — noted here as confirmed rather than assumed, so it doesn't get re-litigated later.

## USDG Integration — Contract-Level Design

Add USDG's token address to the existing whitelist mapping/array pattern already used for USDC/USDT/WBTC. No new deposit/withdrawal logic — USDG is a standard ERC-20 for Cadence's purposes at this integration level.

## Cadence Streams Yield — Chain Compatibility Confirmed, One Demo-Specific Caveat

The Cadence Streams yield formula (`accruedYield = remainingLockedEth × streamingYieldBps × effectiveElapsed / (10000 × 365 days)`) is pure Solidity math using `block.timestamp` deltas — it does not call any external protocol, so it requires zero changes to run on Arbitrum Sepolia or Robinhood Chain testnet.

**One caveat, relevant specifically to short-interval demo configs, not real vault durations:** on Arbitrum, `block.timestamp` is set by the sequencer's own clock per L2 block, not tied to the L1 block's timestamp. Arbitrum's own documentation states that timing assumptions should be considered reliable over hours, but not necessarily over minutes. This is irrelevant for a real vault's multi-day/month/year streaming duration, but worth a direct sanity test on the short-interval (2–5 minute) demo vault used for live presentations (see the original build's BUILD-GUIDE.md demo-day staging approach) — confirm the vesting ticker behaves smoothly on the new chain(s) before relying on it live, rather than assuming Ethereum Sepolia's timing behavior carries over exactly.

## Aave v3 Integration — Concrete Design (this is the actual mechanism, not just a checkpoint target)

**Confirmed flow:** when a beneficiary claims and `streamingDuration > 0`, the unvested remainder is no longer just tracked as a number inside the vault contract — it is deposited into Aave v3's Pool contract on Arbitrum Sepolia, where it earns real, live interest for as long as it remains unvested.

1. **On claim (streaming path):** the vault calls `pool.supply(asset, amount, address(this), 0)` on Aave's Pool contract, depositing the unvested principal and receiving aTokens in return. aTokens are not a fixed receipt — their balance grows on its own, block by block, as real interest accrues.
2. **Reading accrued value:** the vault checks `aToken.balanceOf(address(this))` to know the current principal-plus-interest total — this replaces the old `accruedYield` formula calculation entirely for supported assets. The vesting math then determines what fraction of that (growing) total the beneficiary is owed based on elapsed time.
3. **On `claimStream()`:** the vault calls `pool.withdraw(asset, claimableAmount, beneficiaryAddress)` — Aave converts aTokens back to the underlying asset and sends it directly to the beneficiary in one call, no manual unwrapping step.
4. **Circuit breakers stay simple:** `pauseStream` and `pauseStreamWithGuardian` only need to flip a flag blocking future `claimStream` calls — they do not need to interact with Aave. `redirectStream` only changes which address future `withdraw` calls send to. Aave's part of the system is untouched by either safety mechanism — a clean separation of concerns worth preserving in the implementation.

**Asset-scoping decision — do not force USDG through Aave:** Aave's testnet market almost certainly does not support USDG directly (too new, Paxos/Robinhood-specific). Rather than adding a DEX-swap step to convert USDG into an Aave-supported asset (real added complexity, slippage handling, another failure point, not worth it for this timeline), the scoping is:
- **Vaults denominated in an Aave-supported testnet asset (e.g. USDC-test, DAI-test):** use the live Aave integration above — genuinely earning real yield through real deposits.
- **Vaults denominated in USDG specifically:** keep the existing modeled formula, pegged to USDG's real published Robinhood Earn APY (per the Day 11 checkpoint's fallback framing) — do not attempt to route USDG through Aave.
This produces both a real, demoable live integration AND an accurate, honest USDG story, rather than forcing one mechanism to cover both and getting one of them wrong.

**Interface needed:** a minimal `IAavePool` interface exposing `supply`, `withdraw`, and the aToken's `balanceOf` — Aave v3's Pool contract address on Arbitrum Sepolia is publicly documented; do not hardcode a guessed address, look it up from Aave's official testnet deployment docs at build time.

**Testnet only, confirmed:** this entire integration targets Aave v3's Arbitrum Sepolia testnet market specifically, using test assets from Aave's own testnet faucet. No mainnet Aave deployment is touched anywhere in this submission.

## Day 11 Yield Synergy Checkpoint — Design Reference

See ARBITRUM-PROJECT-PLAN.md Section 5 for the full three-criterion protocol (vault accessibility, accounting compatibility, gas cost) that gates whether the Aave integration above ships or falls back to the modeled-rate approach. This section exists here only as the concrete mechanism; ARBITRUM-PROJECT-PLAN.md's checkpoint is the source of truth for the go/no-go decision itself.

## Day 13 Stylus Checkpoint — Design Reference

Only attempt the Stylus verification contract if Sections 4–6 of ARBITRUM-PROJECT-PLAN.md (dual-chain deploy, USDG, Guardian Resilience) are fully done and tested — not "mostly done" — by end of Day 13. Condition (b) from the original gate (Robinhood Chain Stylus support) is now CONFIRMED and no longer a blocker — see constraint #6 above. If built, it should reimplement Merkle proof verification only, called from the existing Solidity vault the same way `ProofOfLifeConsensus.sol` is already called — same composable-primitive pattern, one piece swapped for a WASM implementation. Standard ABI-level calls from Solidity into a Stylus contract; no unusual integration pattern required. Since Stylus works on both target chains, deploy it wherever the rest of that day's work is already happening — no need to pick one chain over the other for this reason alone.

## Deployment Targets

| Chain | Purpose | Notes |
|---|---|---|
| Arbitrum Sepolia | General Arbitrum-reserved prize | Confirm Chainlink Automation + Pimlico coverage before relying on them here |
| Robinhood Chain testnet | Robinhood-reserved prize | Confirmed developer access (see network parameters below); Stylus confirmed enabled |

### Robinhood Chain Testnet — Confirmed Network Parameters

| Parameter | Value |
|---|---|
| Network Name | Robinhood Chain Testnet |
| Chain ID | 46630 |
| RPC Endpoint | `https://rpc.testnet.chain.robinhood.com` (official); alternative providers: Alchemy, QuickNode, Chainstack, Dwellir |
| Currency Symbol | ETH |
| Block Explorer | Confirm exact URL directly before scripting contract verification — sources found both a possible custom domain and a Blockscout instance at `robinhoodchain.blockscout.com` |
| Faucet | Official web faucet dispenses testnet ETH (~0.01 ETH/request); confirm current rate-limit window directly (sources found differing values, roughly 12–24 hours per wallet) |
| Architecture | Arbitrum Orbit L2 on the Arbitrum Nitro stack, Stylus explicitly enabled |
| Stylus Tooling | Standard `cargo-stylus` (`cargo stylus check`, `cargo stylus deploy`) works directly against the RPC endpoint above |
