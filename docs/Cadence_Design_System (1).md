# Cadence Frontend Design System
## Light Editorial Direction for the Sequence-inspired Visual Reference

**Product:** Cadence  
**Category:** Self-custodial Web3 digital inheritance and crypto estate-planning dApp  
**Core concept:** An on-chain Heartbeat protocol that detects configured inactivity, provides a reversible Contest Window, and enables beneficiary settlement after the configured threshold.

---

# 1. SOURCE OF TRUTH

This system intentionally separates product requirements from visual direction.

### Product / UX source
Use the Cadence product design document for:
- the five core views and routes
- owner, guardian and beneficiary journeys
- Heartbeat / Proof-of-Life behavior
- Guardian consensus
- beneficiary allocations and 10,000 BPS validation
- Contest Window behavior
- Merkle proof verification
- EIP-712 Reset Protocol behavior
- supported assets and provisioning fields
- Cadence Streams
- security explanations and terminology

The source document defines the core five-view App Shell: Connect / Landing, Vault Pulse Dashboard, Create Vault, Contest Window, and Claim Portal. It also defines the required Heartbeat, guardian, allocation, countdown, and claim interactions. fileciteturn1file5L1-L12

### Visual source
Use the supplied Sequence reference video for:
- light / white-first visual language
- editorial typography
- generous whitespace
- centered public navigation
- black primary CTA treatment
- rounded white cards
- light borders and subtle shadows
- floating product UI compositions
- thin connector lines
- soft cyan / lavender / purple / coral atmosphere
- wallet modal composition
- restrained entrance and hover motion

**Do not clone Sequence.** Do not copy its logo, copy, exact layouts, illustrations, or product UI. Recreate the visual discipline for Cadence.

---

# 2. CRITICAL STYLE OVERRIDE

## DO NOT BUILD THE OLD DARK TERMINAL VERSION.

The previous Cadence direction was too heavily influenced by the original dark terminal concept. The supplied video establishes the desired visual direction.

Cadence should feel like:

> **Premium fintech × editorial SaaS × Web3 infrastructure × subtle futuristic product UI**

The interface must be:
- light
- premium
- calm
- spacious
- precise
- product-led
- technically credible
- understandable to non-crypto-native heirs
- serious without looking intimidating

The original product document's dark palette and terminal styling are **not** the default visual theme. Preserve the product behavior and vocabulary, but implement the visual system below.

---

# 3. VISUAL CHARACTER

## Overall composition

Think:

```text
WHITE CANVAS

Large editorial headline
Short explanation
Black primary action

Floating Cadence product UI
Soft atmospheric color
Thin connector lines

Generous whitespace

Clean product cards
Clear state communication
```

## Design priorities

1. Typography
2. Whitespace
3. Product visualization
4. Information hierarchy
5. Restrained color
6. State clarity
7. Motion

## Avoid

- dark terminal screens
- neon crypto aesthetics
- exchange-style dashboards
- excessive purple
- huge 3D coins
- cartoon mascots
- generic SaaS illustrations
- excessive glassmorphism
- noisy particle backgrounds
- giant shadows
- over-rounded everything
- cluttered dashboards
- constant animation

---

# 4. COLOR TOKENS

The uploaded product design document also specifies a light token set with white backgrounds, black text, light borders, soft cyan/lavender atmosphere, and semantic success/warning/error colors. fileciteturn1file5L1-L7

```css
:root {
  /* Base */
  --background-primary: #FFFFFF;
  --background-secondary: #F7F8FA;
  --background-tertiary: #F1F3F5;

  /* Text */
  --foreground-primary: #111111;
  --foreground-secondary: #5F6368;
  --foreground-muted: #8A8F98;

  /* Borders */
  --border-primary: #D9DCE1;
  --border-secondary: #E8EAED;
  --border-hover: #AEB3BB;

  /* Optional dark utility surfaces */
  --dark-primary: #0B0B0D;
  --dark-secondary: #151518;
  --dark-tertiary: #222225;
  --dark-text-primary: #FFFFFF;
  --dark-text-secondary: #A7A7AD;

  /* Brand atmosphere */
  --cyan-50: #CFFBF7;
  --cyan-100: #B8F5F0;
  --lavender-50: #D8DEFF;
  --lavender-100: #C5CEFF;
  --blue-muted: #9BAEFF;

  /* Product accent */
  --purple: #7C5CFF;
  --purple-soft: #F0ECFF;

  /* Semantic */
  --success: #22A06B;
  --success-background: #E9F8F1;
  --warning: #D99A00;
  --warning-background: #FFF6D8;
  --error: #D64545;
  --error-background: #FDECEC;
  --info: #4C72FF;
  --info-background: #EEF2FF;

  /* Atmospheric coral */
  --coral: #F58A78;
  --coral-soft: #FFF0EC;
}
```

### Color rules

- 80 to 90 percent of the interface should be white / near-white / gray / black.
- Black is the default primary CTA color.
- Purple is an accent, not the dominant brand color.
- Cyan and lavender are primarily atmospheric and product-visualization colors.
- Coral can be used for announcement strips or secondary atmospheric details.
- Teal/green is reserved for genuinely active or verified states.
- Amber is reserved for warning and Contest Window states.
- Crimson is reserved for critical, finalized, or failed states.
- Never use status colors purely for decoration.

---

# 5. GRADIENT TOKENS

Keep gradients soft and low saturation. The source document specifies a soft hero gradient and brand gradient. fileciteturn1file5L1-L2

```css
--gradient-hero: linear-gradient(
  180deg,
  #D9FFFA 0%,
  #F7F8FC 50%,
  #C9D4FF 100%
);

--gradient-brand: linear-gradient(
  135deg,
  #CFFBF7 0%,
  #D8DEFF 100%
);

--gradient-soft: linear-gradient(
  135deg,
  #F7F8FA 0%,
  #FFFFFF 55%,
  #F1EFFF 100%
);
```

**Rule:** the gradient supports the product. It must never become the product.

---

# 6. TYPOGRAPHY

The product document specifies Inter or Geist, with JetBrains Mono for technical interfaces. fileciteturn1file5L1-L3

## Primary

Preferred:
- Inter
- Geist

Alternatives:
- Manrope
- Satoshi
- Plus Jakarta Sans

Use one primary family consistently.

## Monospace

JetBrains Mono is reserved for:
- countdowns
- wallet addresses
- transaction hashes
- balances
- BPM
- chain IDs
- block numbers
- contract addresses
- technical metadata

Do not make the whole interface monospace.

## Type scale

```text
display-xl = 72px / 0.95 / 700
display-lg = 64px / 1.00 / 700
display-md = 56px / 1.02 / 700

heading-xl = 48px / 1.05 / 700
heading-lg = 36px / 1.10 / 700
heading-md = 28px / 1.20 / 650
heading-sm = 22px / 1.25 / 650

body-lg = 18px / 1.60 / 400
body-md = 16px / 1.60 / 400
body-sm = 14px / 1.50 / 400

label = 13px / 1.40 / 600
caption = 12px / 1.30 / 600
code = 13px / 1.60 / 400
```

## Editorial hero

```text
Desktop: 64 to 72px
Weight: 700
Line-height: 0.95 to 1.02
Letter-spacing: -0.04em
Max-width: 720px
```

The hero should feel editorial, not like a developer console.

## Responsive hero

```text
Tablet: 52 to 60px
Mobile: 40 to 48px
```

---

# 7. SPACING TOKENS

Use the 4px base system from the source design document. fileciteturn1file5L1-L3

```text
space-1  = 4px
space-2  = 8px
space-3  = 12px
space-4  = 16px
space-5  = 20px
space-6  = 24px
space-8  = 32px
space-10 = 40px
space-12 = 48px
space-16 = 64px
space-20 = 80px
space-24 = 96px
space-32 = 128px
```

## Page spacing

```text
Navbar height: 64 to 72px
Hero top padding: 96 to 128px
Hero bottom padding: 100 to 140px
Section padding: 96 to 140px
Card padding: 24 to 32px
Large card padding: 32 to 40px
Grid gap: 20 to 24px
Container padding: 24 to 40px
```

The marketing page should breathe. The authenticated app can be denser but must remain light and readable.

---

# 8. CONTAINER SYSTEM

```text
container-sm = 640px
container-md = 768px
container-lg = 1024px
container-xl = 1200px
container-2xl = 1280px
```

Default:

```css
max-width: 1200px;
margin: 0 auto;
padding-inline: 24px;
```

Use up to 1280px for large product compositions.

Text-heavy blocks should normally stay around 560 to 700px.

---

# 9. RADIUS SYSTEM

The target visual language uses controlled rounded geometry. The source design document specifies 6 to 24px radii and full pills for compact statuses. fileciteturn1file5L1-L3

```text
radius-sm  = 6px
radius-md  = 8px
radius-lg  = 12px
radius-xl  = 16px
radius-2xl = 20px
radius-3xl = 24px
radius-full = 9999px
```

Recommended:

```text
Buttons: 8 to 12px
Inputs: 8px
Cards: 12 to 16px
Large panels: 20 to 24px
Status pills: full
Wallet controls: full or 10px
```

Do not make every element a pill.

---

# 10. BORDERS AND SHADOWS

## Borders

```css
border: 1px solid #D9DCE1;
```

Secondary:

```css
border: 1px solid #E8EAED;
```

Hover:

```css
border-color: #AEB3BB;
```

## Shadows

The source specifies a border-first system with restrained shadows. fileciteturn1file5L1-L3

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.06);
--shadow-lg: 0 12px 32px rgba(0,0,0,0.08);
```

Use shadows mainly for:
- wallet modal
- dropdowns
- floating UI
- confirmation overlays

Normal cards should primarily rely on borders.

---

# 11. NAVIGATION

## Public navigation

Use a clean centered max-width navbar.

```text
[ Cadence ]       Product   How it works   Security   Docs       [ Connect Wallet ]
```

Characteristics:
- white background
- small restrained wordmark
- dark text
- generous horizontal spacing
- black rounded primary button
- optional tiny cyan/purple logo accent

## Authenticated shell

The source product architecture requires a persistent App Shell with a left sidebar and top bar. Preserve that structure, but style it in the light visual language. fileciteturn1file5L1-L2

```text
┌───────────────┬───────────────────────────────────────────┐
│ CADENCE       │ SEPOLIA   SYNCED   Wallet                 │
│               ├───────────────────────────────────────────┤
│ OVERVIEW      │                                           │
│ Vault Pulse   │ Main workspace                            │
│ Create Vault  │                                           │
│ Contest       │                                           │
│ Claim Portal  │                                           │
│               │                                           │
│ SYSTEM        │                                           │
│ Documentation │                                           │
│ Security      │                                           │
│ Network       │                                           │
└───────────────┴───────────────────────────────────────────┘
```

Sidebar:
- white
- 1px border
- compact navigation
- subtle active background
- no dark panels

---

# 12. BUTTONS

The source token set specifies black primary buttons at 44 to 48px high. fileciteturn1file5L1-L3

## Primary

```text
height: 44 to 48px
padding: 0 20px
radius: 8 to 12px
font-size: 14px
font-weight: 600
background: #0B0B0D
color: #FFFFFF
```

Hover:
- translateY(-1px)
- subtle opacity or background change
- no glow

## Secondary

```text
height: 44 to 48px
padding: 0 20px
radius: 8 to 12px
background: transparent
border: 1px solid #D9DCE1
color: #111111
```

## Critical

Use amber or crimson only when the product state warrants it. The Contest Window's Reset Protocol may be visually dominant because it is the safety action.

---

# 13. CARDS

```text
background: #FFFFFF
border: 1px solid #D9DCE1
radius: 12 to 16px
padding: 24 to 32px
```

Cards are product surfaces, not decorative containers.

Each card should have:
- title
- primary value or message
- supporting context
- optional status
- action when needed

Avoid creating cards solely to fill a grid.

---

# 14. INPUTS AND FORMS

```text
height: 44 to 48px
radius: 8px
border: 1px solid #D9DCE1
background: #FFFFFF
padding-inline: 14px
font-size: 14 to 16px
```

Focus:
- visible focus ring
- purple or blue focus indicator
- never rely only on shadow

Errors:
- error text
- error border
- icon or text where useful
- never rely on color alone

---

# 15. PRODUCT VISUALIZATION

The hero should use a composed product visualization rather than a giant screenshot.

Build floating Cadence cards such as:

```text
┌─────────────────┐
│ ACTIVE SIGNAL   │
│ 72 BPM          │
└─────────────────┘
       \   thin line
        ┌────────────────┐
        │ NEXT CHECK-IN  │
        │ 42d : 18h      │
        └────────────────┘
```

Other floating cards:
- Guardian consensus
- Protected balance
- Heartbeat interval
- Contest Window
- Network sync

Use white cards, subtle borders, soft shadows, tiny accent blocks, thin connector lines, and soft cyan/lavender atmospheric shapes.

The visualization must still be functional-looking Cadence UI.

---

# 16. WALLET MODAL

The wallet modal should visually follow the reference video's clean modal treatment.

```text
blurred backdrop
      ↓
centered white modal
      ↓
heading
wallet options
network information
close control
```

```text
background: #FFFFFF
radius: 16 to 20px
shadow: shadow-lg
padding: 24 to 32px
max-width: 420px
```

Wallet options:
- MetaMask
- Rabby
- WalletConnect

Each option needs:
- icon
- name
- clear hover state
- loading state
- connection state

Never request or display a private key.

---

# 17. HEARTBEAT / ECG

ECG remains a key Cadence identity, but it must be integrated into the light visual system.

### Active
- teal line
- calm rhythm
- white / near-white canvas

### Contest Window
- amber line
- irregular rhythm
- pale amber atmosphere

### Flatlined
- crimson line
- minimal flatline
- pale red atmosphere

The ECG communicates state. It is not decorative wallpaper.

---

# 18. COUNTDOWN

Use JetBrains Mono and tabular numbers.

```text
42d : 18h : 35m : 12s
```

The countdown should be large and easy to scan, with small secondary labels.

Do not add glow or excessive animation.

---

# 19. STATUS COMPONENTS

Examples:

```text
● ACTIVE
● VERIFIED
● SYNCED
● PENDING
● CLAIM PENDING
● FINALIZED
● FAILED
```

Status pills can use `radius-full`, but should remain compact.

Always pair color with text.

---

# 20. PRIVACY UI

Protected balances support a shoulder-surfing toggle.

Visible:

```text
12.5000 ETH
```

Hidden:

```text
•••••••• ETH
```

Control:

```text
Show
Hide
```

Sensitive values should not be exposed by default in public-facing contexts.

---

# 21. MOTION

The source specifies 150ms to 800ms motion and restrained hover/entrance movement. fileciteturn1file5L1-L2

```text
duration-fast   = 150ms
duration-normal = 250ms
duration-medium = 400ms
duration-slow   = 600ms
duration-hero   = 800ms
```

```css
ease-standard = cubic-bezier(0.2, 0.8, 0.2, 1);
ease-in-out = cubic-bezier(0.4, 0, 0.2, 1);
```

Allowed:
- sequential hero fade-up
- floating card drift of 1 to 4px
- ECG animation
- countdown updates
- tabs
- accordions
- modal fade/scale
- button hover
- card hover
- status transitions

Avoid:
- bounce
- large parallax
- particles
- confetti
- constant movement
- flashing alerts

Respect `prefers-reduced-motion`.

---

# 22. RESPONSIVE RULES

### Desktop
`>= 1200px`
- editorial two-column hero
- floating product visualization
- sidebar app shell
- multi-column metrics

### Tablet
`768 to 1199px`
- smaller hero
- reduced gaps
- compact sidebar or navigation
- stack secondary sections where needed

### Mobile
`< 768px`
- sidebar becomes drawer
- top bar remains visible
- one-column cards
- full-width critical actions
- countdown remains prominent
- ECG remains visible
- floating product cards become a stacked composition
- no page-level horizontal overflow

---

# 23. ACCESSIBILITY

Required:
- semantic HTML
- keyboard navigation
- visible focus states
- accessible modal focus management
- ARIA labels for icon-only controls
- status text plus color
- accessible form errors
- screen-reader labels for wallet and transaction controls
- reduced-motion support
- sufficient contrast

---

# 24. COPY SYSTEM

Tone:
- restrained
- precise
- direct
- plain-English
- financial / technical
- reassuring

Never use Web3 hype or slang.

Preferred terminology:

```text
Locker
Heartbeat
Proof-of-Life
Reset Protocol: I'm Alive
Contest Window
Guardian
Beneficiary
Allocation
Inheritance Claim
```

Prefer Cadence terms over generic terms:
- Locker instead of generic contract
- Heartbeat instead of dead-man switch
- Proof-of-Life instead of uptime check
- Reset Protocol: I'm Alive instead of cancel transaction

Do not claim:
- 100% unhackable
- fully audited
- guaranteed secure

unless actual project evidence supports the statement.

---

# 25. PRODUCT STATES

## Active

White / near-white surface, teal status accent, calm ECG, visible next check-in.

## Contest Window

Pale amber surface, amber ECG, large countdown, dominant Reset Protocol action.

## Finalized / Claim

Pale crimson surface, crimson flatline, explicit three-step claim progression.

## Pending

Neutral or amber status, restrained progress indicator, clear explanation.

## Success

White surface, green/teal accent, explicit transaction confirmation.

## Failure

Pale error surface, clear reason, recovery action.

---

# 26. FINAL DESIGN PRINCIPLES

1. Typography before ornament.
2. Whitespace before clutter.
3. Product state before decoration.
4. Black primary actions before colorful CTAs.
5. Borders before heavy shadows.
6. Technical detail should be progressive.
7. Every signature should explain what it does before execution.
8. Emergency states should feel urgent but not chaotic.
9. Financial values should be privacy-aware.
10. The visual system should feel premium without becoming flashy.
11. Cadence must remain unmistakably its own product.
12. The UI should make inheritance state understandable in seconds.

---

# 27. FINAL AGENT CHECKLIST

- [ ] Light-first background
- [ ] Large editorial typography
- [ ] Black primary CTA
- [ ] White cards
- [ ] Light borders
- [ ] Controlled rounded corners
- [ ] Generous whitespace
- [ ] Small accent colors
- [ ] No dark terminal default
- [ ] No neon crypto aesthetic
- [ ] No excessive purple
- [ ] No giant 3D crypto imagery
- [ ] No excessive glassmorphism
- [ ] No cluttered dashboard
- [ ] Cadence product behavior preserved
- [ ] Heartbeat state clear
- [ ] Contest Window state clear
- [ ] Claim state clear
- [ ] Wallet states explicit
- [ ] Transaction states explicit
- [ ] Privacy toggle implemented
- [ ] Responsive behavior intentional
- [ ] Reduced-motion behavior implemented
