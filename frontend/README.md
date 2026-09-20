# Cadence Protocol — Frontend

The web application for **Cadence Protocol**, built with **Next.js 15 (App Router)**, **Viem**, **Wagmi v2**, and custom vanilla CSS following the clinical **Light Editorial ("Pulse")** design system inspired by modern fintech craft.

---

## Complete 12-Page Architecture & Route Directory

Cadence implements the complete 12-page specification defined in `docs/Cadence_Page_Prompts (1).md` and `docs/Cadence_Design_System (1).md`:

| Page / Component | Route | Key Features & On-Chain Mechanics |
| :--- | :--- | :--- |
| **Page 1: Landing Page** | `/` | Editorial split-hero with live Sepolia telemetry strip (`ACTIVE SIGNAL`, `NEXT CHECK-IN`, `GUARDIANS: 2/2 VERIFIED`, `PROTECTED BALANCE`), product preview with interactive ECG card and streaming showcase, security architecture grid, and final CTA. |
| **Page 2: Create Locker / Vault** | `/vault/create` | 5-step intuitive provisioning wizard, rapid heartbeat interval presets (**5 Min (TEST)** and **10 Min (TEST)** alongside standard 30d/90d/180d intervals), 1-click atomic deployment via `OneClickInheritanceVault.sol`, client-side ECIES encryption, dual guardian configuration, and Cadence Streams toggle. |
| **Page 3: Vault Pulse Dashboard** | `/dashboard` | Primary heartbeat monitor card, live SVG ECG oscilloscope (62 BPM normal, 92 BPM erratic, 0 BPM flatline), countdown ticker, quick-adjust interval modal, protected balance with shoulder-surfing mask (`SHOW / HIDE`), guardian consensus quorum status, and EIP-712 email notification binding. |
| **Page 4: Heartbeat Check-In Flow** | `/dashboard` (Action) | One-click Proof-of-Life check-in executing on Sepolia via direct EOA transaction or sponsored ERC-4337 verifying paymaster (Pimlico), with instant optimistic UI update and confirmation toast. |
| **Page 5: Contest Window & Emergency Reset** | `/contest` | 72-hour reversible challenge countdown, irregular amber ECG monitor, EIP-712 stealth reset (`cancelClaimWithSig`) ensuring **Constraint #1 (Zero Gas Linkage)**, guardian attestation verification, and contest finalization. |
| **Page 6: Beneficiary Claim Portal** | `/claim` | Client-side ECIES private allocation decryption with deterministic signature-derived keys (zero raw private key inputs), double-hashed Merkle verification, live 100ms streaming accrual ticker, and anti-drainer circuit breakers (`pauseStream`, `redirectStream`). |
| **Page 7: Claim Settlement Receipt** | `/claim/success` | Calm, finalized confirmation receipt ("Inheritance Claim Settled"), transaction hash link to Etherscan, network badge, and clean whitespace. Zero confetti or gamification. |
| **Page 8: Network & System Status** | `/network` | Technical transparency dashboard showing live Sepolia block sync height, RPC latency, verified contract addresses with Etherscan links, Chain ID (11155111), and comprehensive telemetry values. |
| **Page 9: Security Architecture** | `/security` | Focused architectural overview across all 9 protocol security pillars: Self-custody, Client-side encryption, Guardian consensus, Merkle commitments, Heartbeat mechanism, Contest Window, EIP-712 emergency reset, Beneficiary privacy, and On-chain settlement. |
| **Page 10: Documentation & Help Center** | `/help` | 9 operational categories, full-text client search, expandable FAQs, and a prominent Emergency Safety-Valve Section explaining how to execute the Reset Protocol if a locker enters the Contest Window. |
| **Page 11: Mobile Responsive Navigation** | Global | Responsive mobile navigation drawer (`MobileNavbar`), vertically stacked cards, responsive typography, and full-width touch actions preserving the complete desktop capability. |
| **Page 12: Global System States** | Global (`GlobalStates.tsx`) | Consistent global states: light shimmer skeletons, wallet disconnected modal callout, wrong-network mismatch banner with 1-click Sepolia switch, transaction pending overlay, and clean empty state. |

---

## Design System: Light Editorial Craft

Cadence adheres to a human-designed, clinical aesthetic:
- **Paper Canvas**: Subtle off-white canvas `#F7F9FC` with elevated bordered shells (`.landing-shell`, `.app-shell`).
- **Deep Ink Typography**: High-contrast `#09090B` and `#0E1526` headings with tight tracking (`tracking-[-0.05em]`) using modern Inter and monospace telemetry fonts (JetBrains Mono / IBM Plex Mono).
- **Solid Surfaces & Crisp Borders**: Pure `#FFFFFF` panels with deliberate `1px solid #ECE9EF` or `rgba(220, 216, 226, 0.9)` structural borders and restrained ground shadows.
- **Zero AI-Style Diffuse Gradients**: No diffuse rainbow blur blobs (`blur-3xl`), ensuring the UI looks human-designed, institutional, and precise.
- **Flat Semantic Status Pills**: Crisp, solid badges (`.status-pill.live`, `.status-pill.contest`, `.status-pill.done`).
- **Telemetry Indicators**: Real-time SVG oscilloscope ECG monitors reflecting live on-chain heartbeat states.

---

## Monorepo Security & Policy Compliance

Cadence enforces strict security policies across all frontend and backend code:
- **Zero Frontend Secret Leakage**: All keys reside in `.env` files; frontend code accesses only public, whitelisted configuration.
- **Strict Content Security Policy (CSP)**: `default-src 'self'`, `frame-ancestors 'none'`, zero `eval()`, zero inline executable scripts, and sanitized HTML rendering via DOMPurify (`frontend/lib/sanitize.ts` and `SafeHtml.tsx`).
- **Full Security Test Suite**: 11/11 automated security regression tests passing in `notifications/test/security.test.ts`.
- **Zero Vulnerabilities**: Dependencies pinned with overrides (`overrides: { "ws": "^8.20.2" }`), yielding 0 vulnerabilities on `npm audit`.

---

## High-Availability Multi-RPC Failover Pool

To prevent HTTP 429 rate-limiting during testing and evaluation, `lib/contracts.ts` and `lib/wagmi.ts` implement Viem's `fallback([...])` pooling 5 Sepolia nodes:
1. `NEXT_PUBLIC_RPC_URL` (Primary custom RPC)
2. `https://ethereum-sepolia-rpc.publicnode.com` (PublicNode)
3. `https://rpc.sepolia.org` (Ethereum Foundation)
4. `https://1rpc.io/sepolia` (Automata 1RPC)
5. `https://sepolia.gateway.tenderly.co` (Tenderly Gateway)

---

## Deployment on Vercel

1. In the [Vercel Dashboard](https://vercel.com), import the repository.
2. Set **Root Directory** to `frontend` (leave Build & Output settings at default Next.js).
3. Copy environment variables from `.env.production.example`:
   ```env
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   NEXT_PUBLIC_VAULT_ADDRESS=0x043d02c39B86CAd83E1Bf05728D32d24f6289e74
   NEXT_PUBLIC_DEMO_VAULT_ADDRESS=0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1
   NEXT_PUBLIC_CONSENSUS_ADDRESS=0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1
   NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS=0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863
   NEXT_PUBLIC_STEALTH_REGISTRY_ADDRESS=0x583eC2de840034478a61EF572cea2904bFD8671E
   NEXT_PUBLIC_FACTORY_ADDRESS=0x30489c0f3566AF47b71867bc992408B91E500823
   NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key_here
   NEXT_PUBLIC_NOTIFICATION_URL=https://cadence-notifications.onrender.com
   ```
4. Deploy! Production security headers and edge caching are configured in `vercel.json` and `next.config.ts`.

---

## Local Development & Quality Gates

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting (0 errors, 0 warnings enforced)
npm run lint

# Run strict TypeScript typechecking
npx tsc --noEmit

# Run security regression suite (in notifications/)
cd ../notifications && npm run test:security
```
