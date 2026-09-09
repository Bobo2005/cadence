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
- **Strict CORS Origin Whitelisting**: Limits access strictly to authorized frontend origins and localhost.

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
| `/api/trigger-claim-notice` | `POST` | Internal Key (`x-cadence-internal-key`) | Dispatched when a vault enters the contest or claim window. |
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
npm run dev        # Watch mode with tsx
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled JavaScript with node
npm test           # Execute 15 unit and security regression tests
npm run test:e2e   # Execute 10 live end-to-end integration tests
```
