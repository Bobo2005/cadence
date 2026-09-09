# Cadence Protocol — Frontend

The web application for **Cadence Protocol**, built on **Next.js 16 (App Router + Turbopack)**, **Viem**, **Wagmi**, and custom vanilla CSS following the clinical **"Pulse"** cyber-minimalism design system.

---

## Key Features

1. **Vault Pulse Dashboard (`/dashboard`)**:
   - Live on-chain telemetry for Ethereum Sepolia vaults.
   - Real-time oscilloscope ECG monitor reacting dynamically to consensus state (`active` 62 BPM, `erratic` 92 BPM, `flatline` 0 BPM).
   - Dynamic countdown ticker reflecting on-chain `lastActiveTimestamp` and `checkInInterval`.
   - **`[⚡ Adjust Interval]`**: Interactive on-chain modal to switch check-in frequency to **5 Min (Test)** or **10 Min (Test)** or back to production intervals directly on Sepolia.

2. **Sequential Multi-Step Vault Provisioning (`/vault/create`)**:
   - 4-step progressive disclosure: (1) Deploy Vault, (2) Deposit Capital, (3) Merkle Allocation Root, (4) Guardian Consensus Root.
   - Step 3 features native **5 Min (Test)** and **10 Min (Test)** presets alongside 30d–180d intervals.
   - Resilient `localStorage` session persistence with step-by-step resume.

3. **Contest Window & Stealth Cancellation (`/contest`)**:
   - Live 72-hour challenge timer.
   - Demonstrates **Constraint #1 (Zero Gas-Linkage)**: living owner cancels contested claims off-chain via an EIP-712 stealth signature relayed with zero owner gas payment.

4. **Beneficiary Claim Portal (`/claim`)**:
   - Client-side **ECIES (secp256k1)** private allocation decryption — zero plaintext on-chain (Constraint #3).
   - **Safe In-Memory Key Derivation**: Completely eliminates raw private key text boxes from the user interface. Beneficiaries sign a cryptographic authorization message (`personal_sign` over deterministic salt `keccak256(sig)`) to derive the 32-byte ECIES decryption key strictly in-memory.
   - Pro-rata execution via `InheritanceVault.claim()`.
   - **Wrong-Wallet Recovery**: Privacy-preserving reminder email dispatcher for beneficiaries with multiple addresses.

---

## High-Availability Multi-RPC Failover Pool

To prevent HTTP 429 rate-limiting during high-volume hackathon judging, `lib/contracts.ts` and `lib/wagmi.ts` implement Viem's `fallback([...])` pooling 4 Sepolia nodes:
1. `NEXT_PUBLIC_RPC_URL` (Primary custom RPC)
2. `https://ethereum-sepolia-rpc.publicnode.com` (PublicNode)
3. `https://rpc.sepolia.org` (Ethereum Foundation)
4. `https://1rpc.io/sepolia` (Automata 1RPC)
5. `https://sepolia.gateway.tenderly.co` (Tenderly Gateway)

---

## Deployment on Vercel

1. In the [Vercel Dashboard](https://vercel.com), import your repository.
2. If deploying from the repository root, the root `vercel.json` will automatically configure the build. Otherwise, set **Root Directory** to `frontend`.
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
   NEXT_PUBLIC_PIMLICO_API_KEY=pim_U7CousAoRpmdvs3fCC9kng
   NEXT_PUBLIC_NOTIFICATION_URL=https://cadence-notifications.onrender.com
   ```
4. Deploy! Static asset caching and security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) are configured in `vercel.json`.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Typecheck & Build
```bash
npx tsc --noEmit    # Typecheck (0 errors)
npm run build        # Production Next.js 16 build
```
