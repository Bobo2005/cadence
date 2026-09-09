# 3rd-Web-Hack — Project Plan

## Project Name
**Cadence** — Privacy-Preserving Multi-Signal Crypto Inheritance Protocol

## Judging Criteria (target every section below at these)
- **Innovation**
- **Technical Feasibility**
- **Uniqueness**
- **Design**

---

## 1. Problem Statement

Billions of dollars in crypto are permanently lost because holders die, become incapacitated, or lose access, with no reliable way to pass assets to heirs. Existing solutions fall into two broken categories:

- **Centralized services** (exchanges, custodians, lawyers) require trusting a third party with keys or estate documents — defeating the purpose of self-custody.
- **Existing decentralized "dead man's switch" tools** (Sarcophagus, DeadSwitch, FinalMessage, Bitcoin OP_CSV timelocks) rely on a **single signal: inactivity/timeout**. This has three unsolved flaws:
  1. **False positives** — the protocol can't distinguish "the owner died" from "the owner lost their phone in Peru for six weeks." A missed check-in triggers the same outcome either way.
  2. **Exposed guardians** — where guardian/heir-based recovery exists (e.g. Gnosis Safe delay modules, multisig setups), the guardian list and threshold are public on-chain, making guardians a direct target for bribery or coercion while the owner is still alive.
  3. **Static assets only** — every existing tool transfers idle tokens (ETH/ERC-20). None can unwind or claim active DeFi positions (staked assets, LP tokens, yield-bearing vaults) on behalf of beneficiaries.

**Nobody has combined multi-signal verification + guardian privacy + DeFi-aware payout into one protocol.** That combination is the gap this project fills.

---

## 2. Solution

A smart-contract vault that releases assets to beneficiaries only when a **threshold of independent, privacy-preserving signals** confirms the owner is actually gone — not just silent.

**Scope clarification — not a Safe-style everyday wallet.** Cadence is not a general-purpose multisig wallet like Gnosis Safe, and shouldn't be pitched as competing with one. Safe is built for everyday transactions with multiple signers approving each action; Cadence is a single-purpose vault that mostly sits untouched, holding assets specifically for inheritance, unlocking only for one event (owner going silent, verified via consensus). The realistic user pattern is complementary: someone uses a normal wallet (or a Safe) for daily crypto activity, and deposits a portion into Cadence specifically for succession planning. State this plainly in the pitch — it preempts an easy "how is this different from Safe" question and sharpens what Cadence actually is instead of leaving it ambiguous.

**Core mechanism — "Proof-of-Life Consensus":**
Instead of one trigger (timeout), the protocol requires **M-of-N signals**, verified together:

1. **Check-in timeout** — the baseline signal (owner signs a heartbeat tx on an interval, e.g. every 90 days).
2. **Guardian attestation** — a set of guardians (family, friends, lawyer) whose identities are hidden via a Merkle commitment while the owner is alive, revealed and verified only at claim time. This prevents guardians from being identified and targeted before the recovery event.
3. **External verified event (stretch goal)** — an oracle-fed attestation (e.g., a hash of a notarized death record, or an EAS attestation from a trusted registry) that can short-circuit the full timeout window, so genuine inheritance doesn't have to wait out the whole check-in period.

Claim executes only when the threshold logic resolves — e.g., *timeout AND 2-of-3 guardians confirm*, OR *a verified external event alone*.

**Unique value over existing tools:**
| Feature | Sarcophagus / DeadSwitch / FinalMessage | This Project |
|---|---|---|
| Trigger signal | Single (timeout only) | Multi-signal consensus (M-of-N) |
| Guardian/heir privacy | Public on-chain | Hidden via commitment until claim |
| Wrong-trigger recovery | None — timeout is final | **Contestable Claim** — owner can cancel with one signature during a grace window |
| Vault owner/balance privacy | Fully public | **Shielded Vault** — stealth deposit address + hidden balance until claim |
| Asset types supported | Static tokens only | Static tokens + DeFi position unwinding (stretch) |
| False-positive resistance | None | Built-in via guardian layer + contest window |

### Feature Spotlight A — Contestable Claim ("Return from the Dead")

Even with multi-signal consensus, a claim could still trigger wrongly (guardians collude or are wrong, oracle glitch, etc.). Existing tools treat a triggered claim as final. This project adds a safety layer:

1. When a claim is triggered (timeout + guardian threshold met), it does **not** release funds immediately — it enters a public **contest window** (e.g. 72 hours), visible on-chain.
2. If the owner is actually alive, the claim can be cancelled by proving continued control of the stealth key — see the cancellation mechanism below, which is signature-based rather than a direct transaction, to preserve the unlinkability guarantees of the Shielded Vault (Feature Spotlight B).
3. If no cancellation arrives before the window closes, the claim finalizes automatically and funds release to beneficiaries.

This reframes the protocol from "hope the trigger is right" to "the trigger is safely reversible" — directly answering the most commonly cited flaw in dead-man-switch tools (can't tell "dead" from "unreachable").

**Critical design flaw to avoid — the "Gas Linkage" trap:** if the owner cancels a claim via a direct transaction sent from their stealth address (`msg.sender == stealthOwner`), that stealth address needs ETH to pay gas. If the owner funds that gas from their primary wallet, the stealth address becomes permanently linked to their identity on-chain — completely defeating the unlinkability the Shielded Vault is built to provide. A naive `msg.sender`-only cancel function is a straightforward way to accidentally undo the entire privacy layer.

**The fix: signature-based cancellation (EIP-712 meta-transaction), not a direct transaction.**
- The contract verifies an off-chain ECDSA signature signed by the stealth private key, via `cancelClaimWithSig(uint256 nonce, uint256 deadline, bytes calldata sig)`.
- Anyone — a public bundler, paymaster, relayer, or the frontend itself — can broadcast the cancel transaction and pay the gas; the signer's identity is never exposed by a funding trail.
- The contract recovers the signer via `ECDSA.recover(digest, signature)`. If `signer == stealthOwner`, the claim state reverts from `ClaimPending` to `Active`.
- A direct `cancelClaim()` (callable only if `msg.sender == stealthOwner`) can remain as a fallback option, but the signature-based path is the one that actually preserves privacy and should be the default in the frontend.

**Contract architecture sketch:**
- **Vault state:** stores `address public stealthOwner` (set during vault deployment or initial stealth funding), plus an immutable `contestDeadline` timestamp while in `ClaimPending`.
- **EIP-712 digest:**
  ```solidity
  bytes32 public constant CANCEL_CLAIM_TYPEHASH =
      keccak256("CancelClaim(uint256 vaultId,uint256 nonce,uint256 deadline)");
  ```
- **Execution paths:** `cancelClaim()` (direct, fallback only) and `cancelClaimWithSig(...)` (gasless/unlinkable, the default path) — both resolve to the same state transition, verified against `stealthOwner`.

The vault contract itself doesn't need complex curve cryptography — it simply stores the stealth address as its owner and verifies signatures against it.

### Feature Spotlight B — Shielded Vault (Privacy Layer)

**Timeline note:** with a 23-day build window (not a 1-week sprint), the full version of this feature — stealth address *and* balance commitment — is realistically buildable, not just the scoped-down stealth-only version. Budget dedicated days for it rather than treating it as a rushed stretch goal (see Section 8).

**Important framing for the pitch:** on a public EVM chain, no protocol can make an address's history *fully* invisible forever — that requires dedicated privacy-chain infrastructure (Zcash, Aztec) built over years. Claiming "no one can ever see the address or balance" would not hold up under a judge's technical questioning. Instead, this project targets the two things that actually matter for inheritance privacy, using known, auditable primitives — not custom cryptography:

1. **Stealth deposit address (identity unlinkability)** — the owner funds the vault through a one-time stealth address (EIP-5564 pattern) rather than their known main wallet. Anyone scanning the chain sees a vault funded by a random address, not a link back to the owner's public identity.
2. **Shielded balance (amount privacy)** — the deposited amount is stored as a cryptographic commitment (e.g. Pedersen commitment) rather than a plain public number. The vault's existence is visible, but the amount held is not — until a beneficiary claims and submits a proof that the revealed amount matches the original commitment.

Combined with the guardian-identity commitment from Section 2, this gives the protocol a coherent, three-part privacy story:
- **Who owns the vault** → hidden via stealth address
- **How much it holds** → hidden via commitment
- **Who the guardians are** → hidden via Merkle commitment

All three are verifiable and trustless at claim time, without inventing new cryptography — keeping this feasible within a one-week build.

**Design note — resolving the tension with Contestable Claim:** Contestable Claim requires the `ClaimPending` state to be publicly visible so the owner can catch and cancel it in time. This does not conflict with Shielded Vault as long as the *visibility of the state* stays separate from the *identity of the owner*:
- The `ClaimPending` event is public, but doesn't reveal whose vault it is — that's fine, since the deposit was already made via a stealth address, not the owner's known wallet.
- The owner cancels using an EIP-712 signature from the same stealth-derived key used to fund the vault (`cancelClaimWithSig`, see Feature Spotlight A) — never a direct transaction from their main wallet, and never a direct transaction funded with gas from their main wallet, either. The signature can be relayed by anyone (frontend, relayer, paymaster), so the act of cancelling itself creates no on-chain funding trail back to the owner's identity.
- Optional: an opt-in off-chain notifier (email/Telegram bot tied to the vault ID, not a wallet address) alerts the owner when `ClaimPending` fires, so they aren't forced to poll the chain with an identifiable pattern.

In short: the contest window stays public, but nothing about how the owner monitors or cancels it — including how the cancel transaction gets its gas — should tie back to their real identity. Build this as one connected design decision, not two separate features bolted together.

**Day 13 Checkpoint — Shielded Balance Go/No-Go Protocol.** To prevent the balance-commitment cryptography from cutting into Week 3's frontend and Judge Mode work, this is a hard gate, not a soft "check in and see" — evaluated by end of day (18:00) on Day 13 against three convergence criteria, all three of which must pass:

1. **On-chain verification** — the Solidity contract successfully verifies a deposit commitment proof within standard Sepolia block gas limits (under ~300k gas).
2. **Client-side generation** — the frontend can compute the commitment and blinding factors in under ~3 seconds without freezing the browser thread.
3. **Claim flow consistency** — the reveal proof unlocks the exact balance with no rounding errors or scalar-field mismatches during claim tests.

**If any criterion fails, execute the de-scope immediately — do not let it drag into Week 3:**
- *Smart contract:* replace the commitment state variable (`bytes32 balanceCommitment`) with standard transparent accounting (`mapping(address => uint256) public balances` or standard ERC-20 vault storage); drop the cryptographic reveal-and-verify step from `claimInheritance()`.
- *Frontend:* eliminate the off-chain blinding-factor generation/storage pipeline; display balances directly from standard contract read calls.
- *Pitch deck and narrative:* reframe the privacy pillar around **identity-level privacy** — "Shielded identity via EIP-5564 stealth deposit addresses and Merkle-hidden guardians, with balance privacy specified as Phase 1 of the ZK roadmap." This keeps technical credibility fully intact for judging, rather than leaving half-implemented cryptography in the repo.

### Feature Spotlight C — Proof-of-Life Consensus as a Standalone, Composable Primitive

The single highest-leverage change to the project is architectural, not a new feature: split the consensus logic (timeout + guardian threshold + contest window) out of the vault contract into its **own standalone contract/interface** that the vault *calls*, rather than logic embedded directly in the vault. The vault becomes a reference implementation of the primitive, not the primitive itself.

This costs little extra build time over what's already planned, but changes the pitch fundamentally:

> "We didn't just build an inheritance app. We built a reusable on-chain primitive — Proof-of-Life Consensus — that any protocol can plug into: DAO succession planning, insurance payouts, dead-hand governance transfers. The vault is our reference implementation."

This is the difference between pitching a single-use app and pitching infrastructure — judges consistently remember and reward the latter. It directly strengthens Innovation, Uniqueness, and the Impact/Future Scope section of the deck, for architecture work that's mostly a refactor of what's already being built.

### Feature Spotlight D — Gasless Check-Ins (Account Abstraction)

The target user for this product is explicitly not crypto-native — someone thinking about their family, not someone comfortable holding ETH for gas. Requiring gas just to click "I'm alive" every 90 days is a real adoption blocker and an honest, demoable thing to fix:

- Sponsor check-in transactions via an ERC-4337 paymaster, so the owner never needs ETH in their wallet just to check in.
- This uses account abstraction as real functionality rather than decoration, directly strengthening Technical Feasibility (correct use of a modern EVM primitive) and Design (removes the single biggest UX friction point in the entire flow).

**Confirmed provider: Pimlico via `permissionless.js`.** Chosen over Alchemy's `aa-sdk`/Account Kit for Sepolia specifically:

| Metric | Pimlico (`permissionless.js`) — chosen | Alchemy (`aa-sdk` / Account Kit) |
|---|---|---|
| Frontend stack fit | Native `viem` extension, no external wrapper — works out of the box with custom smart accounts or SimpleAccount | Requires `@alchemy/aa-sdk`/Account Kit; heavier bundle, biased toward Alchemy-specific accounts |
| Sepolia reliability | Bundler (Alto) and Verifying Paymaster handle Sepolia gas spikes smoothly | High reliability, but Gas Manager policies occasionally require billing-tier setup even for testnets |
| Testnet sponsorship setup | Create a policy on the dashboard, paste `sponsorshipPolicyId`/API key directly into `createPimlicoClient` | Requires configuring an Alchemy Gas Manager policy linked to a specific Sepolia app ID |
| EntryPoint support | Full v0.6 and v0.7 support with typed user-operation builders | Full v0.6/v0.7 support, but migrating between them in Account Kit requires SDK version bumps |

**Implementation pattern (Days 14–15):**
```typescript
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { http } from "viem";

export const pimlicoPaymaster = createPimlicoClient({
  chain: sepolia,
  transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`),
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});
```

### Feature Spotlight E — "Judge Mode" Live Demo Control

A testnet-only control, exposed in the UI, that lets a judge drive the entire lifecycle themselves in under two minutes: simulate the owner going silent → countdown compresses to seconds → guardians auto-confirm → contest window opens → judge chooses to cancel ("I'M ALIVE") or let it finalize → beneficiary claims. Most hackathon demos are watched; letting the judge drive it is what gets remembered when they're scoring dozens of projects the same night. This exposes functions already being built — it's a UI/demo-flow addition, not new contract logic.

### Feature Spotlight F — Static Analysis Pass (Security Credibility)

Run Slither and/or Mythril against the contracts before submission and cite the tool and result (e.g. "zero critical findings — Slither") in the pitch deck. Cheap (roughly an hour of work) but a real credibility signal for judges scoring Technical Feasibility, who are often looking for any evidence of security consideration beyond "it works in the demo."

**Explicitly out of scope, even with 23 days:** full ZK-SNARKs, multi-chain deployment, DeFi unwind as core (stays stretch), external legal/oracle integrations beyond the mock EAS attestation already planned. These add risk without proportional judging payoff — resist stacking further once the above is locked in.

---

## 3. Gaps We Are Solving

1. **False-positive death detection** — timeout-only switches can't tell "dead" from "unreachable." We solve this with multi-signal consensus instead of relying on inactivity alone.
2. **Guardian/heir exposure risk** — publicly listed guardians and thresholds are an attack vector (bribery, coercion, social engineering) before the owner has actually died. We solve this with hidden commitments revealed only at claim time.
3. **No support for active DeFi positions in inheritance** — existing tools only move idle balances. We solve this (stretch goal) by making the vault DeFi-aware so it can unwind staked/LP positions as part of the claim flow.
4. **Slow/rigid trigger windows** — pure timeout-based tools force heirs to wait out the full inactivity period even when death is externally verifiable. We solve this by allowing a verified external event to short-circuit the timeout.
5. **No recovery from a wrongly-fired trigger** — every existing tool treats a triggered claim as final and irreversible, even if the owner is actually alive. We solve this with the Contestable Claim grace window and owner-cancel signature.
6. **Vault ownership and holdings are fully public** — a funded inheritance vault publicly links the owner's identity and exposes the exact balance held, making the owner and vault a visible target. We solve this with the Shielded Vault privacy layer (stealth deposit address + hidden balance commitment).
7. **No way for a beneficiary to discover or verify their inheritance** — existing tools assume the beneficiary already knows exactly what they're owed and how to get it; there's no on-chain lookup or claim flow. We solve this with a public allocation-lookup tool and a straightforward claim function (Section 7).
8. **No protocol handles beneficiary-side wallet loss** — if a beneficiary loses access to their own wallet, every existing inheritance tool leaves funds stranded at that address with no recovery path at all. We address this with a Beneficiary Smart Account (mandatory recovery guardians nominated by the beneficiary) plus a backup-claim address as fallback (Section 7) — built into the beneficiary onboarding flow by default, not left as an optional recommendation. Framed honestly: this solves the common cases (lost device, forgotten key), not the case of a beneficiary who sets up zero recovery info at all — no protocol can solve that, and we say so rather than overclaim it.

---

## 4. Features to Build

### Core (must-have for MVP)
- **Vault contract**: deposit ETH/ERC-20, define beneficiaries and allocation splits.
- **Check-in / heartbeat mechanism**: owner calls a function periodically to reset the inactivity clock.
- **Chainlink Automation integration**: watches the check-in timer on-chain, no server or cron dependency.
- **Guardian commitment layer**: guardians' addresses stored as a Merkle root (hidden), with a simple M-of-N attestation flow to confirm claim eligibility.
- **Claim flow**: beneficiaries submit proof (Merkle proof of guardian attestations + expired timeout) to unlock and withdraw funds.
- **Contestable Claim state machine**: `Active → ClaimPending → Contested/Finalized`, with an owner-only cancel function during the contest window.
- **"Vault Pulse" dashboard**: primary UI — a heartbeat-style live status view (green = active, amber = contest window with countdown + "I'M ALIVE" cancel button, red = finalized). This is the main design/UX centerpiece for the demo.
- **Shielded Vault privacy layer**: stealth deposit address (EIP-5564 pattern) so the vault isn't linkable to the owner's known wallet, plus a commitment-based hidden balance revealed only at claim. Promoted to core scope given the 23-day timeline.
- **Proof-of-Life Consensus as a standalone contract**: consensus logic (timeout + guardian threshold + contest window) built as its own interface the vault calls, not embedded logic — positions the project as a composable primitive, not a single-use app.
- **Gasless check-ins**: ERC-4337 paymaster (or session keys) sponsors check-in transactions so the owner never needs ETH in their wallet to prove they're active.
- **"Judge Mode" demo control**: testnet-only UI control that lets a judge drive the full lifecycle (simulate silence → countdown → guardian confirm → contest window → cancel or finalize → claim) live in under two minutes.
- **Beneficiary allocation lookup**: any wallet can connect and check whether it's listed as a beneficiary on any vault; the allocated share itself is stored encrypted to that beneficiary's wallet key, so only they can decrypt and view it — not other beneficiaries, guardians, or chain observers.
- **Beneficiary claim flow**: once a vault is `Finalized`, the listed beneficiary connects their wallet, the app detects and displays their claimable amount, and one signed transaction transfers their share.
- **Beneficiary Smart Account with mandatory recovery guardians**: an ERC-4337 smart account provisioned for each beneficiary at setup, with beneficiary-nominated recovery guardians (independent of the vault's own guardian set) — so social recovery is built into onboarding, not left as an optional recommendation. Promoted to core scope (see Section 7 for full reasoning).
- **Beneficiary backup-claim address**: a second, independent fallback — a beneficiary can pre-register a secondary wallet address with its own delay/veto window (mirroring the guardian/contestable-claim pattern), so a claim isn't stranded if even the smart account itself is unreachable. Promoted to core scope alongside the Smart Account, since together they form the actual solve for beneficiary-side wallet loss, not a stretch afterthought.
- **Notification service (off-chain, opt-in)**: a lightweight backend watches on-chain events and sends email alerts for three cases: (1) check-in reminder to the owner before their deadline, so a forgetful-but-alive owner doesn't accidentally trigger the consensus flow; (2) notice to a beneficiary when they're added to a vault, so they know an inheritance exists; (3) notice to a beneficiary when a vault they're on enters `ClaimPending`/`Finalized`, so they don't miss the actual claim window. Promoted to core scope — this closes a real gap (a beneficiary who never checks the app has no way to know they're owed something) rather than being a nice-to-have. See Section 7 for the privacy tradeoff this introduces and how it's scoped.
- **Frontend**: connect wallet, deposit, set beneficiaries/guardians, check in, view vault status, simulate claim.

### Stretch (nice-to-have, time permitting)
- **External verified-event short-circuit**: EAS attestation or oracle-fed "verified death record" hash that can bypass the timeout entirely.
- **DeFi-aware payout**: vault can call unstake/withdraw functions on a connected staking or LP position and distribute proceeds to beneficiaries automatically.
- **ENS support**: beneficiaries/guardians addressable by ENS name instead of raw addresses.

---

## 5. Technology Stack

| Layer | Tool |
|---|---|
| Smart contracts | Solidity |
| Wallet/account model | ERC-4337 (account abstraction) — required for gasless check-ins, not optional given Feature Spotlight D |
| Gas sponsorship | Pimlico paymaster via `permissionless.js` (confirmed provider) — native `viem`/`wagmi` integration, no opinionated SDK wrapper, full EntryPoint v0.7 support, testnet sponsorship policy set directly via the Pimlico dashboard |
| Meta-transaction signatures | EIP-712 typed-data signing + OpenZeppelin `ECDSA.recover` — used for `cancelClaimWithSig`, keeping the Contestable Claim cancel path relayable without exposing the stealth owner's gas-funding trail |
| Automation | Chainlink Automation (`AutomationCompatibleInterface`, `checkUpkeep` / `performUpkeep`) |
| Guardian privacy | Merkle tree commitments (OpenZeppelin `MerkleProof`) — simpler than full ZK-SNARKs for a 1-week build |
| Vault owner privacy (stretch) | Stealth addresses — EIP-5564 pattern |
| Balance privacy (stretch) | Pedersen commitment scheme (existing audited libraries, not custom crypto) |
| Allocation privacy | ECIES encryption to beneficiary's wallet public key (`eth_getEncryptionPublicKey`/`eth_decrypt` pattern or a library such as EthCrypto) for per-beneficiary payloads, plus a Merkle tree (`allocationRoot`) so the contract stores only a commitment, never plaintext shares — see Section 7 for the full data-structure design |
| Attestations (stretch) | Ethereum Attestation Service (EAS) |
| Security tooling | Slither and/or Mythril static analysis pass before submission |
| Network | Ethereum Sepolia (testnet) — confirmed choice: strong faucet accessibility, stable RPC, and confirmed compatibility with Chainlink Automation, ERC-4337 paymaster, and EAS |
| Frontend | React + Ethers.js / Wagmi + RainbowKit (wallet connect) |
| Dev tooling | Hardhat or Foundry, OpenZeppelin Contracts |
| Hosting (demo) | Vercel (frontend), verified contract on block explorer |

---

## 6. Multi-Chain Roadmap

**Why this needs its own section:** Bitcoin, XRP, and Solana are not EVM chains. The entire stack in Section 5 (Solidity, Chainlink Automation, ERC-4337) only runs on EVM-compatible chains. Bitcoin has no general smart contract layer, XRP Ledger uses its own logic (and a separate EVM sidechain), and Solana uses Rust/Anchor — a different language and programming model entirely. "Supporting" these natively means building and maintaining separate protocol implementations per chain, each with its own security review, not a token-list addition. This is scoped as a roadmap, not a hackathon deliverable, to keep the pitch honest under technical questioning.

**Phase 0 — Hackathon MVP (EVM-only, current 23-day scope):**
- ETH (native)
- Major stablecoins: USDC, USDT
- WBTC (wrapped Bitcoin, ERC-20) — gives honest Bitcoin-value exposure with zero architecture change, since it's just another ERC-20 to the existing vault contract.

**Phase 1 — First additional chain (near-term, post-hackathon):**
- Native Solana support, via a separate Rust/Anchor program implementing the same Proof-of-Life Consensus primitive (Section 2, Feature Spotlight C) as a parallel, chain-native implementation.
- Chosen first because of its active DeFi/consumer usage and mature developer tooling relative to other non-EVM chains — best return on the engineering investment of a second chain.

**Phase 2 — Long-term roadmap:**
- XRP Ledger support (native XRPL logic or via XRPL's EVM sidechain, to be evaluated).
- Native Bitcoin support, if a viable non-custodial scripting approach is identified (Bitcoin's scripting limitations make this the hardest chain to support natively — may remain WBTC-only long-term).
- Continued evaluation of the top-10-by-market-cap list, which rotates over time — market analysts note the top 10 typically sees one to three positions shift within any 12-to-24-month window, so this list should be revisited periodically rather than fixed once.

**Pitch framing:** "Deliberately EVM-first, with wrapped-BTC value support today and a clear, honest roadmap to native multi-chain — not an overclaimed 'we support everything' story that falls apart under a judge's follow-up question."

---

## 7. Beneficiary Experience & Recovery

Three practical questions need concrete answers for this to work as a real product, not just a contract that technically holds funds correctly.

### How does a beneficiary know they're a beneficiary?
Nothing in the base design notifies anyone automatically — this needs to be built deliberately, and given how much this matters for the product to be usable by non-crypto-native family members, it's core scope, not a stretch goal:

- **Allocation lookup tool**: a beneficiary connects their wallet to the app, and a public read function checks all vaults for that address, showing what they're entitled to and under what conditions. No login beyond wallet connect.
- **Owner-driven notice as the baseline**: the owner can still tell beneficiaries directly ("I've set you up, here's the link") — the same as telling family about a will today. This always works and needs no infrastructure.
- **Email notification service (core feature)**: an off-chain backend service watches on-chain vault events and sends email alerts for three cases:
  1. **Owner check-in reminder** — sent before the check-in deadline, so a forgetful-but-alive owner doesn't accidentally let the timeout lapse and trigger the consensus flow. This directly reduces false-trigger stress, not just makes triggers reversible after the fact.
  2. **Beneficiary added notice** — sent when the owner adds a beneficiary and that beneficiary has opted in an email address, so they know an inheritance exists without needing the owner to remember to tell them.
  3. **Beneficiary claim-ready notice** — sent when a vault the beneficiary is on enters `ClaimPending` or `Finalized`, so the actual "you have an inheritance" moment isn't missed.

**How email binding works — verified by wallet signature, not a form field.** Every email address must be cryptographically bound to the specific wallet address it's meant to notify, confirmed by that wallet signing a short message (e.g. "I confirm this email is associated with wallet 0x... for Cadence notifications"). This is not optional polish — without it, anyone could type in their own email and bind it to someone else's wallet address, silently intercepting that person's check-in reminders or inheritance notices. The binding flow:

- **Owner's own email**: the owner connects their wallet, enters their email, and signs the binding message with that same wallet. Used for check-in reminders.
- **Beneficiary's email, entered by the owner at setup**: the owner can *suggest* an email on behalf of a beneficiary at vault creation, but it stays in a **pending/unverified state** and sends no notifications until the beneficiary themselves connects that wallet and signs to confirm the binding. This prevents the owner (or anyone with access to the setup form) from binding an email the beneficiary doesn't control or hasn't approved.
- **Beneficiary's own email, added directly**: a beneficiary can connect their wallet at any time and bind their own email the same way, independent of anything the owner entered.

**Database model**: `wallet_address ↔ email`, one verified binding per wallet, plus a `verified: boolean` flag and the signature used to prove it — never store an email as "linked" without a corresponding valid signature from that wallet.

**Honest privacy tradeoff — state this plainly, don't bury it:** this is the one part of Cadence that necessarily lives off-chain and isn't privacy-preserving in the same way as the rest of the protocol. Storing an email-to-wallet mapping in an off-chain database is a real, if small, privacy surface — different in kind from the on-chain privacy work elsewhere (Shielded Vault, encrypted allocations). Scope this honestly in the pitch: "email notifications are opt-in, stored only for delivery, and separate from the on-chain privacy guarantees — you can use Cadence with zero email data attached if you prefer, relying on owner-driven notice or the in-app lookup tool instead."

**Architecture note:** this is a small off-chain service (event listener + email sender, e.g. a lightweight Node service triggered by a chain indexer or webhook), not a smart contract feature — do not attempt to send email from a contract. Keep the email database minimal: wallet address, email, and opt-in flags only.

### How do they know their exact share?

**Private by design, not public.** Rather than a plain public number anyone can read, each beneficiary's allocation is stored **encrypted to that beneficiary's own wallet public key**. Nobody — not other beneficiaries, not guardians, not chain observers — can read it. Only the beneficiary can decrypt it, by signing a request locally in their own wallet. This directly answers "how do they know" — they decrypt it themselves; nobody else can.

**The On-Chain Storage Trap — this privacy only holds if the contract's data structure actually enforces it.** Encrypting on the frontend means nothing if the contract still stores plaintext shares underneath. If allocations are stored directly in a Solidity mapping (e.g. `mapping(address => uint256) public allocations`), any beneficiary or chain observer can bypass the frontend encryption entirely by calling `getStorageAt` or reading contract getters directly on Sepolia — the privacy would be theater, not real. The contract must be built so there is no plaintext to read in the first place:

- **No plaintext shares on-chain.** The contract stores a single commitment — an `allocationRoot` (Merkle tree root or commitment digest) — representing the entire distribution table, never individual percentages in the clear.
- **Encrypted payloads, not plaintext, at vault creation.** The vault creation transaction stores/emits an array of encrypted blobs, one per beneficiary: `encryptedBlob_i = Encrypt(pk_i, shareBps_i, salt_i)`, where `Encrypt` uses the beneficiary's public key (ECIES via a library such as EthCrypto, or MetaMask's `eth_getEncryptionPublicKey`/`eth_decrypt` pattern).
- **Claim-time verification, not claim-time trust.** At claim time, a beneficiary decrypts their own local payload to recover `(shareBps, salt)`, then submits those values along with a Merkle proof that their share is part of `allocationRoot`. The contract verifies the proof — it never needed to know the plaintext share until the beneficiary chose to reveal their own.

**Allocation visibility across the lifecycle:**

| Phase | Beneficiary A sees | Beneficiary B sees | Public sees |
|---|---|---|---|
| Active / pre-claim | Only their own %, decrypted with their private key | Only their own %, decrypted with their private key | Encrypted ciphertexts, vault address, commitment root — no shares |
| Contest window (`ClaimPending`) | Only their own % | Only their own % | `ClaimPending` state and countdown — no individual shares |
| Settlement (`Finalized` → claimed) | Own payout + B's payout, once B executes their claim | Own payout + A's payout, once A executes their claim | Public token transfer events (`Transfer(vault, beneficiaryA, amount)`) |

**Two things to confirm as a team before Week 3 coding, given this design:**
- **Total-sum validation moves off-chain.** Since shares are encrypted per beneficiary, the contract cannot sum all allocations on-chain to verify they total 100% (10,000 bps) without decrypting them. This check must happen in the creator's UI, before the Merkle tree is built and the vault is deployed — get this validation right in the frontend, since the contract structurally cannot catch a misconfigured split after the fact.
- **Accept that settlement is transparent even though allocation isn't.** If the vault's total balance is public (or later revealed) and Beneficiary A claims 4 ETH while B claims 6 ETH, both can infer they received 40% and 60% respectively once both have claimed. This is consistent with, not a violation of, the "private allocation, transparent settlement" boundary below — but the team should be comfortable with this specific implication before building it.

**Important scope boundary, stated honestly for the pitch:** this design hides the *allocation amount* from public view before claim time. It does not hide the *claim transaction itself* — once a beneficiary claims and funds move on-chain, that transfer's amount is visible on the public ledger, the same as any ETH/token transfer on any wallet, exchange withdrawal, or DeFi protocol today. Making the transfer itself amount-invisible would require full zero-knowledge shielded-pool infrastructure (the same class of technology as Zcash or Aztec) — that's not a feature addition, it's a new settlement layer, and claiming it was built at hackathon scope would not survive a judge's technical question. This project's honest privacy claim is:

> **"Private allocation, transparent settlement."** Your share is invisible to everyone but you until you choose to claim it. The claim transaction itself is as visible as any blockchain transfer — same as literally every wallet and protocol in use today. Full transfer-level privacy (hiding the claim amount itself) is named explicitly as future scope, requiring shielded-pool integration (Aztec/Railgun-style), evaluated post-hackathon.

This is a stronger position than an unqualified "everything is private" claim — it shows the team understands precisely where the real cryptographic boundary sits, which is exactly what a technically sharp judge listens for.

### How do they actually claim it?
Once a vault reaches `Finalized` (past the Contestable Claim window): beneficiary connects wallet → app decrypts their locally-held encrypted payload to recover their `(shareBps, salt)` → beneficiary submits these values with a Merkle proof against the on-chain `allocationRoot` in one signed transaction → contract verifies the proof and transfers their share. The decrypt step happens client-side; the contract only ever sees what the beneficiary chooses to reveal about their own allocation, never anyone else's.

### What if the beneficiary loses access to their own wallet?

**Honest starting point:** no protocol on any blockchain can restore access to an address if its private key is truly, permanently gone with no recovery method ever set up — that's a property of public-key cryptography itself, not a gap specific to this design. Any claim to fully "solve" that outright would be overclaiming in a way that could genuinely mislead people about their financial safety, and this project won't make that claim.

**What is a real, designed solve — not just a recommendation the beneficiary can ignore:** rather than a beneficiary being a raw wallet address by default, the setup flow provisions a **Beneficiary Smart Account** for each beneficiary, extending the same ERC-4337 and guardian-commitment infrastructure already built for the owner side of the protocol (Section 5, Section 2) — not new technology, the same pattern mirrored to the other party:

1. When the owner adds a beneficiary, the app deploys (or the beneficiary later activates) a lightweight ERC-4337 smart account for them, with **mandatory recovery guardians** the beneficiary nominates themselves (family, friends — independent of the vault's own guardian set).
2. If the beneficiary loses their device or key, their nominated guardians can help them recover access to that smart account — the same social-recovery mechanism the vault already uses on the owner side, mirrored for the beneficiary.
3. **Layered with the beneficiary backup-claim address** (Section 4, promoted to core scope) as a second, independent fallback — a pre-authorized secondary address with its own delay/veto window that can receive the claim if the smart account itself becomes unreachable.

This meaningfully solves the *common* real-world version of "lost wallet" — a lost phone, forgotten password, damaged hardware wallet — which covers the large majority of real cases. It does not, and cannot, cover a beneficiary who sets up zero recovery information and becomes entirely unreachable; that residual case is stated plainly in the pitch rather than glossed over.

**Explicitly not building:** any mechanism letting the owner or the vault's guardians redirect a beneficiary's claim to a different address after the fact "just in case." That would reopen the exact custodial trust risk the whole protocol exists to avoid. Recovery must stay something the beneficiary controls or pre-authorizes themselves — via their own nominated guardians or their own backup address — never something others override on their behalf.

**Pitch framing:** "We don't just point beneficiaries toward wallet recovery tools — we provision social recovery by default as part of the beneficiary setup flow, so it isn't something they can forget to do. What we won't claim is that zero-recovery-info key loss is solvable by any protocol — that's a cryptographic limit, not a gap in our design, and we say so plainly rather than overclaim it."

---

## 8. Requirements Checklist (per hackathon rules)

- [ ] **Problem Statement** — write-up (Section 1 above, expand for submission)
- [ ] **Solution** — write-up (Section 2 above, expand for submission)
- [ ] **Prototype/MVP** — working deployed contracts on testnet + functional frontend demo
- [ ] **Technology Stack** — documented (Section 5)
- [ ] **GitHub Repository** — public repo, clear README with setup/usage instructions
- [ ] **Demo** — short video walkthrough or live demo of deposit → check-in → simulated timeout → claim
- [ ] **Presentation** — pitch deck: problem, solution, innovation (Proof-of-Life Consensus), impact, future scope (DeFi unwind, insurance/DAO succession use cases)

---

## 9. Build Plan — 23-Day Timeline

**Week 1 (Days 1–7): Core vault + guardian consensus + primitive architecture**
- Days 1–2: Vault contract — deposit, beneficiary allocation, check-in/heartbeat function, unit tests.
- Days 3–4: Chainlink Automation integration for timeout monitoring (`checkUpkeep`/`performUpkeep`), full test coverage.
- Days 5–7: Guardian commitment layer — Merkle root for hidden guardian set, M-of-N attestation verification, initial claim function (timeout + guardian threshold). **Build the consensus logic as its own standalone contract/interface from the start (Feature Spotlight C)** — the vault calls it rather than embedding the logic, so this is architecture decided now, not refactored later. Tests for happy path + collusion/edge cases.

**Week 2 (Days 8–15): Stealth pipeline + Contestable Claim + Shielded Vault + gasless check-ins**
- Days 8–9: **Stealth Address Pipeline (EIP-5564)** — generate the stealth keypair off-chain first, so all subsequent test fixtures use real ephemeral stealth keys rather than mock EOAs. Deposit flow uses this to fund the vault via a one-time address, not the main wallet.
- Days 10–11: **Contestable Claim state machine + `cancelClaimWithSig`** (`Active → ClaimPending → Contested/Finalized`) — built and tested directly against the stealth keys generated in Days 8–9, so mid-window cancellation tests sign the real EIP-712 digest with the actual stealth private key from day one, rather than a placeholder `msg.sender == owner` check that would silently break once stealth addresses are introduced. See Feature Spotlight A for the full architecture (the "Gas Linkage" trap this sequencing avoids).
- Days 12–13: Shielded balance — Pedersen commitment for deposited amount, reveal/verify proof at claim time. Most technically demanding piece; subject to the **Day 13 Go/No-Go Protocol** (Section 2, Feature Spotlight B) — a hard gate with three named convergence criteria, not a soft check-in. De-scope to stealth-only immediately if any criterion fails, without touching the already-correct cancel logic from Days 10–11.
- Days 14–15: Pimlico paymaster integration via `permissionless.js` for gasless check-ins (Feature Spotlight D) — sponsor the check-in transaction so the owner never needs ETH in-wallet to prove activity.

**Scheduling note on the Notification Service (Section 7):** this is a real, additive feature on top of an already fully-packed 23-day schedule — it doesn't have dedicated days of its own below. Two honest options: (a) build a minimal version (event listener + one email template, no polish) squeezed into Day 18 or Day 22's buffer alongside existing work, or (b) treat it explicitly as the first post-hackathon addition and say so plainly in the deck ("notifications are designed and specified, next on the roadmap"). Decide this with the team rather than letting it silently expand every day's scope — don't let a good idea quietly turn into schedule risk.

**Week 3 (Days 16–21): Frontend + design + Judge Mode + beneficiary recovery + integration**
- Days 16–17: Wallet connect, deposit UI, beneficiary/guardian setup flow, and the beneficiary allocation-lookup tool built on the `allocationRoot` Merkle commitment (Section 7) — the contract stores only the commitment, the frontend handles per-beneficiary encryption/decryption and Merkle proof generation entirely client-side.
- Day 18: **Beneficiary Smart Account provisioning** — ERC-4337 account deployment/activation for each beneficiary with their own nominated recovery guardians, plus the backup-claim address fallback with its delay/veto window. This is real scope, not a UI afterthought; budget the full day.
- Days 19–20: "Vault Pulse" dashboard — the heartbeat-motif design system (see Section 10 below), animated status states, contest-window countdown + "I'M ALIVE" button, beneficiary claim screen.
- Day 21: **"Judge Mode" demo control** (Feature Spotlight E) — testnet-only UI trigger exposing simulate-silence, fast-forward countdown, and guardian auto-confirm, so a judge can drive the full lifecycle live in under two minutes.

**Days 22–23: Polish and submission buffer**
- Day 22: Full integration testing — deposit → check-in → simulate timeout → guardian confirm → contest → cancel/finalize → claim → beneficiary recovery flow, on testnet end to end. Run Slither/Mythril static analysis pass (Feature Spotlight F) and note results for the deck. Fix bugs surfaced by full-flow testing.
- Day 23: Record demo video, deploy final version, verify contracts on explorer, write GitHub README (setup, usage, architecture diagram). Build/finalize pitch deck (problem, solution, innovation, impact, future scope — lead with the composable-primitive framing). Minimal buffer left — do not schedule new features this close to deadline.

**Stretch features (only if ahead of schedule by Day 19):** EAS short-circuit trigger, DeFi position unwind, ENS support, off-chain notification bot.

---

## 10. Design Plan — "Pulse" Visual Identity

Given the custom-identity direction and solo frontend build, the design scope is deliberately built around **one strong motif reused everywhere**, rather than many separate design decisions — this keeps a distinctive look achievable for one person within the timeline.

- **Core motif:** a heartbeat/ECG line running across every screen as both navigation accent and literal status indicator. Its rhythm reflects vault state: steady = active, irregular/slowing = approaching deadline, flatline = claimed.
- **Palette:** dark near-black background (`#0A0E14`-ish) with one saturated accent color for the pulse line — a clinical green or electric teal reads as "life signal" and avoids the generic purple/blue crypto-app look.
- **Typography:** one monospace font for numbers/countdowns (reinforces precision), one clean sans-serif for everything else — two fonts total.
- **Motion over decoration:** the pulse line should animate in real time (SVG/CSS animation) — a single moving element does more for a "considered, alive" feel than static polish spread thin across many screens.
- **Screens (kept to five, all reusing the same components):**
  1. Connect wallet
  2. Create vault (deposit, beneficiaries, guardians, check-in interval)
  3. Vault Pulse dashboard (hero screen — status, countdown, check-in button)
  4. Contest window / cancel screen ("I'M ALIVE" button, countdown, guardian confirmations shown)
  5. Beneficiary claim screen

---

## 11. Pitch Narrative (for deck)

- **Hook**: Billions in crypto are lost forever because there's no reliable way to inherit it — and the "solutions" that exist can't tell if you died or just went off-grid.
- **Name tie-in**: "We call it Cadence, because life has a rhythm — and this protocol is built to listen for it." Use this line early in the deck to connect the product name directly to the Vault Pulse visual before the judge has to make that connection themselves.
- **The reframe (lead with this)**: This isn't just an inheritance app — it's Proof-of-Life Consensus, a reusable on-chain primitive for verifying "is this person really gone" with privacy and reversibility built in. The vault is the reference implementation; the primitive is reusable for DAO succession, insurance payouts, and dead-hand governance transfers.
- **Problem**: Timeout-only dead man's switches are fragile and their guardians are public targets. DeFi positions are invisible to inheritance tools entirely.
- **Solution**: Proof-of-Life Consensus — multi-signal, privacy-preserving verification before any claim executes, with a reversible grace window if it's wrong.
- **Innovation**: Hidden guardian commitments + multi-signal threshold + **Contestable Claim** ("a dead man's switch you can cancel with your own signature") + **Shielded Vault** privacy layer + a standalone, composable consensus primitive — a combination no existing tool offers.
- **Uniqueness one-liner for the deck**: "Every existing dead-man switch trusts its trigger blindly. Ours is the first that's safely reversible, keeps the vault private, and is built as reusable infrastructure rather than a single app."
- **Design hook**: lead the live demo with the Vault Pulse dashboard, then hand the judge the controls via Judge Mode — the heartbeat visual makes the "proof of life" concept immediately legible, and letting them drive it live for 90 seconds is what gets remembered when they're scoring dozens of projects.
- **Technical credibility**: cite the Slither/Mythril static analysis result directly in the deck — a concrete, checkable signal of security diligence.
- **Impact**: Applicable beyond personal inheritance — insurance payouts, DAO succession planning, estate-linked DeFi management.
- **Future scope**: Full ZK-proof guardian verification, EUDI Wallet / eIDAS 2.0 compliance angle for identity attestations, multi-chain support, full shielded-pool integration (e.g. Railgun/Aztec) to hide the claim transaction itself — not just the pre-claim allocation and balance, which are already private — and third-party protocols integrating directly with the Proof-of-Life Consensus primitive.

---

## 12. Team Decisions

### Settled

1. **Guardian privacy mechanism: simple Merkle commitment** (not full ZK-SNARK proofs). Confirmed — sufficient privacy guarantee for the guardian-hiding use case at this scope, without the added circuit-design risk of ZK-SNARKs.
2. **Network: Ethereum Sepolia (testnet)**. Confirmed over Polygon Amoy — better faucet accessibility, more stable RPC, and confirmed compatibility with Chainlink Automation, the ERC-4337 paymaster, and EAS, all of which the build depends on.
3. **Frontend/UI ownership: solo-owned by a capable team member.** The earlier "solo frontend risk" flag is resolved — this person is confirmed capable of handling the Vault Pulse design system, Judge Mode, beneficiary-facing screens, and integration work end to end. No fallback de-scoping plan is needed on this basis alone; the Day 13 and Day 15 schedule checkpoints (below) remain as general project health checks, not frontend-specific risk mitigation.

4. **Cancel-key sequencing (Contestable Claim + Shielded Vault dependency):** confirmed and re-sequenced. The original schedule risked building the Contestable Claim state machine (Days 8–9) before the stealth key architecture existed (previously Days 10–11) — a real dependency trap, since a naive `msg.sender == owner` cancel check would need rework once stealth addresses were introduced, and a direct-transaction cancel funded from the owner's main wallet would silently destroy the Shielded Vault's unlinkability (the "Gas Linkage" trap, detailed in Section 2, Feature Spotlight A). **Build order is now: stealth keypair generation first (Days 8–9), Contestable Claim + `cancelClaimWithSig` second (Days 10–11)** — see the revised schedule in Section 9. The cancel mechanism itself is signature-based (EIP-712 meta-transaction), not a direct transaction, so it can be relayed by anyone without creating a gas-funding trail back to the owner's identity.
5. **Gasless check-in paymaster provider: Pimlico via `permissionless.js`.** Confirmed over Alchemy's `aa-sdk`/Account Kit — native `viem`/`wagmi` fit with no opinionated wrapper, full EntryPoint v0.7 support, and instant testnet sponsorship policy setup via the Pimlico dashboard. Full comparison and implementation pattern in Section 2, Feature Spotlight D.
6. **Day 13 Shielded Balance checkpoint: formalized as a hard go/no-go gate**, not an informal check-in — three named convergence criteria (on-chain verification gas cost, client-side generation speed, claim-flow consistency), all of which must pass by end of day, with an explicit de-scope procedure (contract, frontend, and pitch-narrative changes) if any fail. Full protocol in Section 2, Feature Spotlight B.
7. **Allocation storage design: commitment-only on-chain, never plaintext.** Confirmed — the contract stores a single `allocationRoot` (Merkle commitment) plus per-beneficiary encrypted payloads, never a plaintext mapping of shares. This closes a real gap in the original encrypted-to-beneficiary design: encrypting on the frontend alone would have been meaningless if the contract still stored plaintext shares readable via `getStorageAt` or a public getter. Full data-structure design, lifecycle visibility table, and the two required team confirmations (off-chain sum validation, accepting that settlement remains transparent) are in Section 7.

### Still open
- None outstanding at this time — all major architecture and infrastructure decisions are settled. Revisit if new constraints surface during Week 1–2 building.

---

## 13. Current Milestone & Execution Status

| Milestone / Component | Target | Status | Verification Detail |
|---|---|---|---|
| **Core Protocol Contracts** | Week 1 | **COMPLETED** | 13 Foundry suites, 197/197 tests passing. Deployed & verified on Sepolia. |
| **Proof-of-Life Consensus Primitive** | Week 1–2 | **COMPLETED** | Decoupled `ProofOfLifeConsensus.sol`. Timeout + M-of-N guardian attestations. |
| **EIP-712 Stealth Cancel (Constraint #1)** | Week 2 | **COMPLETED** | Zero gas-linkage relayer cancellation. `cancelClaimWithSig()` validated. |
| **ECIES Private Allocations (Constraint #3)** | Week 2 | **COMPLETED** | 32-byte Merkle commitment on-chain; client-side browser decryption. |
| **ERC-4337 Smart Account Recovery (Constraint #5)** | Week 2 | **COMPLETED** | `BeneficiarySmartAccount.sol` EntryPoint 0.7 + social recovery. |
| **Constraint #6 Notification Service** | Week 3 | **COMPLETED** | Canonical email-bound signatures, live Resend/SMTP delivery, wrong-wallet recovery. |
| **Fast Heartbeat Testing Presets** | Week 3 | **COMPLETED** | Native 5m & 10m presets on `/vault/create`; on-chain `[⚡ Adjust Interval]` on `/dashboard`. |
| **Production Cloud Infrastructure** | Week 3 | **COMPLETED** | Render backend (`render.yaml`, `tsc` build), Vercel frontend (`vercel.json`, multi-RPC failover pool). |
| **Removal of Mock Demo Personas** | Week 3 | **COMPLETED** | Deleted Judge Mode bar, HowItWorks modal, Toast provider, and all mock persona switches in favor of authentic Web3 wallets. |
| **Security Hardening Phase 1: Smart Contract Access Control & Claim Isolation** | Security Audit | **COMPLETED** | Front-run defense on `setConsensusForVault`, EIP-712 domain separation on `attestWithSig`, OpenZeppelin `Ownable` on `BalanceCommitment`, token claim isolation via `_safeTransferCatching` (`TokenTransferFailed`). 4/4 tests in `SecurityAudit.t.sol`. (Commit `706266f`) |
| **Security Hardening Phase 2: Backend Hardening, PII Privacy & Rate Limiting** | Security Audit | **COMPLETED** | Canonical email-bound signatures (`getBindingMessage`), admin bearer token on `/api/outbox`, internal secret header on hooks, global & sensitive endpoint rate limiting (`express-rate-limit`), strict CORS. (Commit `0234950`) |
| **Security Hardening Phase 3: Safe Key Management & Automated Regression Testing** | Security Audit | **COMPLETED** | In-memory ECIES key derivation via Web3 wallet signatures (`keccak256(sig)`) in `ClaimPortal.tsx`; zero raw key inputs in UI; automated test suites (`SecurityAudit.t.sol` + `security.test.ts`). 197 contract tests, 15 notification tests, 10 e2e tests passing. (Commit `4f5f51b`) |