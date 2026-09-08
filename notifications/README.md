# Cadence Protocol — Notification Service

Off-chain notification microservice and wallet-signature binding verifier enforcing **Security Constraint #6**.

---

## Security Invariant: Constraint #6

> **An email is never linked to a wallet without an explicit cryptographic signature from that wallet.**

1. **Anti-Phishing**: An owner can only *suggest* an email for a beneficiary. Suggested emails remain strictly `PENDING` (`verified: false`) and receive **zero** notifications until the beneficiary connects their wallet and signs the confirmation message.
2. **Instant Confirmation**: Upon signature verification, an immediate `WALLET_BOUND_CONFIRMATION` email is dispatched.
3. **Wallet-Revealing Alerts**: All beneficiary notices explicitly state the registered wallet address on file (`0x71C...8b2`), preventing confusion for beneficiaries with multiple wallets.
4. **Anti-Enumeration Recovery**: The `/api/remind-wallet` endpoint never returns matched addresses in the HTTP response; the reminder is sent strictly to the verified email inbox.

---

## API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | `GET` | Service operational health and uptime. |
| `/api/message/:walletAddress` | `GET` | Returns canonical text the wallet must sign to bind an email. |
| `/api/status/:walletAddress` | `GET` | Queries binding status (verified, pending, masked email). |
| `/api/bind` | `POST` | Validates wallet signature (`viem.verifyMessage`) and binds email. |
| `/api/suggest` | `POST` | Suggests an unverified email for a beneficiary during vault creation. |
| `/api/remind-wallet` | `POST` | Triggers a reminder email with registered wallet addresses. |
| `/api/trigger-claim-notice` | `POST` | Internal hook dispatched when a vault reaches the claim window. |
| `/api/outbox` | `GET` | Audit log of dispatched notifications (development and debugging). |

---

## Email Delivery Transports

The service supports live inbox delivery via two providers, with automatic local fallback:

1. **Resend (Recommended)**: Set `RESEND_API_KEY=re_...` in `.env`.
2. **Gmail App Password / Custom SMTP**: Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`.
3. **Local Outbox Mode**: If no SMTP credentials are provided, emails are formatted as full HTML and JSON entries stored in `data/outbox.json` (viewable via `GET /api/outbox`).

---

## Deployment on Render

This service is pre-configured for Render via the root [`render.yaml`](../render.yaml) Blueprint:
1. Connect repository in [Render Dashboard](https://dashboard.render.com).
2. Select **Blueprint** to automatically build and start:
   - **Build Command**: `cd notifications && npm install && npm run build`
   - **Start Command**: `cd notifications && npm start`
   - **Health Check Path**: `/health`
3. Auto-seeds default verified demo personas (`Owner`, `Alice`, `Bob`) on fresh container boot so demos never degrade across free-tier spin-downs.

---

## Local Development & Testing

```bash
npm install
npm run dev        # Watch mode with tsx
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled JavaScript with node
npm test           # Execute 11-step Constraint #6 test suite
```
