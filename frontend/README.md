# Cadence Protocol — Frontend

The web application for **Cadence Protocol**, built on **Next.js 16 (App Router + Turbopack)**, **Viem**, **Wagmi**, and custom vanilla CSS following the clinical **"Pulse"** cyber-minimalism design system.

---

## Key Features

1. **Vault Pulse Dashboard (`/dashboard`)**:
   - Live on-chain telemetry for Ethereum Sepolia vaults.
   - Real-time oscilloscope ECG monitor reacting dynamically to consensus state (`active` 62 BPM, `erratic` 92 BPM, `flatline` 0 BPM).
   - Dynamic countdown ticker reflecting on-chain `lastActiveTimestamp` and `checkInInterval`.
   - **`[⚡ Adjust Interval]`**: Interactive on-chain modal to switch check-in frequency to **5 Min (Test)** or **10 Min (Test)** or back to production intervals directly on Sepolia.
   - **Automated Owner Heartbeat Alerts**: Built-in real-time monitor automatically evaluates heartbeat state against consensus. Dispatches an "Approaching Check-In" email warning when $\le 2$ minutes remain (or $\le 3$ days / 25% remaining on standard intervals) and an "Urgent: Overdue" email alert upon lapse via `/api/notify/owner-reminder` with cycle-keyed deduplication.

2. **1-Click Atomic Vault Provisioning (`/vault/create`)**:
   - **Reduced from 4 wallet signatures to 1 single transaction**: Uses `OneClickInheritanceVault.sol` to atomically bundle: (1) Contract Deployment, (2) Capital Deposit (`msg.value`), (3) Beneficiary Merkle Root Commitment, (4) Guardian Consensus Quorum Pairing, and (5) Custom Contest Window Configuration in one seamless wallet confirmation.
   - **Cadence Streams Trust Configuration (Step 3)**: Toggle on autonomous streaming trusts with duration presets (**5-Min Demo**, **12 Months**, **24 Months**, **4 Years**) and initial emergency buffers (**10% to 50%**), automatically executing `setStreamingConfig` during provisioning.
   - **Dual Guardian Configuration with Automated Alert Emails**: Dedicated side-by-side cards for Guardian Node 1 and Guardian Node 2 allow specifying both the on-chain consensus wallet address and an optional alert email, automatically synchronized to the background Sentinel daemon upon deployment.
   - Built-in **Rapid Testing Presets**: Supports fast heartbeat intervals (**5 Min** and **10 Min**) as well as fast challenge grace periods (**⚡ 5 Minutes Fast Testing**).
   - Resilient live status modal tracking the atomic setup and linking directly to Etherscan.

3. **Contest Window & Stealth Cancellation (`/contest`)**:
   - Live challenge countdown timer reflecting dynamic on-chain state (`Active` $\rightarrow$ `ClaimPending` $\rightarrow$ `Finalized`).
   - **Interactive Guardian Attestation**: Real-time connected guardian detection with **`[⚡ Attest Lapse]`** action buttons directly submitting on-chain Merkle proofs to `GuardianRegistry.sol`.
   - **Dynamic Quorum Tracking**: Smart trigger button enforces `isThresholdMet` on-chain, tracking progress from `Awaiting Guardian Quorum (0/2)` to **`[⚡ Trigger Contest Challenge Window]`**.
   - **Automated Guardian Email Dispatch (2 Distinct Alerts)**: Autonomous and client-side dispatch sending two separate, personalized email alerts to **Guardian Node 1** and **Guardian Node 2** when the heartbeat lapses, complete with vault address and direct links to attest.
   - **Automated Contest Concluded Alerts & Finalization**: Automatically dispatches contest-concluded alert emails to guardians and heirs upon countdown zero, and provides **`[⚡ Finalize Contest on Sepolia]`** to advance the locker to `Finalized`.
   - Demonstrates **Constraint #1 (Zero Gas-Linkage)**: living owner cancels contested claims off-chain via an EIP-712 stealth signature relayed with zero owner gas payment.

4. **Beneficiary Claim Portal & Cadence Streams (`/claim`)**:
   - Client-side **ECIES (secp256k1)** private allocation decryption — zero plaintext on-chain (Constraint #3).
   - **Safe In-Memory Key Derivation**: Completely eliminates raw private key text boxes from the user interface. Beneficiaries sign a cryptographic authorization message (`personal_sign` over deterministic salt `keccak256(sig)`) to derive the 32-byte ECIES decryption key strictly in-memory.
   - **Cadence Streams Real-Time Live Ticker (100ms)**: High-frequency client animation ticker computing accrued streaming ETH down to 7 decimal places in real-time, alongside a linear vesting progress bar and remaining countdown.
   - **Anti-Drainer Emergency Circuit Breakers**:
     - **`[⚡ Withdraw Accrued Stream]`**: Claims accrued streaming funds directly on Sepolia.
     - **`[⏸ Pause Stream]` / `[▶ Resume Stream]`**: Instantly halts unvested stream outflows on-chain if a wallet compromise is suspected. Consensus guardians can also pause using Merkle proofs (`pauseStreamWithGuardian`).
     - **Safe Cold Redirection Drawer**: Heirs and registered backup addresses can permanently migrate remaining streaming capital to a safe cold hardware wallet (`redirectStream`), stopping drainers in their tracks.
   - **Snapshot-Preserved Payouts**: Pro-rata execution via `InheritanceVault.claim()`, reading on-chain `distributionSnapshot` to preserve exact allocations across multi-heir claims.
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
2. Set **Root Directory** to `frontend` (leave Build & Output settings at default).
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
4. Deploy! Static asset caching and security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) are configured in `vercel.json`.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Code Quality & Production Build
```bash
npx eslint .        # ESLint check (0 errors, 0 warnings)
npx tsc --noEmit    # Strict TypeScript typecheck (0 errors)
npm run build        # Production Next.js 16 build with Turbopack
```
