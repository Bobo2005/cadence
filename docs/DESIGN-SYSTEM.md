# DESIGN-SYSTEM.md — "Pulse" Visual Identity

## Project Name: Cadence
The name reinforces the core motif directly — a cadence *is* a rhythm, which ties the product name, the heartbeat/pulse visual system, and the "Proof-of-Life" concept into one coherent idea. Use this explicitly in the pitch: "Cadence — because life has a rhythm, and this protocol listens for it."

**Status: LOCKED.** The user has supplied five actual UI reference screens (Connect Wallet, Dashboard, Contest, Create Vault, Claim Portal), saved in `docs/ui-reference/` (connect-wallet.png, vault-pulse-dashboard.png, contest-window.png, create-vault.png, beneficiary-claim.png). This document now specifies the real, confirmed design system extracted from those references — not a placeholder. Build against this exactly, and refer back to the actual image files for any pixel-level detail not captured in writing here.

## ⚠️ Two Copy Corrections Required Before This Ships (read first)

The reference mockups contain two claims that do not match the actual architecture and must be corrected in the real build — this is a Technical Feasibility risk if left as-is, not a style nitpick:

1. **"Fully Audited" (landing page footer)** — FALSE at this stage. Remove entirely, or replace with an honest, verifiable claim once available, e.g. "Slither Static Analysis: 0 Critical Findings" (per PROJECT-PLAN.md Feature Spotlight F). Never claim "audited" without an actual professional audit.
2. **"Zero-Knowledge Key Sharding" / "ZK-threshold cryptography"** (landing page + Create Vault screen) — describes real ZK-SNARK/Shamir threshold cryptography, which is not what's built. The actual mechanism is Merkle-committed guardian consensus + ECIES-encrypted allocations (+ Pedersen commitment for balance, if it survives the Day 13 gate). Replace with accurate copy, e.g.: *"Guardian consensus is Merkle-committed — guardians can verify a lapse but never see your funds or your allocation."* Keep "zero-knowledge commitment hashes" language only if referring specifically to the Merkle root as a commitment, and even then prefer the plainer "cryptographic commitment" to avoid implying a ZK proof system that doesn't exist.
3. **Envelope icon on "Connect Wallet to Begin"** — swap for a wallet icon. The envelope is reserved for the email-binding flow (see Email Notification Binding section below), which is a separate step from wallet connection; using it here implies wallet-connect is about email, which will confuse first-time users.

Do not let an AI coding agent copy the reference mockup's text verbatim for these two spots — the prompts below already correct for this.

## Confirmed Terminology (use consistently across the whole app and prompts)

| UI term | Maps to backend concept |
|---|---|
| Locker | Vault (InheritanceVault.sol) |
| Heartbeat | Check-in / Proof-of-Life signal |
| Heartbeat Rhythm / BPM | Active state visualization |
| Guardian Node | Guardian (GuardianRegistry.sol) |
| Claim Challenge Window Open | `ClaimPending` state |
| Reset Protocol: I'm Alive | `cancelClaimWithSig` |
| Discharged / Flatlined | `Finalized` / claimed state |
| Execute Inheritance Claim | Beneficiary claim function |
| Inheritor Decrypted Share | Beneficiary's ECIES-decrypted allocation |

## Confirmed Design Tokens (extracted from reference screens)

### Color
```css
--bg-primary:      #0A0E14;   /* near-black background, confirmed */
--bg-surface:      #12161F;   /* card surface, confirmed */
--border-active:   #2EE6A8;   /* teal border on Dashboard's top status card */
--border-warning:  #F5B841;   /* amber border on Contest screen's top card */
--border-danger:   #F5484A;   /* red border on Claim Portal's flatlined top card */
--accent-pulse:    #2EE6A8;   /* teal/green — CTAs, active pulse line, "online" status */
--accent-warning:  #F5B841;   /* amber — contest window pulse line, countdown, warnings */
--accent-danger:   #F5484A;   /* red — flatlined state, expired badges, "asserted lapse" */
--text-primary:    #E8ECF1;
--text-secondary:  #8993A6;   /* labels, helper text, "PROTOCOL NAVIGATION" section header */
--border-subtle:   #232838;
```
Confirmed: the top status card's border color is the single strongest state indicator in the whole app (teal/amber/red) — carry this rule through every state, not just the three shown.

### Typography
- **Monospace** — used for: BPM metric, all countdowns (`42d : 18h : 35m : 12s`), wallet addresses (`0x71C...8b2`), ETH amounts (`125.50 ETH`), vault IDs (`#082`). Confirmed across every screen.
- **Sans-serif, bold** — headings ("Locker Heartbeat Rhythm", "Provision Inheritance Vault").
- **Sans-serif, regular** — body copy, labels, nav items.

### Layout (confirmed structure, apply to every screen)
- **Persistent left sidebar**: "PROTOCOL NAVIGATION" label (small, secondary text color), then four nav items with icons — Dashboard (home), Create Vault (plus-circle), Contest (shield), Claim Portal (key). Active item gets a filled/bordered background treatment.
- **Persistent top bar**: Cadence logo (heart-with-pulse-line icon) + wordmark, left; horizontal nav mirroring the sidebar, center; wallet address pill with a status dot, right.
- **Hero status card at the top of every screen**: colored border matching state, a status badge pill (top-left), the "Locker Heartbeat [state]" headline, a right-aligned metric/status label, and the ECG line itself spanning the full card width below.
- **Content cards below the hero**: consistent card style — `--bg-surface`, `--border-subtle`, generous padding, rounded corners.

## The ECG Line: State-by-State Specification (this is the core motif — get this exactly right)

| State | Line behavior | Border/line color | Badge text | Headline |
|---|---|---|---|---|
| Active | Steady, evenly-spaced heartbeat pattern | Teal (`--accent-pulse`) | ACTIVE SIGNAL | Locker Heartbeat Rhythm |
| Approaching deadline / Contest | Irregular, denser/jagged spikes | Amber (`--accent-warning`) | CLAIM CHALLENGE WINDOW OPEN | Locker Heartbeat Erratic |
| Finalized / Claimed | Flat line with small residual blips | Red (`--accent-danger`) | HEARTBEAT EXPIRED | Locker Heartbeat Flatlined |

This progression (steady → erratic → flat) is the single visual through-line connecting all four screens — an agent building this should treat the ECG line's SVG path data as three distinct, deliberately-designed states, not one line with a color swap.

## Screens (five, confirmed from reference — build to match exactly)

1. **Connect Wallet / Landing** — centered card, Cadence logo + wordmark, "ACTIVE HEARTBEAT MINING" badge, full-width ECG line as background texture, headline "Life has a rhythm. This protocol listens for it.", one-paragraph explainer, single CTA "Connect Wallet to Begin". Footer line: see copy correction #1 above.

2. **Dashboard (Vault Pulse)** — hero card (Active state per table above) showing BPM metric. Below: two-column row — "Next Required Check-In" (countdown + "Record Heartbeat Now" button) and "Protected Vault Balance" (amount + privacy toggle + "sharded among N guardian nodes"). Second row: "Guardian Node Attestation Status" list (address + online/synced status) and "Beneficiary allocations are encrypted" card (lock icon + explainer — apply copy correction #2 here).

3. **Create Vault** — three-step form: (1) Deposit Capital — amount + token selector; (2) Beneficiary Allocation — repeatable address+percentage rows, "Add Beneficiary" link, live "SUMS TO 100%" validation badge (this directly implements the off-chain sum-validation requirement from ARCHITECTURE.md constraint #4 — the badge should genuinely validate, not be decorative); (3) Heartbeat & Guardians — guardian address inputs, interval selector (30/60/90/180 days). Right sidebar: "Locker Execution Summary" recap + info callout (apply copy correction #2) + "Authorize & Deploy Vault" CTA.

4. **Contest Window** — hero card (Contest state per table above). Below: explanatory card ("A vault distribution has been requested...") and a "Contest Period Remaining" card with the countdown and the large "RESET PROTOCOL: I'M ALIVE" button — this must call `cancelClaimWithSig`, never a direct transaction (see ARCHITECTURE.md constraint #1). Small helper text under the button should say plainly what the transaction does. Below: "Guardian Attestation Claims" list showing which guardians asserted the lapse.

5. **Claim Portal (Beneficiary Claim)** — hero card (Finalized state per table above). "Your Eligible Inheritance Claims" section with a card per finalized vault the connected wallet is listed on: vault ID, FINALIZED badge, "Inheritor Decrypted Share" amount (this is the client-side ECIES-decrypted value, never a plaintext on-chain read — see ARCHITECTURE.md constraint #3), origin address, "Execute Inheritance Claim" button.

## Email Notification Binding (not in the five reference screens — designed here to fit them)

None of the five reference screens show the email notification flow from PROJECT-PLAN.md Section 7 (owner check-in reminders, beneficiary-added/claim-ready alerts). This needs a home in the UI. Placement, in order of priority:

1. **Post-connect prompt (skippable)**: immediately after the Connect Wallet screen, on first Dashboard visit, show a small dismissible card — "Get notified before your check-in deadline" (envelope icon appropriate here) — with an email input and a "Verify & Enable" button that triggers the wallet signature per ARCHITECTURE.md constraint #6. Must be skippable; the product works fully without it per PRD.md.
2. **Dashboard settings affordance (persistent, not one-time)**: a small row/card on the Dashboard showing notification status (bound/unbound), so this isn't only offered once and forgotten. Reuses the same tokens as other Dashboard cards.
3. **Create Vault, per-beneficiary optional field**: when adding a beneficiary, an optional "Suggest an email for this beneficiary" input, clearly labeled "Pending beneficiary confirmation — they must verify it themselves" per the security design — never implying the owner's entry alone activates notifications.
4. **Claim Portal banner (beneficiary-side, self-served)**: if the connected wallet is a listed beneficiary with no verified email, show a banner — "Add your email to get notified next time" — same sign-to-verify flow, independent of anything the owner entered.

**Icon note**: reserve the envelope icon specifically for these email-binding touchpoints. Do not use it on the "Connect Wallet to Begin" button itself (item 2 in the copy-correction notes below) — that button should use a wallet icon, since an envelope there implies the wallet-connect step itself is about email, which isn't accurate and confuses first-time users about what they're doing.

## Anti-Bridge-Anxiety UI Principles (still apply, confirmed compatible with this reference)
- The Contest screen's explanatory copy ("Nothing is finalized until the 72-hour contest countdown finishes") is exactly the right pattern — plain-language reversibility statements, not left implicit in a countdown alone. Carry this tone into every irreversible-adjacent action.
- Preview steps before signatures — the Create Vault "Locker Execution Summary" sidebar is a good existing example of this pattern; keep it.

## Email Notification UI (not in the reference screens — placement designed below)

The five reference screens don't include any UI for the notification/email-binding feature from PROJECT-PLAN.md Section 7 and Prompt 22. Since the feature needs real UI surfaces (a form field, a pending/verified status, a signature-confirmation action) rather than existing invisibly, here's where it fits into the confirmed system without adding a sixth screen:

1. **Dashboard — new card, same style as "Guardian Node Attestation Status."** Title: "Notifications." Shows the owner's own email-binding status as one of three states: *Not set* (prompt to add), *Pending signature* (waiting on the owner to sign the binding message), *Verified* (green check, shows the masked email). This card sits alongside the existing four Dashboard cards, styled identically (`--bg-surface`, `--border-subtle`).

2. **Create Vault, Step 3 (Heartbeat & Guardians)** — add one optional field below the guardian inputs: "Notify me before check-in deadline (optional)" with an email input and a "Verify" button that triggers the EIP-712 signature-binding flow from ARCHITECTURE.md constraint #6. Do not save the email until the signature is confirmed.

3. **Create Vault, Step 2 (Beneficiary Allocation)** — add one optional field per beneficiary row: "Suggest an email for this beneficiary (optional)." Immediately below it, small secondary-color helper text: "They'll need to confirm this themselves before any notification is sent" — this is the honest, upfront statement of the pending/unverified state from ARCHITECTURE.md constraint #6, so the owner isn't surprised later that a "successfully added" email didn't actually notify anyone.

4. **Claim Portal — a banner above "Your Eligible Inheritance Claims," shown only if the connected wallet has a pending owner-suggested email waiting.** Text: "An email was suggested for this wallet by [vault owner short address] — confirm it to get notified about future claims," with a "Confirm" button that triggers the same signature flow as #1, binding the email to the beneficiary's own wallet.

**Style note:** use `--accent-warning` (amber) for "Pending signature" states across all four placements above, and `--accent-pulse` (teal) for "Verified" — this reuses the existing state-color vocabulary from the ECG system instead of introducing a new color meaning.

## Check-In Status Banner (dual-path gas sponsorship — see ARCHITECTURE.md constraint #8)

The "Record Heartbeat Now" button on the Dashboard must show which transaction path applies **before** the user commits, not just describe it after the fact. Small banner/label directly above or beside the button:

- **Smart account detected**: `--accent-pulse` (teal) badge, text **"Sponsored · 0 ETH"**.
- **Plain EOA detected**: `--accent-warning` (amber) badge, text **"Direct Transaction · Normal Gas"**.

Reuses the same two-color vocabulary as the email verification states above (teal = the good/no-friction outcome, amber = the "this requires something from you" outcome) — keep this pairing consistent across the app rather than introducing new color meanings per feature.

## Claim Portal Action Hierarchy & In-Memory Key Derivation

To avoid user friction and cryptographic error alerts, the Claim Portal (`/claim`) enforces a dynamic 3-tier action button hierarchy on finalized vault cards:

1. **Pending In-Memory Decryption**:
   - Badge: `ECIES Decryption: Pending Unlock` (`--accent-warning`, amber).
   - Button: **`[🔑 Unlock Allocation to Claim]`** styled with a sleek cyan-to-pulse gradient (`from-[#00E5FF] to-[#2EE6A8]`, `--accent-info` to `--accent-pulse`) and pulse glow (`shadow-[0_0_20px_rgba(0,229,255,0.3)]`).
   - Action: Triggers `personal_sign` over deterministic salt `keccak256(sig)` to derive the 32-byte key strictly in memory without ever exposing raw private keys.

2. **Verified Merkle Proof (Claim Ready)**:
   - Badges: `ECIES Decryption: ✓ Verified Locally` (`--accent-pulse`, teal) and `Merkle Leaf Proof: ✓ Root Membership Valid` (`--accent-pulse`, teal).
   - Button: **`[Execute Inheritance Claim]`** in solid vibrant pulse teal (`bg-[#2EE6A8] text-[#0A0E14]`) with pulse glow (`shadow-[0_0_20px_rgba(46,230,168,0.3)]`).
   - Supports both single-beneficiary (zero-length OpenZeppelin proofs `[]`) and multi-beneficiary allocation branches.

3. **Contest Grace Elapsed (Pending Finalization)**:
   - Banner: `✓ Challenge Grace Period Elapsed` in teal container (`--accent-pulse-glow`).
   - Button: **`[⚡ Finalize Contest on Sepolia & Unlock Claim]`** in amber-to-pulse gradient (`from-[#F5B841] to-[#2EE6A8]`) advancing the consensus contract to `Finalized` directly from the claim card.

## Contest Window Guardian Attestation & Email Dispatcher

On `/contest`, the interface dynamically reflects guardian consensus and inactivity dispatching:

1. **Interactive Attestation**:
   - Detects whether the active wallet matches Guardian Node 1 or Node 2 and displays an immediate **`[⚡ Attest Lapse]`** action button.
   - Quorum Tracking: Dynamic state button renders **`Awaiting Guardian Quorum (0/2)`** in `--accent-warning` (amber) with disabled state until 2-of-2 attestations are recorded on-chain, transitioning to **`[⚡ Trigger Contest Challenge Window]`** in vibrant pulse teal.

2. **Dual-Guardian Email Dispatcher**:
   - Two distinct input rows for **Guardian Node 1** and **Guardian Node 2** emails with instant dispatch action (`[✉ Send Attestation Email Alerts to Guardians]`).
   - Dispatches separate, role-specific notification emails with direct links to attest on Sepolia.

## 1-Click Atomic Vault Provisioning Modal

On `/vault/create`, the provisioning state is represented by a unified cyberpunk checklist modal:
- Bundles all 5 protocol actions (Deploy, Deposit, Allocation Root, Guardian Quorum, Contest Window) under a single on-chain transaction hash.
- Real-time animated spinner transitions to solid green checkmarks (`--accent-pulse`) as the transaction confirms on Sepolia, accompanied by an instant Etherscan link.