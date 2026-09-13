# Authentication & Authorization Policy

## Core Directives

- **Use established auth libraries — never roll your own auth from scratch.**
    - Recommended: `NextAuth.js`, `Clerk`, `Supabase Auth`, `Auth0`, `Passport.js`, `lucia-auth`.
    - In Web3 architectures, use standard protocols: SIWE (`EIP-4361`), EIP-712 typed structured data signing, and established libraries like `viem` / `wagmi` / `@rainbow-me/rainbowkit`.
- **Passwords must NEVER be stored in plain text.**
    - Use `bcrypt` (minimum cost factor 12) or `argon2id`.
- **JWTs must be signed with a strong secret.**
    - `JWT_SECRET` must come strictly from `.env` and be at least 32 characters (256 bits).
    - Set short token expiry (`15m`–`1h`).
- **Refresh tokens must be stored securely.**
    - Store in `httpOnly`, `Secure`, `SameSite=Strict` or `Lax` cookies, NEVER in `localStorage` or `sessionStorage` (which are vulnerable to XSS).
- **Always verify the user's identity AND their permission to access the requested resource on every request (AuthN + AuthZ).**
    - Authenticate the caller (e.g. valid session, verified cryptographic signature, or bearer token).
    - Authorize access: verify that the authenticated identity actually owns or is permitted to modify/view the target resource (e.g. walletAddress matches owner or authorized guardian/beneficiary).
- **Implement account lockout after repeated failed login attempts.**
    - Track failed attempts per identity / IP.
    - Lock out the account or IP temporarily after 5 consecutive failures for at least 15 minutes.
    - Return `429 Too Many Requests` or `403 Forbidden` with a clear message and lockout duration.
- **For admin routes or sensitive operations, add an explicit role/permission check.**
    - Use constant-time comparison (`crypto.timingSafeEqual`) for API keys and tokens.
    - Strictly reject default or unset secrets in production environments.
