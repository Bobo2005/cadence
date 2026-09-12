# BUILD-GUIDE.md — Step-by-Step: From Zero to Demo

## Before you write a single prompt

1. **Set up accounts/keys you'll need:**
   - A Sepolia wallet with test ETH (use a faucet — e.g. Alchemy's or Chainlink's Sepolia faucet).
   - A Pimlico account + API key (dashboard sign-up, create a Sepolia sponsorship policy).
   - An Etherscan API key (for contract verification).
   - A Chainlink Automation registration (you'll register your upkeep once the vault contract is deployed — do this during Days 3–4 of PROJECT-PLAN.md, not before).
2. **Put all docs in place first.** Copy the entire `/docs` folder (PRD.md, ARCHITECTURE.md, PROJECT-PLAN.md, MEMORY.md, HANDOFF.md, DESIGN-SYSTEM.md) into your repo root before running Prompt 1. Your AI agent should read these before generating any code — say so explicitly in your first message if it doesn't auto-load repo context.
3. **Read PROMPTS.md fully once** so you understand the sequencing logic (especially why Prompt 6 comes before Prompt 7) before you start pasting.

## The workflow, step by step

### Step 1 — Contracts first, always
Run Prompts 1–9 in order. Do not jump to frontend work before the core contracts (vault, consensus, guardian, stealth, contestable claim, allocation privacy) exist and have passing tests. The frontend has nothing real to call until this exists.

**After each contract prompt:** run `forge test` yourself and actually read the output — don't just trust the agent's summary. If tests fail, paste the failure back to the agent rather than proceeding.

### Step 2 — The Day 13 checkpoint (real decision point, not a formality)
Run Prompt 12 (shielded balance). When the agent reports back against the three criteria, make the actual call yourself — if it's borderline, run Prompt 13's de-scope rather than letting your team spend another day hoping it converges. This is the single highest-risk day in the schedule; treat it as a scheduled decision meeting with your team, not something to resolve solo mid-code.

### Step 3 — Beneficiary-side features (Prompts 14–15)
These matter as much as the owner-side privacy features for your pitch — don't let them slip because they feel secondary. Budget real days for them per PROJECT-PLAN.md's Week 2 schedule, not leftover time.

### Step 4 — Account abstraction (Prompt 16)
This needs your Pimlico API key and a live sponsorship policy before it will actually work end-to-end — set this up (dashboard, 10 minutes) before running the prompt, not during.

### Step 5 — Frontend, in design-system order (Prompts 17–19)
Build the Vault Pulse dashboard FIRST (Prompt 18) even though it's not first in the user's actual click-through flow — it's your hardest, most important visual, and you want maximum time to iterate on it, not build it last under time pressure. Wallet-connect and setup screens (simpler, lower-risk) can follow.

### Step 6 — Integration & wiring (Prompts 23–27)
Once contracts and UI screens both exist independently, run these in order: wallet connection infrastructure first (23), then contract clients and role detection (24), then wire each screen's dummy data to real reads/writes (25, 26), then the full sweep (27). Do not run the sweep early — it's meant to catch what the screen-by-screen prompts missed, so it only works as a final pass. Budget real time for this phase; wiring is where mismatched ABIs, wrong network configs, and stale contract addresses tend to surface, even when both halves worked fine in isolation.

### Step 7 — Security + polish (Prompt 21)
Run this with real time left before your deadline — Slither/Mythril findings sometimes require actual contract changes, not just documentation. Don't run this the night before submission.

### Step 8 — Production Deployment (Render + Vercel)
1. **Backend on Render**:
   - Push repository to GitHub.
   - Deploy as a Render Blueprint using the root `render.yaml`.
   - The `/health` endpoint serves uptime; configure persistent disk storage via `DATA_DIR` for production durability.
2. **Frontend on Vercel**:
   - Import the repository on Vercel (Set Root Directory to `frontend`, leave Build Settings at default).
   - Copy variables from `frontend/.env.production.example` into Vercel Environment Variables.
   - Vercel automatically deploys with multi-RPC failover pooling across 4 Sepolia nodes.

---

## Testing & Fast-Forwarding Timeouts Live

Testing heartbeat timeouts does NOT require waiting 30–90 days or hacking the smart contracts. Cadence natively supports rapid interval testing:

1. **Native UI Presets & 1-Click Vault Creation (`/vault/create`)**:
   - In vault configuration, select **`5 Min (Test)`** or **`10 Min (Test)`** for the Heartbeat Interval, and **`⚡ 5 Minutes (Fast Testing)`** for the Contest Window Grace Period.
   - Click **`[⚡ Authorize & Deploy (1-Click)]`**: All 5 operations (deployment, deposit, allocation tree, guardian quorum, and contest grace period) are confirmed in **1 single wallet signature** via `OneClickInheritanceVault.sol`.
   - Your newly deployed vault immediately enforces the 300s check-in frequency and 300s contest window on Sepolia.
2. **On-Chain Dashboard Interval & Contest Grace Adjustment**:
   - On [`/dashboard`](https://cadence-ebon-six.vercel.app/dashboard), click **`[⚡ Adjust Interval]`** next to `CHECK-IN INTERVAL:` to switch frequencies live on-chain.
   - On [`/contest`](https://cadence-ebon-six.vercel.app/contest), use the **`[⚡ Set 5m Test Grace]`** fast-testing button to instantly set a 5-minute challenge window for immediate claim testing.
3. **Triggering & Finalizing the Contest Lifecycle**:
   - **Heartbeat Timeout Lapses**: When the check-in timer reaches 0, the locker enters inactivity status (`Timeout Expired On-Chain: YES`).
   - **Notify Guardians via Email**: When the heartbeat lapses, the autonomous Sentinel daemon and client-side watchdog automatically dispatch **2 distinct, personalized email alerts** to **Guardian Node 1** and **Guardian Node 2** (as configured in [`/vault/create`](https://cadence-ebon-six.vercel.app/vault/create)) with direct on-chain contest links.
   - **Guardian Quorum Attestation**: Switch wallet to **Guardian Node 1** and click **`[⚡ Attest Lapse]`**. Switch wallet to **Guardian Node 2** and click **`[⚡ Attest Lapse]`**.
   - **Initiate Contest Challenge Window**: Once 2-of-2 guardian attestations are recorded on-chain, click **`[⚡ Trigger Contest Challenge Window]`** to transition state to `ClaimPending` (5m test grace or 72h).
   - **Contest Grace Period Concludes**: When the contest countdown reaches 0, click **`[⚡ Finalize Contest on Sepolia]`** directly from either [`/contest`](https://cadence-ebon-six.vercel.app/contest) or [`/claim`](https://cadence-ebon-six.vercel.app/claim).
   - **Payout Execution**: The vault transitions to `FINALIZED` (3) and the beneficiary immediately clicks **`[Execute Inheritance Claim]`** on [`/claim`](https://cadence-ebon-six.vercel.app/claim) to receive funds! If the allocation is encrypted, an intuitive **`[🔑 Unlock Allocation to Claim]`** prompt derives the in-memory key via wallet signature in 1 click. Both single-beneficiary (with OpenZeppelin zero-length Merkle proofs) and multi-beneficiary allocation trees claim smoothly.
4. **Pre-Staged Demo Script (`DeployDemoVault.s.sol`)**:
   - For live stage presentations where you want a vault pre-aged and sitting directly in the Contest Window, run:
     ```bash
     cd contracts
     DEMO_CHECK_IN_INTERVAL=180 DEMO_CONTEST_DURATION=900 forge script script/DeployDemoVault.s.sol:DeployDemoVault --rpc-url $RPC_URL --broadcast
     ```
   - Deploy 5–8 minutes before presenting so it is sitting live in `ClaimPending` when you step on stage.

## Daily discipline checklist (use every day, not just at big milestones)

- [ ] Update `docs/MEMORY.md` Session Log before ending the day.
- [ ] Fill out `docs/HANDOFF.md` if anyone else (including future-you) is picking this up next.
- [ ] Run the full test suite, not just the tests for what you built today.
- [ ] Check the day against `PROJECT-PLAN.md`'s schedule — if you're behind, decide now what gets cut, using the "explicitly out of scope" list in PRD.md as your cutting order (multi-chain, DeFi unwind, EAS short-circuit go first).

## Demo day script (rehearse this, don't wing it)

1. Show the Vault Pulse dashboard on a funded, active vault with the real-time ECG oscilloscope (30 seconds).
2. Show the **`[⚡ Adjust Interval]`** button to prove on-chain check-in frequency flexibility, or switch to the pre-staged short-interval demo vault sitting in the contest window (20 seconds).
3. Contest window is open — narrate the "private allocation, transparent settlement" framing with amber arrhythmia (20 seconds).
4. Show the **"RESET PROTOCOL: I'M ALIVE"** cancel action live: owner signs off-chain with EIP-712 stealth key, relayed with zero gas linkage to the owner (30 seconds).
5. If finalized, switch to Alice (`/claim`) and show client-side ECIES decryption + Merkle proof claim payout (20 seconds).
6. Close with the composable-primitive reframe line from PROJECT-PLAN.md's pitch narrative: *"We didn't just build an inheritance app — we built Proof-of-Life Consensus, a reusable on-chain primitive any protocol can plug into."*

Total: under 2 minutes, crystal clear, 100% genuine on-chain Sepolia execution.
