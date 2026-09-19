# Cadence Frontend Page-by-Page AI Agent Prompts
## Exact Visual Direction: Sequence-inspired Light Editorial Product UI

---

# HOW TO USE THIS DOCUMENT

Build Cadence incrementally.

Use `Cadence_Design_System_Light.md` as the visual source of truth.

Use the Cadence product design document as the source of truth for product behavior, terminology, required sections, and user journeys.

Use the supplied Sequence reference video as the visual source for the light editorial aesthetic.

## CRITICAL OVERRIDE

**DO NOT BUILD CADENCE AS A DARK TERMINAL.**

The target is:

> **Premium fintech × editorial SaaS × Web3 infrastructure × subtle futuristic product UI**

Use:
- white / near-white backgrounds
- large bold black typography
- muted gray body text
- black primary actions
- white rounded cards
- thin light borders
- subtle shadows
- generous whitespace
- small cyan, lavender, purple, coral and semantic status accents
- floating product UI compositions
- thin connector lines
- restrained motion

Do not copy Sequence branding or exact layouts.

---

# GLOBAL IMPLEMENTATION PROMPT

You are building the frontend for **Cadence**, a self-custodial Web3 digital inheritance and crypto estate-planning dApp.

Cadence is an on-chain Heartbeat protocol. A vault owner can deposit assets, configure beneficiaries, assign guardians, set a Proof-of-Life interval, and establish a reversible Contest Window before inheritance distribution.

The source product design defines five core views: Connect / Landing, Vault Pulse Dashboard, Create Vault, Contest Window, and Claim Portal. fileciteturn1file5L1-L12

## VISUAL TARGET

Make Cadence look like a premium modern financial/infrastructure product.

The visual reference should communicate:
- editorial hierarchy
- whitespace
- calm confidence
- clean product cards
- polished navigation
- black CTAs
- soft atmospheric gradients
- floating UI compositions
- subtle motion

The interface must not look like:
- a crypto exchange
- a hacker console
- a dark terminal
- a generic SaaS admin template
- a neon Web3 site

## PRODUCT TARGET

Preserve:
- Locker
- Heartbeat
- Proof-of-Life
- Guardian consensus
- Beneficiary allocation
- Contest Window
- Reset Protocol: I'm Alive
- Merkle proof verification
- EIP-712 reset behavior
- Inheritance Claim
- Cadence Streams
- Sepolia network state

Build a real application with reusable components, realistic states, accessible forms, wallet handling, network states, loading states, transaction states, and error recovery.

---

# PAGE 1: CONNECT / LANDING

**Route:** `/`

## Objective

Create the primary public landing page. It should communicate Cadence in one glance without Web3 hype.

## PUBLIC NAVBAR

Use a clean centered max-width navbar:

```text
[ Cadence ]       Product   How it works   Security   Docs       [ Connect Wallet ]
```

Style:
- white background
- dark text
- small restrained wordmark
- optional cyan/purple logo dots
- black rounded Connect Wallet button
- generous spacing

## ANNOUNCEMENT STRIP

Add a small pale peach/coral status strip near the top, inspired by the reference video.

Use a compact dark rounded control on the right.

Keep it understated.

## HERO

Headline:

> Life has a rhythm. This protocol listens for it.

Use:
- 64 to 72px desktop
- bold weight
- tight line height
- negative tracking
- max width around 720px

Supporting copy should explain Cadence as a self-custodial inheritance protocol that monitors a cryptographic Heartbeat and only begins inheritance settlement after configured inactivity and a reversible Contest Window.

Primary:

`CONNECT WALLET TO BEGIN`

Secondary:

`HOW IT WORKS`

## HERO PRODUCT VISUAL

Do not use a giant dashboard screenshot.

Build a floating composition on the right using live Cadence UI cards.

### Floating card A

```text
ACTIVE SIGNAL
72 BPM
HEARTBEAT
30 DAYS
```

### Floating card B

```text
NEXT CHECK-IN
42d : 18h : 35m
```

### Floating card C

```text
GUARDIANS
2 / 2 VERIFIED
```

### Floating card D

```text
PROTECTED
12.5000 ETH
```

Connect selected cards with thin lines.

Use soft cyan/lavender atmosphere behind the composition.

Add a subtle animated ECG line.

## FEATURE CALLOUTS

Show:
- Merkle-committed guardians
- Client-side encrypted allocations
- 72-hour reversible Contest Window

Use compact typography and tiny accent markers.

## PRODUCT PREVIEW

Create a large white product panel showing the authenticated dashboard.

Use:
- rounded 16px corners
- 1px border
- very subtle shadow
- generous internal spacing

Show:
- ACTIVE SIGNAL
- BPM
- Next Required Check-In
- Protected Vault Balance
- Guardian Consensus
- Network Sync

## SECURITY EXPLANATION

Create a spacious two-column section.

Explain:
- assets remain self-custodied
- allocations are encrypted client-side
- guardians cannot see balances or heir allocations
- distribution does not occur until the configured Contest Window expires

## FINAL CTA

Headline:

> Keep the signal alive.

Primary:

`CONNECT WALLET TO BEGIN`

## WALLET MODAL

Clicking Connect Wallet opens a centered white modal over a blurred backdrop.

Options:
- MetaMask
- Rabby
- WalletConnect

Show:
- wallet icon
- wallet name
- connecting state
- Sepolia network information
- close control

States:
- idle
- connecting
- connected
- rejected
- error

Motion:
- backdrop fade
- modal fade/scale
- 250ms transition

---

# PAGE 2: VAULT PULSE DASHBOARD

**Route:** `/dashboard`

## Objective

Build the authenticated owner dashboard using the same light editorial visual system.

The dashboard can be information-rich but must not become a dark terminal.

## APP SHELL

Use:
- white sidebar
- white top bar
- light borders
- spacious main workspace

Sidebar:

```text
CADENCE

OVERVIEW
Vault Pulse
Create Vault
Contest Window
Claim Portal

SYSTEM
Documentation
Security
Network
```

Active item:
- subtle purple/cyan background
- small accent marker
- dark text

## TOP BAR

Show:

```text
SEPOLIA
● SYNCED 12s AGO

0x8A...91F2
```

Include wallet control and account menu.

## PAGE HEADER

```text
Vault Pulse
Your inheritance protocol is active.
```

Use an editorial heading rather than an admin-style title.

## PRIMARY HEARTBEAT CARD

Create a large white card with a subtle cyan/lavender atmospheric region.

Show:

```text
ACTIVE SIGNAL

72 BPM

NEXT REQUIRED CHECK-IN

42d : 18h : 35m : 12s
```

Use JetBrains Mono for values.

Include a calm teal ECG.

Primary:

`RECORD HEARTBEAT NOW`

Secondary:

`Last Heartbeat: 12 minutes ago`

## GAS MODE

Show:

`SPONSORED · 0 ETH`

when sponsored smart-account/paymaster support is available.

Otherwise:

`DIRECT · EOA GAS`

Keep this compact.

## PROTECTED BALANCE

```text
PROTECTED VAULT BALANCE

12.5000 ETH

SHOW / HIDE
```

Hidden:

```text
•••••••• ETH
```

## GUARDIAN CONSENSUS

Create two clean rows or cards:

```text
GUARDIAN NODE 01
0x...
● VERIFIED
LAST ATTESTATION 12m AGO

GUARDIAN NODE 02
0x...
● VERIFIED
LAST ATTESTATION 12m AGO
```

## EMAIL NOTIFICATION STATUS

If not configured:

```text
EMAIL ALERTS NOT CONFIGURED

Bind an email address to receive automated Heartbeat reminders and Contest Window alerts.

[ CONFIGURE ALERTS ]
```

Use a pale informational surface.

## SECONDARY METRICS

Use restrained cards for:
- Heartbeat interval
- Contest Window duration
- Beneficiary count
- Protected assets
- Last transaction
- Locker state

Do not add charts merely to make the dashboard look busy.

---

# PAGE 3: CREATE VAULT / PROVISIONING

**Route:** `/vault/create`

## Objective

Build the Cadence 3-step provisioning flow as a premium operational form.

Desktop:

```text
LEFT: form
RIGHT: sticky Locker Execution Summary
```

Mobile: stack them.

## HEADER

```text
Create a Locker
Configure how your inheritance will activate.
```

## STEP INDICATOR

```text
01 DEPOSIT
02 ALLOCATION
03 HEARTBEAT
```

States:
- completed = teal
- current = black/purple
- upcoming = muted gray

## STEP 1: DEPOSIT CAPITAL

Fields:
- token selector
- amount input
- wallet balance
- estimated transaction information

Supported:
- ETH
- USDC
- USDT
- WBTC

Validate inputs in real time.

## STEP 2: BENEFICIARY ALLOCATION

Create repeatable rows.

Each row:

```text
BENEFICIARY ADDRESS
ALLOCATION
```

Example:

```text
0xABCD...1234
6,000 BPS
60.00%
```

## ALLOCATION VALIDATOR

Make the validator visually prominent.

```text
TOTAL ALLOCATION

8,500 / 10,000 BPS

85.00%
```

States:
- underallocated = pale amber
- overallocated = pale red
- exactly 10,000 BPS = pale green

Deployment must remain disabled unless total allocation equals exactly 10,000 BPS.

## STEP 3: HEARTBEAT & GUARDIANS

Fields:
- Guardian Node 1
- Guardian Node 2
- optional alert emails
- heartbeat interval
- Contest Window duration
- Cadence Streams toggle

Presets:

```text
5 MIN (DEMO)
10 MIN (DEMO)
30 DAYS
60 DAYS
90 DAYS
180 DAYS
```

Default:

`72 HOURS`

Explain the Contest Window in plain English.

## RIGHT SUMMARY

```text
LOCKER EXECUTION SUMMARY

Asset
ETH

Deposit
12.5000 ETH

Beneficiaries
2

Guardian Consensus
2 / 2

Heartbeat
30 DAYS

Contest Window
72 HOURS

Cadence Streams
OFF
```

Primary:

`AUTHORIZE & DEPLOY`

Keep the summary sticky on desktop.

---

# PAGE 4: ATOMIC DEPLOYMENT CONFIRMATION

**Route:** modal/state from `/vault/create`

## Objective

Create a premium transaction confirmation modal, not a generic crypto wallet popup.

White modal over a softly blurred backdrop.

Title:

`AUTHORIZE & DEPLOY LOCKER`

Explain:

```text
This signature will:

1. Deploy the Locker
2. Deposit the selected assets
3. Commit beneficiary allocation roots
4. Register guardian consensus
5. Start the Heartbeat timer
```

Show:
- Network
- Contract
- Deposit
- Beneficiary count
- Guardian count
- Heartbeat
- Contest Window

Actions:

`AUTHORIZE & DEPLOY`

`CANCEL`

States:
- Awaiting wallet
- Signature requested
- Transaction pending
- Confirmed
- Failed
- Rejected

The goal is certainty, not fear.

---

# PAGE 5: CONTEST WINDOW

**Route:** `/contest`

## Objective

Build the emergency safety-valve screen.

It should feel urgent but calm.

## HERO

Use a pale amber atmospheric background.

Headline:

> Locker Heartbeat Erratic

Show an irregular amber ECG.

Status:

`CLAIM PENDING`

## COUNTDOWN

Make the timer dominant:

```text
47h : 12m : 08s
```

Supporting copy:

> Nothing is distributed until the Contest Window expires.

## RESET ACTION

Create a large high-contrast action:

`RESET PROTOCOL: I'M ALIVE`

Explain:

> Resetting now immediately returns the Locker to ACTIVE. The pending inheritance claim will be voided.

Also explain:
- the reset uses an EIP-712 stealth signature
- it does not require on-chain gas
- success returns the Locker to ACTIVE

## GUARDIAN ATTESTATIONS

```text
GUARDIAN NODE 01
ATTESTED LAPSE
TIME ...

GUARDIAN NODE 02
ATTESTED LAPSE
TIME ...
```

## CONFIRMATION

Reset requires a confirmation modal that clearly explains consequences before signing.

## MOTION

- countdown updates every second
- ECG is slightly irregular
- status transitions are subtle
- no flashing
- no alarm sound
- no chaotic animation

---

# PAGE 6: CLAIM PORTAL

**Route:** `/claim`

## Objective

Design for beneficiaries who may not be crypto-native.

Make the path from discovery to settlement obvious.

## HERO

Use a pale crimson atmospheric section.

Headline:

```text
Locker Heartbeat
Flatlined
```

Show a minimal crimson flatline ECG.

Supporting explanation:

> The configured Heartbeat and Contest Window have completed. Eligible beneficiaries can now unlock and settle their allocation.

## VAULT DISCOVERY

Show finalized vault cards where the connected wallet is an eligible beneficiary.

Each card:

```text
LOCKER
Vault ID

ASSET
ETH

STATUS
FINALIZED

YOUR ALLOCATION
••••
```

Do not reveal sibling allocations.

## CLAIM PROGRESSION

Use three explicit stages.

### 01 UNLOCK ALLOCATION

Button:

`UNLOCK ALLOCATION TO CLAIM`

Explain:

> Sign once to decrypt your allocation locally. Your private key never needs to be entered into Cadence.

States:
- Ready
- Signing
- Decrypting
- Unlocked

### 02 VERIFY PROOF

Show:

```text
MERKLE PROOF

● ROOT FOUND
● INCLUSION VERIFIED
● ALLOCATION AUTHENTICATED
```

Keep this understandable.

Provide a `Technical Details` accordion for advanced users.

### 03 EXECUTE INHERITANCE CLAIM

Button:

`EXECUTE INHERITANCE CLAIM`

Support:
- lump-sum settlement
- Cadence Stream

For streams:

```text
STREAMING

0.00000231 ETH / SEC

RECEIVED
0.0184 ETH
```

Animate only the numeric update, not the whole page.

---

# PAGE 7: CLAIM SUCCESS

**Route:** `/claim/success`

## Objective

Create a calm final confirmation.

No confetti.
No gamification.

Show:

```text
INHERITANCE CLAIM SETTLED

● CONFIRMED

0.8400 ETH

TRANSFERRED TO
0xABCD...1234
```

Include:
- transaction hash
- network
- timestamp
- Locker ID
- settlement type

Actions:

`VIEW TRANSACTION`

`RETURN TO CLAIM PORTAL`

Use white space and a restrained success accent.

---

# PAGE 8: NETWORK / SYSTEM STATUS

**Route:** `/network`

## Objective

Provide technical transparency without becoming a developer console.

Header:

```text
Network
Cadence system status and synchronization.
```

Status cards:

```text
SEPOLIA
● OPERATIONAL

RPC
● SYNCHRONIZED

LOCKER CONTRACT
● VERIFIED

GUARDIAN CONSENSUS
● OPERATIONAL

INDEXER
● SYNCHRONIZED
```

Technical values:
- Latest block
- Block timestamp
- RPC latency
- Indexer sync age
- Contract address
- Chain ID

Use JetBrains Mono for technical values.

Use `Technical Details` accordions.

---

# PAGE 9: SECURITY / PROTOCOL INFORMATION

**Route:** `/security`

## Objective

Explain security architecture in plain English first and technical detail second.

Header:

```text
Security
Understand what Cadence protects, what it does not expose, and how the protocol moves inheritance from signal to settlement.
```

Sections:

1. Self-custody
2. Client-side encryption
3. Guardian consensus
4. Merkle commitments
5. Heartbeat mechanism
6. Contest Window
7. EIP-712 emergency reset
8. Beneficiary privacy
9. On-chain settlement

For every section:

```text
WHAT IT DOES
WHY IT MATTERS
TECHNICAL DETAIL
```

Technical detail is collapsed by default.

Never claim unhackable, fully audited, or guaranteed secure without evidence.

---

# PAGE 10: DOCUMENTATION / HELP

**Route:** `/help`

## Objective

Create a concise operational help center.

Categories:

```text
GETTING STARTED
VAULTS
HEARTBEATS
GUARDIANS
BENEFICIARIES
CONTEST WINDOW
CLAIMS
SECURITY
NETWORK
```

Include:
- search
- category cards
- FAQ rows
- technical-detail accordions

Emergency section:

> My Locker entered the Contest Window. What do I do?

Explain the Reset Protocol in simple language.

Do not make it look like a marketing blog.

---

# PAGE 11: RESPONSIVE MOBILE EXPERIENCE

## Objective

Adapt every page without losing the light editorial language.

### Navigation

Replace the desktop sidebar with a drawer.

Keep:
- Cadence logo
- network state
- wallet state

### Layout

Stack cards vertically.

Keep:
- countdown prominent
- ECG visible
- critical actions full-width
- technical values readable

### Mobile hero

Use:
- 40 to 48px headline
- short readable text width
- full-width primary CTA
- product visualization below the text

### Product visualization

Convert floating desktop cards into a stacked mobile composition instead of shrinking the desktop version into unreadable cards.

---

# PAGE 12: GLOBAL STATES

Implement consistent global states across the application.

## LOADING

Use light skeletons and restrained shimmer.

No dark loading screen.

## WALLET DISCONNECTED

```text
CONNECT WALLET
```

## WRONG NETWORK

```text
NETWORK MISMATCH

Cadence currently requires Sepolia.

[ SWITCH NETWORK ]
```

## TRANSACTION PENDING

```text
TRANSACTION PENDING

AWAITING NETWORK CONFIRMATION
```

## SUCCESS

Use white surface plus success accent and explicit confirmation.

## FAILURE

Use pale error surface, explanation and recovery action.

## EMPTY CLAIM STATE

```text
NO LOCKERS FOUND

No finalized inheritance allocations are associated with this wallet.
```

Do not use a generic illustration.

---

# SHARED COMPONENT SYSTEM

Build the component system before building the pages independently.

Required components:

```text
AppShell
PublicNavbar
MobileNavbar
Sidebar
TopBar
StatusIndicator
ECGChart
HeartbeatCard
Countdown
WalletButton
WalletModal
AddressDisplay
BalanceDisplay
StatusBadge
Button
Input
Select
Card
Modal
ConfirmationPanel
GuardianRow
BeneficiaryRow
AllocationValidator
TransactionStatus
ProofStatus
VaultCard
StepIndicator
MetricCard
Accordion
Tabs
```

Each component must use the design tokens instead of page-specific hardcoded styling.

---

# LANDING VISUAL CHECK

The landing page should roughly read as:

```text
WHITE CANVAS

Small announcement strip

[ CADENCE ]  Product  How it works  Security  Docs  [ Connect Wallet ]

        LIFE HAS A RHYTHM.
        THIS PROTOCOL LISTENS FOR IT.

        Short explanation.
        [ CONNECT WALLET TO BEGIN ]

                          floating UI cards
                          ACTIVE SIGNAL
                          NEXT CHECK-IN
                          GUARDIANS
                          PROTECTED BALANCE

────────────────────────────────────────

              PRODUCT PREVIEW

────────────────────────────────────────

        SECURITY / EXPLANATION

────────────────────────────────────────

                KEEP THE SIGNAL ALIVE.
```

Whitespace is intentional.

---

# DASHBOARD VISUAL CHECK

```text
WHITE APP SHELL

SIDEBAR | TOP BAR
        |
        | Vault Pulse
        | Your inheritance protocol is active.
        |
        | ┌────────────────────────────────┐
        | │ ACTIVE SIGNAL                  │
        | │ 72 BPM                         │
        | │ ECG                            │
        | │ NEXT CHECK-IN                  │
        | │ 42d : 18h : 35m : 12s          │
        | │ [ RECORD HEARTBEAT NOW ]       │
        | └────────────────────────────────┘
        |
        | ┌────────────┐ ┌───────────────┐
        | │ BALANCE    │ │ GUARDIANS     │
        | └────────────┘ └───────────────┘
```

The dashboard should be spacious, not dense for the sake of density.

---

# FINAL AGENT INSTRUCTION

Build Cadence as one coherent premium product.

Do not make every page a separate design system.

The visual language must remain consistent across public and authenticated experiences.

## Priority order

1. Correct product behavior
2. Clear system state
3. User trust
4. Reversibility
5. Privacy
6. Financial precision
7. Accessibility
8. Editorial visual polish
9. Motion
10. Technical detail

## FINAL VISUAL TEST

If the result looks like:
- dark crypto terminal
- crypto exchange
- hacker dashboard
- neon Web3 landing page
- generic SaaS admin template

then it is wrong.

If it looks like:
- premium modern fintech
- polished infrastructure platform
- editorial SaaS landing page
- calm self-custodial financial product

while still clearly communicating Heartbeat, Guardians, Contest Window and inheritance, then the visual implementation is correct.
