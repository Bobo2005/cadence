# PROMPTS.md — 20 Build Prompts for Your AI Coding Agent

**How to use this:** Paste these in order into your AI coding agent (Claude Code, Cursor, etc.), one at a time, waiting for each to complete and be reviewed before moving to the next. Each prompt assumes the agent has read `docs/MEMORY.md`, `docs/ARCHITECTURE.md`, and `docs/PROJECT-PLAN.md` — say so explicitly in your very first prompt if your tool doesn't auto-load project context.

Do not skip ahead or reorder — the sequence (especially Prompts 6→7) exists specifically to avoid a dependency trap that was already caught once during planning (see MEMORY.md).

---

### Prompt 1 — Project scaffolding
```
Read docs/PRD.md, docs/ARCHITECTURE.md, docs/MEMORY.md, and docs/PROJECT-PLAN.md in full before doing anything.

Scaffold this repository exactly matching the file structure in ARCHITECTURE.md:
- A Foundry project under /contracts with foundry.toml configured for Sepolia, and a .env.example listing required variables (RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, PIMLICO_API_KEY).
- A Next.js (App Router) project under /frontend with Tailwind configured using the design tokens in docs/DESIGN-SYSTEM.md as CSS custom properties in /frontend/styles/tokens.css.
- Install OpenZeppelin Contracts, Chainlink contracts, and set up the empty file structure for contracts, tests, and scripts as listed in ARCHITECTURE.md — empty stub files with just license/pragma headers, no logic yet.
Do not write any contract logic yet. Confirm the structure matches ARCHITECTURE.md exactly before finishing.
```

### Prompt 2 — Core vault contract (deposit, beneficiaries, check-in)
```
Implement InheritanceVault.sol per docs/ARCHITECTURE.md. For this prompt, build ONLY:
- Deposit function (accepts ETH and a whitelist of ERC-20 addresses per PRD.md's asset scope: ETH, USDC, USDT, WBTC).
- Beneficiary allocation storage as a placeholder uint256 mapping for now (this WILL be replaced with the allocationRoot Merkle commitment design in a later prompt — do not treat this as final).
- Owner check-in/heartbeat function that records last-active timestamp.
Write full Foundry unit tests for deposit and check-in in /contracts/test/InheritanceVault.t.sol. Do not implement claim logic yet — that depends on contracts we haven't built.
```

### Prompt 3 — Chainlink Automation integration
```
Add Chainlink Automation to InheritanceVault.sol (or a separate small contract if cleaner — your call, but document the choice in docs/MEMORY.md under Session Log). Implement checkUpkeep and performUpkeep per the AutomationCompatibleInterface, triggering when the owner's check-in timeout has elapsed. Write tests simulating time passing (use Foundry's vm.warp) and confirm upkeep triggers correctly at the boundary and not before it. Update docs/MEMORY.md's Session Log with what was built.
```

### Prompt 4 — Guardian Merkle commitment + M-of-N attestation
```
Implement GuardianRegistry.sol per docs/ARCHITECTURE.md: guardians are stored as a Merkle root (not a public list), and the contract verifies M-of-N attestations via Merkle proofs at claim-eligibility time. Write tests for: valid M-of-N attestation succeeding, below-threshold attestation failing, and an attempted attestation from a non-guardian address failing. This is a standalone contract — do not embed this logic directly in InheritanceVault.sol.
```

### Prompt 5 — Proof-of-Life Consensus as a standalone primitive
```
This is an architectural requirement, not optional: implement ProofOfLifeConsensus.sol as a STANDALONE contract per docs/ARCHITECTURE.md's Feature Spotlight C reasoning in PROJECT-PLAN.md. It should combine the timeout logic (Prompt 3) and guardian threshold logic (Prompt 4) behind a single interface (IProofOfLifeConsensus.sol) that InheritanceVault.sol calls — the vault must NOT contain this logic directly. States: Active, ClaimPending, Contested, Finalized (do not implement the Contested/cancel transition yet — that's Prompt 7, and depends on Prompt 6 first). Write tests confirming the vault correctly delegates to this contract rather than containing its own copy of the logic.
```

### Prompt 6 — Stealth address pipeline (BUILD THIS BEFORE PROMPT 7 — see MEMORY.md constraint #2)
```
Implement the EIP-5564 stealth address pipeline per docs/ARCHITECTURE.md: StealthAddressRegistry.sol on the contract side, and /frontend/lib/stealth.ts for client-side stealth meta-address generation and one-time stealth address derivation. Write a script (or test helper) that generates real stealth keypairs, since ALL subsequent Contestable Claim tests (Prompt 8) must sign with real stealth keys, not mock EOAs — this ordering is deliberate, documented in docs/MEMORY.md, and must not be skipped or reordered.
```

### Prompt 7 — Contestable Claim state machine + cancelClaimWithSig
```
Now implement the Contested/cancel transition in ProofOfLifeConsensus.sol, using the stealth keys from Prompt 6. Critical constraint from docs/MEMORY.md: the cancel mechanism MUST be cancelClaimWithSig(uint256 nonce, uint256 deadline, bytes calldata sig) using EIP-712 typed data and ECDSA.recover — NOT a direct msg.sender == stealthOwner check as the primary path (that can remain as a documented fallback only). Implement the CANCEL_CLAIM_TYPEHASH exactly as specified in docs/ARCHITECTURE.md / PROJECT-PLAN.md Feature Spotlight A. Write /frontend/lib/eip712.ts to build and sign this digest client-side using the stealth private key from Prompt 6.
```

### Prompt 8 — Contestable Claim tests (real stealth keys required)
```
Write comprehensive Foundry tests for the full Contestable Claim lifecycle in /contracts/test/ContestableClaim.t.sol: (1) claim triggers correctly after timeout + guardian threshold, (2) a valid cancelClaimWithSig signature from the real stealth key reverts the state to Active, (3) an invalid or wrong-signer signature is rejected, (4) a claim not cancelled within the window finalizes correctly. All signatures in these tests must come from the actual stealth keypair generated in Prompt 6 — confirm this explicitly in the test comments.
```

### Prompt 9 — Allocation privacy: Merkle allocationRoot + ECIES design
```
Replace the placeholder allocation mapping from Prompt 2 with the correct privacy-preserving design from docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Section 7: the contract stores ONLY bytes32 allocationRoot (a Merkle commitment) — never plaintext shares. Implement /frontend/lib/merkle.ts to build the allocationRoot from per-beneficiary (address, shareBps, salt) tuples, and /frontend/lib/encryption.ts to ECIES-encrypt each beneficiary's (shareBps, salt) to their wallet public key. Add the corresponding Merkle proof verification to the vault's claim function. Write tests confirming: a valid proof against allocationRoot unlocks the correct share, and a plaintext getStorageAt-style read of the contract reveals no allocation data (test this explicitly — it's the exact vulnerability this design exists to prevent).
```

### Prompt 10 — Off-chain 100%-sum validation in the creator UI
```
In the Create Vault frontend flow, implement client-side validation that all beneficiary allocations (in basis points) sum to exactly 10,000 (100%) BEFORE the Merkle tree is built and the vault deployment transaction is constructed. Per docs/ARCHITECTURE.md constraint #4, this check cannot happen on-chain since the contract never sees plaintext shares — it must be caught here or not at all. Show a clear inline error if allocations don't sum correctly.
```

### Prompt 11 — Beneficiary claim flow (decrypt + prove)
```
Build the beneficiary claim flow: connect wallet → check across all vaults for a matching encrypted allocation payload → decrypt locally using the connected wallet (via eth_decrypt or the EthCrypto pattern from docs/ARCHITECTURE.md) → recover (shareBps, salt) → generate the Merkle proof → submit to the contract's claim function once the vault is Finalized. Write an integration test (or a documented manual test script if a full integration test is impractical at this stage) covering the full decrypt-and-claim path.
```

### Prompt 12 — Shielded balance (Pedersen commitment) — DAY 13 GATED, ATTEMPT ONLY
```
Attempt BalanceCommitment.sol: store the vault's deposited amount as a Pedersen commitment rather than a plain uint256, with a reveal/verify function at claim time. This feature is subject to the Day 13 go/no-go protocol in docs/PROJECT-PLAN.md Feature Spotlight B — three criteria: (1) on-chain proof verification under ~300k gas, (2) client-side commitment/blinding-factor generation under ~3 seconds without freezing the browser, (3) no rounding/scalar-field mismatches in the reveal-and-claim flow. After implementing, explicitly test and report against all three criteria. If any fails, DO NOT keep debugging past this prompt — report the failure and move to Prompt 13 for the de-scope path.
```

### Prompt 13 — Day 13 de-scope path (only run if Prompt 12 failed any criterion)
```
Prompt 12's [criterion X] failed. Execute the documented de-scope from docs/PROJECT-PLAN.md Feature Spotlight B: replace BalanceCommitment.sol's commitment storage with standard transparent accounting (mapping(address => uint256) or standard vault storage), remove the reveal-and-verify step from the claim function, and update the frontend to display balances directly from contract reads instead of computing blinding factors. Update docs/MEMORY.md's Session Log to record this de-scope decision and the reason.
```

### Prompt 14 — Beneficiary Smart Account (ERC-4337) with recovery guardians
```
Implement BeneficiarySmartAccount.sol: an ERC-4337 smart account factory that provisions a lightweight account for each beneficiary at vault-setup time, with mandatory beneficiary-nominated recovery guardians (independent of the vault's own guardian set from Prompt 4). Implement the social-recovery function allowing nominated guardians to help restore access. Write tests for: successful provisioning, successful guardian-assisted recovery, and rejection of recovery attempts from non-nominated addresses.
```

### Prompt 15 — Beneficiary backup-claim address
```
Add a beneficiary backup-claim address feature: a beneficiary can pre-register a secondary address with its own delay/veto window (mirroring the Contestable Claim pattern), usable if their primary smart account becomes unreachable. This must be entirely beneficiary-controlled — do not implement any path allowing the vault owner or guardians to redirect a beneficiary's claim on their behalf; if you find yourself building that, stop and flag it, since it reopens the custodial trust risk this project exists to avoid.
```

### Prompt 16 — Pimlico paymaster integration (gasless check-ins)
```
Implement gasless check-ins using Pimlico via permissionless.js per docs/ARCHITECTURE.md. Use this exact pattern for the client:

import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { http } from "viem";

export const pimlicoPaymaster = createPimlicoClient({
  chain: sepolia,
  transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`),
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});

Wire this into the check-in button so the owner's check-in transaction is sponsored and requires no ETH in their wallet. Confirm this works against a Pimlico Sepolia sponsorship policy (I will provide the API key separately).
```

### Prompt 17 — Vault Pulse dashboard (design centerpiece)
```
Read docs/DESIGN-SYSTEM.md in full. Build the Vault Pulse Dashboard component (/frontend/components/VaultPulseDashboard.tsx) as the hero screen: an animated heartbeat/ECG line whose rhythm reflects vault state (steady=Active, quickening=approaching deadline, urgent=ClaimPending, flatline=Finalized), using the exact color tokens and typography rules from DESIGN-SYSTEM.md. Include the check-in button, time-remaining display, and guardian confirmation status. This is the single most important visual in the app — take the time to make the pulse animation feel genuinely alive, not a static icon.
```

### Prompt 18 — Contest window screen + beneficiary claim screen
```
Build the two remaining core screens per docs/DESIGN-SYSTEM.md: (1) Contest Window / Cancel screen — large countdown, prominent "I'M ALIVE" button wired to cancelClaimWithSig (never a direct transaction), plain-language copy explaining reversibility, and (2) Beneficiary Claim screen — allocation lookup, client-side decrypt display, claim button. Apply the anti-bridge-anxiety UI principles from DESIGN-SYSTEM.md throughout: preview steps before signatures, plain-language explanations of technical terms on first use.
```

### Prompt 19 — Judge Mode demo control
```
Build a Judge Mode panel (/frontend/components/JudgeModePanel.tsx), visually distinct per DESIGN-SYSTEM.md (clearly labeled demo banner), that on Sepolia testnet only lets a user simulate the full lifecycle in under two minutes: trigger simulated silence, fast-forward the countdown, auto-confirm guardians, open the contest window, and let the user choose to cancel or let it finalize, then claim. This should call real contract functions against a demo vault, not fake the UI — the underlying state changes must be genuine so a technical judge can verify it.
```

### Prompt 20 — Static analysis, docs, and final integration
```
Run Slither and Mythril against all contracts in /contracts/src and report findings — fix any critical/high findings before proceeding. Write the top-level README.md with setup instructions (contract deployment to Sepolia, frontend env vars, Pimlico policy setup), confirm all Foundry tests pass end-to-end, and do a final full-lifecycle manual test on Sepolia: deposit → check-in → simulate timeout → guardian confirm → contest window → cancel AND separately test finalize → beneficiary claim. Update docs/MEMORY.md's Session Log with final status and any known issues going into demo day.
```

---

### Prompt 21 — Fast Heartbeat Testing Presets & Production Deployment Readiness (Render + Vercel)
```
Read docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md.
Execute Phase 1 Production Deployment Readiness:
1. Backend (/notifications):
   - Add "build": "tsc", "start": "node dist/index.js", and move tsx to dependencies in package.json.
   - Create root render.yaml Blueprint for 1-click Render web service deployment.
   - Configure DATA_DIR persistence and auto-seed verified demo personas on fresh boot.
   - Enhance /health endpoint with uptime and add SIGTERM/SIGINT graceful shutdown handlers.
2. Frontend (/frontend):
   - Replace single-RPC transports in contracts.ts and wagmi.ts with Viem's fallback([...]) pooling 4 Sepolia RPCs.
   - Add 5 Min (Test) and 10 Min (Test) presets to CreateVaultForm.tsx.
   - Add an interactive [⚡ Adjust Interval] modal on VaultPulseDashboard.tsx calling InheritanceVault.setCheckInInterval() on Sepolia.
   - Create vercel.json with security headers and static asset caching.
   - Add checkBackendHealth() to handle Render cold starts gracefully.
   - Create .env.production.example with verified Sepolia contract addresses.
3. Validate:
   - Run npm run build and npm test in /notifications.
   - Run npx tsc --noEmit and npm run build in /frontend.
```

---

### Prompt 22 — Hackathon Top 1 UX: Sticky "Judge Fast-Track" Demo Bar & Interactive Cryptographic Architecture Modal
```
Read docs/DESIGN-SYSTEM.md and docs/ARCHITECTURE.md.
Execute Phase 2 Hackathon Top 1 UX:
1. Sticky "Judge Fast-Track" Demo Bar (/frontend/components/JudgeModeBanner.tsx):
   - 1-Click Persona Switcher: [Owner] | [Alice 40%] | [Bob 60%] | [Guardian 1] | [Guardian 2] | [Fresh Wallet].
   - Active Locker Selector: Toggle between Main Locker (90d) and Fast Demo Locker (5m).
   - 1-Click Test Faucet & Keys Drawer: Pre-funded test keys copy and faucet links.
   - "How It Works" Cryptographic Architecture Trigger.
2. Interactive Cryptographic Architecture Modal (/frontend/components/HowItWorksModal.tsx):
   - Step 1: Merkle Allocation Root + client-side ECIES encryption.
   - Step 2: Proof-of-Life Consensus Primitive + M-of-N guardian attestations.
   - Step 3: 72-Hour Contest Window & EIP-712 zero-gas stealth cancellation.
3. Live Sepolia Activity Feed & Transaction Toasts:
   - Interactive transaction notification toasts linking directly to https://sepolia.etherscan.io/tx/<hash>.
```

---

### Prompt 23 — Hackathon Submission Packaging & Pitch Assets
```
Execute Phase 3 Hackathon Packaging:
1. Master README.md:
   - Live Vercel web app link and Render API engine link.
   - Verified Sepolia smart contracts table with clickable Etherscan links.
   - 3-Minute Judge Walkthrough Guide with timecoded instructions.
2. Pitch Deck & Video Demo Script (/docs/HACKATHON-PITCH.md):
   - Problem statement, solution, innovation, and technical credibility.
   - 3-Minute live demo presentation script.
   - Judge Q&A cheat sheet.
```

