# Cadence Protocol — Notification Service

Off-chain notification microservice and wallet-signature binding verifier enforcing **Security Constraint #6** and hardened security protocols.

---

## Security Invariants & Hardened Protections

### 1. Constraint #6: Cryptographic Email-to-Wallet Binding
> **An email is never linked to a wallet without an explicit cryptographic signature from that wallet.**

- **Anti-Phishing & Verification**: An owner can only *suggest* an email for a beneficiary. Suggested emails remain strictly `PENDING` (`verified: false`) and receive **zero** notifications until the beneficiary connects their wallet and signs the confirmation message.
- **Canonical Email-Bound Signature**: The signature verification payload strictly binds the target email address into the message body:
  ```text
  Cadence Notification Verification
  Wallet: 0x...
  Email: beneficiary@example.com
  Nonce: 1
  Timestamp: 1725883200000
  ```
- **Email Substitution Defense**: `POST /api/bind` enforces that the recovered signer signed for the exact email specified in the payload. Attempts to substitute emails using a signature generated for another address are rejected with HTTP 400.
- **Instant Confirmation**: Upon signature verification, an immediate `WALLET_BOUND_CONFIRMATION` email is dispatched.
- **Wallet-Revealing Alerts**: All beneficiary notices explicitly state the registered wallet address on file (`0x71C...8b2`), preventing confusion for beneficiaries with multiple wallets.
- **Anti-Enumeration Recovery**: The `/api/remind-wallet` endpoint never returns matched addresses in the HTTP response; the reminder is sent strictly to the verified email inbox.

### 2. Phase 2 Backend Hardening & Access Control
- **Admin Outbox Protection**: `GET /api/outbox` requires an `Authorization: Bearer <ADMIN_API_KEY>` header and is disabled when `NODE_ENV === 'production'` to prevent public PII leakage.
- **Internal Trigger Authentication**: `/api/trigger-claim-notice` and internal notification hooks require an internal secret or HMAC header (`x-cadence-internal-key`).
- **Tiered Rate Limiting (`express-rate-limit`)**:
  - Global limiter: 100 requests per 15 minutes per IP.
  - Sensitive endpoint limiter: 10 requests per 15 minutes per IP on `/api/bind`, `/api/suggest`, and `/api/remind-wallet`.
### 3. Autonomous Sentinel Background Daemon (`sentinel.ts`)
The service includes a continuous background monitoring engine that polls Ethereum Sepolia consensus state every 20 seconds:
- **Automated Guardian Attestation Dispatch**: Automatically dispatches 2 distinct email alerts to Guardian Node 1 and Guardian Node 2 when `now >= lastActive + checkInInterval` in `Active` state (`isTimeoutExpired == true`).
- **Automated Contest Grace Period Concluded Dispatch**: Dispatches finalization notices to guardians and heirs as soon as `now >= contestDeadline` in `ClaimPending` state.
- **Automated Owner Heartbeat Check-In Alerts**:
  - *Approaching Deadline Alert*: Warns the vault owner before deadline ($\le 2$ minutes for test intervals, or $\le 3$ days / 25% for standard vaults).
  - *Overdue Urgent Alert*: Immediately dispatches an urgent notice (`[Cadence Alert] URGENT: Vault Heartbeat Overdue — Check-In Required`) upon interval lapse.
- **Cycle-Keyed Deduplication**: Prevents email spam across cycles using persistent keys (`${vault}_owner_approaching_${lastActive}`, `${vault}_owner_overdue_${lastActive}`, `${vault}_heartbeat_${lastActive}`, `${vault}_concluded_${contestDeadline}`).
- **Operator Fallback**: When an address is not explicitly verified via EIP-712 in the database, falls back to `DEFAULT_OWNER_EMAIL || DEFAULT_GUARDIAN_EMAIL || SMTP_USER` (`fadojudavid69@gmail.com`), guaranteeing live delivery during testing.

---

## API Reference

| Endpoint | Method | Access | Purpose |
|---|---|---|---|
| `/health` | `GET` | Public | Service operational health and uptime. |
| `/api/message/:walletAddress` | `GET` | Public | Returns canonical text the wallet must sign to bind an email. |
| `/api/status/:walletAddress` | `GET` | Public | Queries binding status (verified, pending, masked email). |
| `/api/bind` | `POST` | Rate-Limited (10/15m) | Validates wallet signature (`viem.verifyMessage`) and binds email. |
| `/api/suggest` | `POST` | Rate-Limited (10/15m) | Suggests an unverified email for a beneficiary during vault creation. |
| `/api/remind-wallet` | `POST` | Rate-Limited (10/15m) | Triggers a reminder email with registered wallet addresses. |
| `/api/notify/owner-reminder` | `POST` | Internal Key (`x-cadence-internal-key`) | Dispatches heartbeat reminder or overdue warning to vault owner. |
| `/api/notify/guardian-attest-request` | `POST` | Public / Internal | Dispatches 2 distinct attestation alerts to Guardian 1 and Guardian 2. |
| `/api/notify/contest-concluded` | `POST` | Public / Internal | Dispatches contest-concluded alert to guardians and beneficiaries. |
| `/api/monitor-vault` | `POST` | Public | Registers a vault and guardian contacts with the autonomous Sentinel daemon. |
| `/api/monitored-vaults` | `GET` | Public | Lists all vaults currently monitored by the background Sentinel daemon. |
| `/api/outbox` | `GET` | Admin Bearer (`ADMIN_API_KEY`) | Audit log of dispatched notifications (development/admin only). |

---

## Email Delivery Transports

The service supports live inbox delivery via two providers, with automatic local fallback:

1. **Resend (Recommended)**: Set `RESEND_API_KEY=re_...` in `.env`.
2. **Gmail App Password / Custom SMTP**: Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`.
3. **Local Outbox Mode**: If no SMTP credentials are provided, emails are formatted as full HTML and JSON entries stored in `data/outbox.json` (viewable via `GET /api/outbox` with admin key).

---

## Deployment on Render

This service is pre-configured for Render via the root [`render.yaml`](../render.yaml) Blueprint:
1. Connect repository in [Render Dashboard](https://dashboard.render.com).
2. Select **Blueprint** to automatically build and start:
   - **Build Command**: `cd notifications && npm install && npm run build`
   - **Start Command**: `cd notifications && npm start`
   - **Health Check Path**: `/health`
3. Configure persistent disk mounting (`DATA_DIR=/var/data`) and set `ADMIN_API_KEY`, `INTERNAL_API_SECRET`, and email provider keys.

---

## Local Development & Testing

```bash
npm install
npm run dev        # Watch mode with tsx (runs server and autonomous Sentinel)
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled JavaScript with node
npm test           # Execute 18 unit, security, and Sentinel regression tests
npm run test:e2e   # Execute 10 live end-to-end integration tests
```

