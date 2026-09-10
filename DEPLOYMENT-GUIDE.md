# Cadence Protocol — Complete Production Deployment & Launch Guide

An end-to-end, production-ready runbook for deploying and launching the **Cadence Protocol** across:
1. **Smart Contracts** on **Ethereum Sepolia** (compiled with Solc 0.8.24 via Foundry).
2. **Notification Microservice** on **Render** (Node.js/Express + live Resend/SMTP delivery).
3. **Frontend Web Application** on **Vercel** (Next.js 16 App Router + Turbopack + Multi-RPC Failover).

---

## 1. System Deployment Topology

```
+-----------------------------------------------------------------------------------------+
|                                CADENCE PRODUCTION TOPOLOGY                              |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|       [ VERCEL ]                                                  [ RENDER ]            |
|  +-------------------------+                             +---------------------------+  |
|  | cadence.vercel.app      |                             | cadence-api.onrender.com  |  |
|  | (Next.js 16 App Router) |                             | (Express Microservice)    |  |
|  |                         |     EIP-712 Signature Bind  |                           |  |
|  | • Multi-RPC Failover    | --------------------------> | • EIP-712 Signature Check |  |
|  | • In-Memory ECIES Decrypt|                            | • Rate Limiting (10/15m)  |  |
|  | • Wagmi / Viem Connect  | <-------------------------- | • Protected Outbox & PII  |  |
|  | • Turbopack Optimized   |   Masked Status / Reminders | • Live Resend / SMTP      |  |
|  +-------------------------+                             +---------------------------+  |
|               |                                                         |               |
|               | Read/Write State                                        | Event Poll    |
|               v                                                         v               |
|  +-----------------------------------------------------------------------------------+  |
|  |                              ETHEREUM SEPOLIA TESTNET                             |  |
|  |                                                                                   |  |
|  | • InheritanceVault.sol           (0x043d02c39B86CAd83E1Bf05728D32d24f6289e74)     |  |
|  | • ProofOfLifeConsensus.sol       (0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1)     |  |
|  | • GuardianRegistry.sol           (0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863)     |  |
|  | • StealthAddressRegistry.sol     (0x583eC2de840034478a61EF572cea2904bFD8671E)     |  |
|  | • BalanceCommitment.sol          (0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC)     |  |
|  | • VaultFactory.sol               (0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0)     |  |
|  | • BeneficiarySmartAccount.sol    (0x30489c0f3566AF47b71867bc992408B91E500823)     |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Prerequisites & Credentials Checklist

Before beginning deployment, gather the following credentials:

| Credential / Tool | Purpose | Source / Signup |
| :--- | :--- | :--- |
| **Node.js $\ge$ 18.0.0** | Running local tooling and build checks | [nodejs.org](https://nodejs.org) |
| **Foundry (`forge`, `cast`)** | Smart contract compilation and deployment | [getfoundry.sh](https://getfoundry.sh) |
| **Sepolia Deployer Key** | Private key with $\ge$ 0.1 Sepolia ETH | [Sepolia Faucet](https://sepoliafaucet.com) or [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) |
| **Etherscan API Key** | Automated smart contract source verification | [etherscan.io/apis](https://etherscan.io/apis) |
| **Sepolia RPC URL** | High-throughput node endpoint | [PublicNode](https://ethereum-sepolia-rpc.publicnode.com), Alchemy, or Infura |
| **Render Account** | Hosting the notification microservice | [render.com](https://render.com) |
| **Vercel Account** | Hosting the Next.js frontend web app | [vercel.com](https://vercel.com) |
| **Pimlico API Key** *(Optional)* | ERC-4337 verifying paymaster sponsorship | [dashboard.pimlico.io](https://dashboard.pimlico.io) |
| **Resend API Key** *(Optional)* | Transactional email delivery (3,000/mo free) | [resend.com](https://resend.com) |

---

## 3. Preflight System Health Check

Run the automated preflight tool from the repository root to ensure your local environment is completely healthy:

```bash
node scripts/preflight-check.mjs
```

Expected output:
```text
=================================================================
  Preflight Summary
=================================================================
  ✓ SYSTEM IS 100% DEPLOYMENT READY!
```

---

## 4. Stage 1: Deploy & Verify Smart Contracts (Sepolia)

> [!NOTE]
> If you wish to use the official deployed contracts on Sepolia, you can skip deployment and copy the verified addresses directly into Stage 3!

### Step 1.1: Configure Contract Environment

Navigate to the `contracts/` directory and create your `.env` file:

```bash
cd contracts
cp .env.example .env
```

Populate the following variables in `contracts/.env`:

```env
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=0xYourPrivateKeyHere
ETHERSCAN_API_KEY=YourEtherscanApiKeyHere
```

### Step 1.2: Run Contract Test Suite (197 Tests)

Confirm all unit, integration, and security regression suites pass before broadcasting:

```bash
forge test
```
*Expected: 13 test suites, 197/197 tests passing with 0 failures.*

### Step 1.3: Broadcast Protocol Deployment to Sepolia

Execute the production deployment script [`Deploy.s.sol`](contracts/script/Deploy.s.sol):

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

The script deploys contracts in strict dependency order:
1. `StealthAddressRegistry.sol`
2. `GuardianRegistry.sol`
3. `BalanceCommitment.sol`
4. `ProofOfLifeConsensus.sol`
5. `InheritanceVault.sol` (standard 90-day interval)
6. Registers initial guardian root and sets consensus in `GuardianRegistry`
7. `VaultFactory.sol` (for creating fresh user vaults)
8. `BeneficiaryAccountFactory.sol` (ERC-4337 EntryPoint 0.7)

**Save the console output containing your newly deployed contract addresses.**

### Step 1.4: (Optional) Deploy Accelerated Demo Vault (5m Test Interval)

For live judge demonstrations or interactive testnet presentations, deploy an accelerated instance using [`DeployDemoVault.s.sol`](contracts/script/DeployDemoVault.s.sol):

```bash
DEMO_CHECK_IN_INTERVAL=180 DEMO_CONTEST_DURATION=900 forge script script/DeployDemoVault.s.sol:DeployDemoVault \
  --rpc-url $RPC_URL \
  --broadcast
```

---

## 5. Stage 2: Deploy Notification Microservice (Render)

The backend microservice handles cryptographic signature verification, rate-limited email binding, and alert dispatching.

### Option A: 1-Click Render Blueprint (Recommended)

1. Push your Cadence repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
3. Connect your repository. Render will automatically detect [`render.yaml`](render.yaml):
   - **Name**: `cadence-notifications`
   - **Runtime**: `Node`
   - **Build Command**: `cd notifications && npm install --include=dev && npm run build`
   - **Start Command**: `cd notifications && npm start`
   - **Health Check Path**: `/health`
4. Render automatically generates secure values for `ADMIN_API_KEY` and `CADENCE_INTERNAL_API_KEY`.
5. Under **Environment Variables**, set:
   - `CLIENT_URL`: `https://<your-vercel-app>.vercel.app` (or your custom domain).
   - *(Optional)* `RESEND_API_KEY`: `re_...` from [Resend](https://resend.com).
   - *(Optional)* `SMTP_FROM`: `Cadence Protocol <onboarding@resend.dev>`.
6. Click **Apply**.

### Option B: Manual Web Service Setup on Render

1. Click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Root Directory**: `notifications`
   - **Environment**: `Node`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Under **Environment Variables**, add:
   ```env
   PORT=3001
   NODE_ENV=production
   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   CLIENT_URL=https://<your-frontend>.vercel.app
   ADMIN_API_KEY=your-secure-admin-secret-key
   CADENCE_INTERNAL_API_KEY=your-secure-internal-secret-key
   DATA_DIR=./data
   ```
5. Set **Health Check Path** to `/health`.
6. Click **Create Web Service**.

### Step 2.1: Verify Notification Service Health

Once deployed, visit your Render URL in the browser or via curl:

```bash
curl https://<your-service>.onrender.com/health
```

Expected JSON response:
```json
{
  "status": "healthy",
  "service": "cadence-notifications",
  "constraint": "Constraint #6 (EIP-712 Verified Email Binding)",
  "uptimeSeconds": 42
}
```

---

## 6. Stage 3: Deploy Frontend Web App (Vercel)

The user interface is built on Next.js 16 (App Router + Turbopack) and connects directly to Sepolia and Render.

### Step 3.1: Connect Project on Vercel

1. In the [Vercel Dashboard](https://vercel.com), click **Add New...** $\rightarrow$ **Project**.
2. Select your GitHub repository.
3. In the project configuration:
   - Click **Edit** next to **Root Directory** and select **`frontend`**.
   - Framework preset: **Next.js** (detected automatically).
   - Under **Build and Output Settings**: Leave all toggles **OFF** / default. Do not set a custom build command. Vercel automatically runs native `next build`.

### Step 3.2: Configure Vercel Environment Variables

In the Vercel deployment screen, expand **Environment Variables** and paste the following values (replacing contract addresses if you deployed your own in Stage 1):

```env
# Network & RPC
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Core Deployed Smart Contracts
NEXT_PUBLIC_VAULT_ADDRESS=0x043d02c39B86CAd83E1Bf05728D32d24f6289e74
NEXT_PUBLIC_DEMO_VAULT_ADDRESS=0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1
NEXT_PUBLIC_CONSENSUS_ADDRESS=0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1
NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS=0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863
NEXT_PUBLIC_STEALTH_REGISTRY_ADDRESS=0x583eC2de840034478a61EF572cea2904bFD8671E
NEXT_PUBLIC_BALANCE_COMMITMENT_ADDRESS=0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_FACTORY_ADDRESS=0x30489c0f3566AF47b71867bc992408B91E500823

# Pimlico Paymaster (Optional)
NEXT_PUBLIC_PIMLICO_API_KEY=

# Render Notification Service URL
NEXT_PUBLIC_NOTIFICATION_URL=https://<your-service>.onrender.com
```

### Step 3.3: Deploy

Click **Deploy**. Vercel will build the Next.js application with Turbopack and serve it globally over their edge network.

---

## 7. Stage 4: Post-Deployment Smoke Testing Checklist

Follow this quick 5-step checklist to verify that all on-chain and off-chain subsystems are operating flawlessly:

- [ ] **1. Wallet Connection**: Open your deployed Vercel URL. Connect your Web3 wallet (MetaMask, Rabby, Coinbase Wallet). Verify that your address appears in the header with the active network badge (`Sepolia`).
- [ ] **2. Heartbeat Check-In**: Navigate to `/dashboard`. Inspect the real-time oscilloscope ECG monitor (`62 BPM Steady`). Click **`[Send Heartbeat Check-In]`** to execute an on-chain transaction. Confirm that the timestamp renews and an Etherscan link is provided.
- [ ] **3. Fast Interval Adjustment**: On `/dashboard`, click **`[⚡ Adjust Interval]`**. Select **`5 Min (Test)`** (300s) and sign the Sepolia transaction. Verify that both the vault and `ProofOfLifeConsensus.sol` update on-chain and the ECG rhythm accelerates to 95 BPM.
- [ ] **4. Notification Email Binding**: On `/dashboard`, enter an email in the **Notification Channels** card and click **`[Verify & Bind Email]`**. Sign the wallet verification message. Verify that your email immediately transitions to **`VERIFIED`** and an instant welcome email is dispatched.
- [ ] **5. Beneficiary Claim Portal**: Switch to a beneficiary wallet (e.g. `0x7099...79C8`) and open `/claim`. Click **`[Unlock & Decrypt Share]`**. Confirm that the browser derives the ECIES key in-memory via a wallet signature without ever prompting for a raw private key.

---

## 8. Troubleshooting & Common Pitfalls

### Issue: RPC HTTP 429 Rate Limiting
- **Solution**: Cadence implements a high-availability multi-RPC failover pool in `lib/contracts.ts` and `lib/wagmi.ts` pooling 4 independent Sepolia endpoints (`PublicNode`, `Sepolia.org`, `1RPC`, `Tenderly`). If any single node rate-limits, Viem automatically falls back to the next node without interrupting user flows.

### Issue: CORS Errors on Notification API
- **Symptom**: Browser console shows `CORS origin not allowed: https://...`.
- **Solution**: Ensure your Vercel URL is added to `CLIENT_URL` in the Render environment variables. Any origin matching `https://*cadence*.vercel.app` is automatically permitted.

### Issue: Render Free-Tier Cold Start
- **Symptom**: The first notification binding takes 30–50 seconds to respond.
- **Solution**: Render free-tier web services spin down after 15 minutes of inactivity. Cadence's frontend incorporates an automatic health ping (`checkBackendHealth`) that surfaces a gentle loading state while the container boots.

### Issue: Etherscan Verification Delay
- **Symptom**: `forge script ... --verify` fails with `Contract already verified` or API rate limit.
- **Solution**: You can verify individual contracts post-deployment using:
  ```bash
  forge verify-contract <CONTRACT_ADDRESS> src/<CONTRACT_NAME>.sol:<CONTRACT_NAME> \
    --chain sepolia \
    --etherscan-api-key $ETHERSCAN_API_KEY
  ```

---

## 9. Deployment Reference Summary

| Subsystem | Platform | Build Command | Start Command |
| :--- | :--- | :--- | :--- |
| **Smart Contracts** | Ethereum Sepolia | `forge build` | `forge script script/Deploy.s.sol:Deploy --broadcast --verify` |
| **Notifications** | Render Web Service | `npm install && npm run build` | `node dist/index.js` (or `npm start`) |
| **Frontend** | Vercel Edge Network | `npm run build` | Next.js Serverless Function |

🎉 **Congratulations! Your Cadence Protocol is fully deployment ready and live on production infrastructure.**
