# PROMPTS.md — 20 Prompts for the Arbitrum Buildathon Update

**How to use this:** Cadence is already built. These prompts implement ARBITRUM-PROJECT-PLAN.md's changes on top of the existing codebase — dual-chain deployment, Guardian Resilience, USDG integration, the two checkpoints, and the pitch rework. Paste one at a time, in order, into your AI agent. Do not skip the two checkpoint prompts (12 and 15) — they exist specifically to prevent open-ended work from eating the schedule.

---

### Prompt 1 — Load context
```
Read docs/ARBITRUM-PRD.md, docs/ARBITRUM-ARCHITECTURE.md, docs/ARBITRUM-MEMORY.md, and docs/ARBITRUM-PROJECT-PLAN.md in full before doing anything. This is an UPDATE to an already-built, already-tested Cadence codebase — do not rebuild or modify any existing contract logic listed under "Reused, unchanged" in ARBITRUM-ARCHITECTURE.md. Confirm you understand the scope before proceeding to Prompt 2.
```

### Prompt 2 — Robinhood Chain access setup (values confirmed, verify live before use)
```
Robinhood Chain testnet access and Stylus support are already confirmed (see ARBITRUM-ARCHITECTURE.md's network parameters table): Chain ID 46630, RPC https://rpc.testnet.chain.robinhood.com, Arbitrum Nitro stack with Stylus enabled. Set up the RPC connection and wallet network config using these values.

Two details need a live check against current official docs before you rely on them, since sources gave slightly inconsistent answers: (1) the exact block explorer URL — verify whether it's a Robinhood-branded domain or the Blockscout instance at robinhoodchain.blockscout.com, and use whichever is actually current for contract verification later, (2) the faucet's current rate-limit cooldown window — confirm the exact hours before scripting any automated faucet requests. Obtain test ETH from the official faucet using the confirmed values. Report both confirmed details before proceeding.
```

### Prompt 3 — Bridge test assets and smoke-test deploy to Robinhood Chain
```
Bridge test ETH/assets into the Robinhood Chain testnet environment per their documented onboarding flow. Deploy the existing Cadence contracts UNMODIFIED to Robinhood Chain testnet as a smoke test — this confirms basic compatibility before any feature work happens on top of it. Report any deployment errors or incompatibilities found.
```

### Prompt 4 — Deploy to Arbitrum Sepolia
```
Deploy the existing Cadence contracts UNMODIFIED to Arbitrum Sepolia testnet. Run the full existing test suite against both new deployments (Robinhood Chain testnet from Prompt 3, and Arbitrum Sepolia). Confirm Chainlink Automation and the Pimlico paymaster both have coverage on both chains — do not assume parity with the original Ethereum Sepolia deployment; verify directly.
```

### Prompt 5 — Fix chain-specific issues
```
Report and fix any chain-specific issues surfaced by Prompt 4's test run — gas estimation differences, block-time assumptions in the check-in/countdown logic that don't hold on the new chains, or any other deployment-specific bugs. Do not change any contract logic beyond what's needed to fix these — this is compatibility work, not a feature addition.

While here, run a direct sanity check on the short-interval demo vault's Cadence Streams vesting ticker (see ARBITRUM-ARCHITECTURE.md's "Cadence Streams Yield — Chain Compatibility" note): Arbitrum's block.timestamp is sequencer-set and officially reliable only over hours, not minutes, which could matter specifically for a 2–5 minute demo interval. Deploy a short-interval test vault on both new chains and confirm the vesting math ticks smoothly and accurately in real time before relying on it for a live demo — don't just assume Ethereum Sepolia's behavior carries over.
```

### Prompt 6 — Guardian Resilience Fix 1: change default ratio
```
Change GuardianRegistry.sol's default guardian threshold from 2-of-2 to 2-of-3, per ARBITRUM-ARCHITECTURE.md's Guardian Resilience design. Update the Create Vault UI's guardian-setup step to default to 3 guardian slots with 2 required to attest. Update any documentation or pitch-facing copy that references the old "2-of-2" ratio. This should be a small, contained change — do not touch the M-of-N attestation logic itself, only the default parameter and related UI/copy.
```

### Prompt 7 — Guardian Resilience Fix 2: backup nomination registration
```
Add to GuardianRegistry.sol: registerGuardianBackup(address backup), callable ONLY by an existing guardian for their own slot, and guardianBackupOf(address guardian) as a public read. CRITICAL (see ARBITRUM-ARCHITECTURE.md constraint #2 and ARBITRUM-MEMORY.md): this must follow the same zero-custodial-trust invariant as the existing Beneficiary Backup-Claim Address feature — the vault owner or another guardian must have NO way to set or override a guardian's backup nomination. Write a test proving this: have the owner attempt to call this function on behalf of a guardian and assert it either reverts or has zero effect on that guardian's actual backup.
```

### Prompt 8 — Guardian Resilience Fix 2: waiting period and backup activation
```
Add the waiting-period and backup-activation logic to GuardianRegistry.sol: a registered backup can only attest (attestAsBackup or equivalent) after the original guardian has failed to respond within a defined window since the attestation period opened — never instantly. This is a real security requirement, not a formality (see ARBITRUM-ARCHITECTURE.md constraint #3): an instant fallback would undermine the entire purpose of the M-of-N threshold.

CONSISTENCY FIX (see ARBITRUM-ARCHITECTURE.md's "Consistency fix" note): Cadence Streams' pauseStreamWithGuardian also relies on guardian attestation via Merkle proof, and it currently has no path for a backup guardian to act if the original is unreachable — this is the same resilience gap, just at a second call site. Extend pauseStreamWithGuardian to accept an attesting backup guardian under the identical waiting-period rules you just built, reusing the same eligibility-check logic rather than duplicating it. Do NOT modify redirectStream — its existing use of the beneficiary's pre-registered backup-claim address is already correct and confirmed; leave it as-is.
```

### Prompt 9 — Guardian Resilience tests
```
Write the three required tests from ARBITRUM-ARCHITECTURE.md's Guardian Resilience section: (1) a backup successfully attests after the waiting period elapses with no response from the original guardian, (2) a backup attestation attempted before the waiting period elapses is rejected, (3) a guardian's backup nomination cannot be set or changed by the vault owner, another guardian, or any address other than the guardian themselves. Add a fourth test confirming the same backup-eligibility logic works correctly when called via pauseStreamWithGuardian, not just the main consensus attestation flow. All four must pass before moving on.
```

### Prompt 10 — USDG asset whitelist integration
```
Add USDG (Paxos Global Dollar) to the existing asset whitelist pattern already used for ETH/USDC/USDT/WBTC — no new contract architecture needed, treat it identically to the existing stablecoin support. Update the Create Vault UI's token selector to include USDG.
```

### Prompt 11 — USDG tests
```
Write tests confirming USDG deposits, beneficiary allocation, and claims work identically to the existing supported assets — deposit flow, allocation encryption/Merkle commitment, and the full claim flow, all using USDG as the deposited asset.
```

### Prompt 12 — DAY 11 CHECKPOINT: Build and test the on-claim Aave v3 integration
```
Implement the confirmed Cadence Streams / Aave v3 mechanism per ARBITRUM-ARCHITECTURE.md's "Aave v3 Integration — Concrete Design" section: when a beneficiary claims and streamingDuration > 0, the unvested remainder is deposited into Aave v3 on the claim transaction itself, not held idle. Specifically:
1. Add a minimal IAavePool interface exposing supply, withdraw, and the aToken's balanceOf. Look up Aave v3's real Pool contract address on Arbitrum Sepolia from Aave's official testnet documentation — do not hardcode a guessed address.
2. On the claim transaction (streaming path only): call pool.supply(asset, amount, address(this), 0) to deposit the unvested principal, receiving aTokens.
3. Replace the old accruedYield formula calculation with a read of aToken.balanceOf(address(this)) to determine the current principal-plus-interest total for vesting math.
4. On claimStream(): call pool.withdraw(asset, claimableAmount, beneficiaryAddress) to send the beneficiary's accrued share directly from Aave.
5. Confirm pauseStream, pauseStreamWithGuardian, and redirectStream do NOT need to touch Aave directly — they only need to gate/redirect the claimStream call itself. Keep this separation clean; do not add unnecessary Aave calls to the circuit-breaker functions.

Get real test assets from Aave's testnet faucet first. Evaluate the result against three criteria: (1) vault accessibility — confirm supply/withdraw/balanceOf all work correctly on Arbitrum Sepolia testnet, actually tested, not just read about, (2) accounting compatibility — a full-lifecycle test (deposit → time passes → partial claim → more time passes → full claim) confirms the vesting math reconciles correctly against the growing aToken balance within a small tolerance, (3) gas cost — confirm supply/withdraw calls stay within a reasonable gas budget (similar spirit to the original build's ~300k gas ceiling).

Also explicitly check and report: does Aave's Arbitrum Sepolia testnet market support USDG as a depositable asset? Almost certainly not — if so, this integration applies only to vaults denominated in an Aave-supported testnet asset (e.g. DAI-test, USDC-test); USDG-denominated vaults are handled separately in Prompt 13. Do not attempt to swap USDG into an Aave-supported asset — that adds unwarranted complexity for this timeline.

Report the outcome against all three criteria explicitly before proceeding to Prompt 13.
```

### Prompt 13 — Day 11 outcome: ship the asset-scoped design or de-scope
```
Based on Prompt 12's reported outcome:

If all three criteria passed: finish and test the integration so that vaults denominated in an Aave-supported testnet asset use the live Aave flow (supply on claim, balanceOf for vesting math, withdraw on claimStream), while vaults denominated in USDG specifically continue using the existing modeled formula, re-pegged to USDG's real published Robinhood Earn APY (currently cited publicly around 7%) rather than a generic prior reference. Write the pitch/README copy precisely: "Cadence Streams deposits unvested inheritance into Aave v3's live Arbitrum Sepolia market for supported assets, earning real, verifiable interest — USDG-denominated vaults use a modeled rate pegged to USDG's own published yield." Do not blur these into one claim.

If ANY criterion failed: skip the live Aave integration entirely for this submission. Keep Cadence Streams' yield calculation internal/modeled for all assets, pegged to USDG's real published Robinhood Earn APY, and state in the pitch that a live Aave v3 integration was attempted, evaluated, and is next on the roadmap — name which specific criterion didn't converge if asked.

Either way: update all code comments, README text, and in-app copy to accurately reflect whichever outcome occurred — do not leave stale language claiming a live integration if the fallback was taken, or vice versa. Update docs/ARBITRUM-MEMORY.md's Session Log with the outcome.
```

### Prompt 14 — Pitch and copy rework
```
Rework the pitch deck, README, and in-app copy for the retail/Product-Market-Fit framing per ARBITRUM-PROJECT-PLAN.md Section 10: "Cadence secures regulated, yield-bearing family wealth for the next generation of retail investors — not speculative crypto for DeFi natives." Update any copy still referencing the old 2-of-2 guardian ratio to reflect 2-of-3. State plainly and accurately: testnet-only deployment, the actual outcome of the Day 11 yield checkpoint, and the existing 208/208 test suite and Slither/Mythril results as evidence of Smart Contract Quality.

TERMINOLOGY CHECK: search all copy for the word "staking" in relation to Cadence Streams' yield mechanism and replace it — this is lending (supplying to Aave's pool, earning a share of borrower-paid interest), not staking (bonding to secure a network). Use "earns interest" or "earns yield" instead. Also explicitly state the deployment-compliance point in the README/pitch: the yield engine has no cross-chain dependency, since both Cadence's contracts and Aave's Pool contract are on Arbitrum Sepolia — state this plainly as a compliance fact, not a caveat.
```

### Prompt 15 — DAY 13 CHECKPOINT: Stylus go/no-go decision
```
Evaluate whether to attempt the Stylus verification contract per ARBITRUM-PROJECT-PLAN.md Section 7. Stylus support on both target chains is already confirmed (see ARBITRUM-ARCHITECTURE.md) — the only remaining gate is: are Sections on dual-chain deployment, USDG integration, and Guardian Resilience FULLY done and tested — not "mostly done" — by end of Day 13? Report your assessment explicitly. If not, skip Stylus entirely and say so in docs/ARBITRUM-MEMORY.md's Session Log — this is a legitimate, expected outcome, not a failure.
```

### Prompt 16 — Stylus verification contract (only if Prompt 15 gave a go)
```
Reimplement the Merkle proof verification logic as a Stylus contract in Rust, targeting whichever chain(s) were confirmed to support Stylus in Prompt 2 (Arbitrum Sepolia at minimum). Call it from the existing Solidity vault the same way ProofOfLifeConsensus.sol is already called — standard ABI-level contract calls, same composable-primitive pattern, one piece swapped for a WASM implementation. Write tests confirming the Stylus contract's verification results match the original Solidity implementation exactly.
```

### Prompt 17 — Full integration testing on both chains
```
Run the complete lifecycle end-to-end on BOTH deployed testnets (Robinhood Chain testnet and Arbitrum Sepolia): deposit (including a USDG-denominated vault), check-in, simulate timeout, guardian confirmation (including triggering the Guardian Resilience backup-activation path at least once), contest window, cancel AND separately finalize, beneficiary claim. Confirm every number and status shown matches real on-chain state on both chains, not just one.
```

### Prompt 18 — Static analysis pass
```
Run Slither and Mythril against all new or modified contracts (GuardianRegistry.sol's changes, the USDG whitelist addition, the Stylus contract if built) and report findings. Fix any critical/high findings before proceeding. Update documentation with the real, current results — do not carry forward the original build's results as if they cover the new code.
```

### Prompt 19 — Documentation and memory update
```
Update docs/ARBITRUM-MEMORY.md's Session Log with the final state of both checkpoints (Day 11 yield synergy outcome, Day 13 Stylus outcome), confirm the README accurately reflects the dual-chain deployment and setup instructions for both testnets, and confirm ARBITRUM-PRD.md's "Success Criteria" checklist items are all genuinely met — not just checked off.
```

### Prompt 20 — Demo video and final submission prep
```
Record a demo video showing the deployed product working live on at least one of the two testnets (ideally both), covering the full lifecycle from Prompt 17. Finalize all submission materials — pitch deck, README, contract addresses on both chains, links to verified contracts on the relevant block explorers. Do a final check that nothing in the submission materials overclaims anything (mainnet readiness, audit status, live yield integration if the fallback was actually taken, Stylus if it was skipped) — this submission's credibility rests on the same honesty discipline as the original build.
```
