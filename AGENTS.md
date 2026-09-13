# Project Guidelines & Agent Instructions

This document defines the mandatory engineering policies, security standards, and implementation requirements across the entire Cadence monorepo (`frontend/`, `notifications/`, `contracts/`). All automated agents, developers, and pull requests **must** strictly adhere to these policies without exception.

---

## 1. Frontend Secret Management & Zero Leakage Policy

**Never expose secrets in frontend code.**

- **ALL** API keys, tokens, database URLs, service credentials, and private config MUST live in `.env` files only.
- `.env` files MUST be listed in `.gitignore` — always maintain a `.gitignore` that explicitly excludes `.env`, `.env.local`, and `.env.*.local`.
- Frontend code (React, Next.js, Vue, plain JS/TS) must NEVER contain raw secret values. No `const API_KEY = "sk-..."` in client-side files.
- For frameworks like Next.js/Vite: only variables prefixed with `NEXT_PUBLIC_` or `VITE_` belong in the frontend, and those must NEVER be secret keys.
- Backend/server-only secrets must be accessed via `process.env.VAR_NAME` and never returned to the client in API responses.
- Maintain `.env.example` files with all required variable names but empty values, so collaborators know what's needed.
- If a key must be used client-side (e.g., a Stripe publishable key or Pimlico paymaster public client key), comment clearly that it is a **publishable/public** key intentionally exposed.
- **Repository Implementation**:
  - `frontend/.env.example` and `frontend/.env.production.example` template all public client variables.
  - Dedicated rule file: `.agents/rules/frontend-secrets.md`.

---

## 2. Rate Limiting Policy

**Every public-facing endpoint must have rate limiting.**

- Apply rate limiting on ALL API routes, especially auth, form submissions, AI completions, file uploads, and any expensive operation.
- Default limits (adjust per use case):
  - Auth endpoints (login, register, password reset, wallet binding): **5 requests / 15 minutes per IP**
  - General API: **60 requests / minute per IP**
  - AI/LLM proxy endpoints: **10 requests / minute per user**
  - File uploads: **5 requests / minute per IP**
- Use libraries appropriate to the stack:
  - Node/Express: `express-rate-limit`
  - Next.js: `next-rate-limit` or middleware with `lru-cache`
  - Python/FastAPI: `slowapi`
  - Python/Flask: `Flask-Limiter`
  - Edge/Vercel: use KV-based counters or Upstash Redis
- Return `429 Too Many Requests` with a `Retry-After` header when limits are hit.
- Never silently swallow rate limit errors on the frontend — show the user a clear message.
- **Repository Implementation**:
  - `notifications/index.ts`: Configured `authLimiter` (5 req / 15 min with `Retry-After` header) on sensitive routes (`/api/bind`, `/api/notify/*`) and `generalLimiter` (60 req / min) across all public endpoints.
  - Dedicated rule file: `.agents/rules/rate-limiting.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 3).

---

## 3. Input Validation & Sanitization Policy

**Never trust user input. Validate and sanitize everything.**

- Validate ALL inputs on the **server side** — client-side validation is UX only, never security.
- Use schema validation libraries:
  - JS/TS: `zod`, `yup`, or `joi`
  - Python: `pydantic`
- Sanitize all string inputs before storing or displaying to prevent XSS.
- Use parameterized queries / ORM methods — NEVER interpolate user input into raw SQL or NoSQL queries.
- Validate: data type, length/size limits, allowed characters, required fields, enum values.
- For file uploads: validate MIME type, file extension, and file size server-side.
- Reject and return clear `400 Bad Request` errors for invalid input — log the attempt.
- **Repository Implementation**:
  - `notifications/schemas.ts`: Strict Zod schemas for all inbound payloads, address checksum validation (`isAddress`), email regex, and string entity sanitization (`sanitizeString`).
  - Dedicated rule file: `.agents/rules/input-validation.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 4).

---

## 4. Authentication & Authorization Policy

**Secure all sensitive operations with rigorous authentication and authorization.**

- **Use established auth libraries** — never roll your own auth from scratch.
  - Recommended: `NextAuth.js`, `Clerk`, `Supabase Auth`, `Auth0`, `Passport.js`, `lucia-auth`.
  - Web3 stacks: standard SIWE (`EIP-4361`), EIP-712 structured signing, `viem` / `wagmi`.
- **Passwords must NEVER be stored in plain text.** Use `bcrypt` (min cost 12) or `argon2`.
- **JWTs must be signed with a strong secret** (`JWT_SECRET` from env, min 32 chars). Set short expiry (`15m`–`1h`).
- **Refresh tokens must be stored securely** (`httpOnly` cookies, not `localStorage`).
- **Always verify the user's identity AND their permission** to access the requested resource on every request (AuthN + AuthZ).
- **Implement account lockout** after repeated failed login attempts (e.g. 5 failed attempts locks out for 15 minutes).
- **For admin routes or sensitive operations, add an explicit role/permission check.**
- **Repository Implementation**:
  - `notifications/auth.ts`: `AuthLockoutManager` tracks failed authentication attempts per IP/identity with exponential backoff and lockout after 5 failures; `timingSafeCompare` prevents timing attacks on secrets; `validateJwtSecret` enforces $\ge 32$ characters.
  - `notifications/index.ts`: Protects `/api/bind` with lockout guards, `/api/outbox` with timing-safe admin authorization, and `/api/monitored-vaults` with guardian email privacy masking for unauthenticated requests.
  - Dedicated rule file: `.agents/rules/auth.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 1, Test 2, Test 5).

---

## 5. SQL & Database Security Policy

**Protect persistent data and database integrity from injection and disclosure.**

- **Always use an ORM (Prisma, Drizzle, SQLAlchemy, Mongoose) or parameterized queries.**
- **Never construct queries via string concatenation with user data.**
- **Apply the principle of least privilege:** DB user should only have permissions it actually needs.
- **Sanitize and validate all fields before any DB write.**
- **Do not return raw DB errors to the client** — they leak schema information, column names, and system paths. Log full errors server-side and return generic, sanitized errors.
- **Repository Implementation**:
  - `notifications/db.ts`: Sanitizes and validates address checksums and email strings prior to committing state changes; traps and masks internal storage exceptions.
  - Dedicated rule file: `.agents/rules/database-security.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 6).

---

## 6. CORS Configuration Policy

**Restrict cross-origin API access strictly to authorized domains.**

- **Do NOT use wildcard `*` CORS in production.**
- **Explicitly whitelist only the origins that should access your API.**
- **Restrict allowed HTTP methods to only what each endpoint needs.**
- **Restrict allowed headers and enforce secure preflight caching.**
- **Repository Implementation**:
  - `notifications/index.ts`: Configures `cors` with explicit origin whitelist (`https://cadence-protocol.vercel.app` and localhost dev environments), allowed methods (`GET, POST, OPTIONS`), allowed headers (`Content-Type, Authorization, x-api-key`), and `maxAge: 86400`.
  - Dedicated rule file: `.agents/rules/cors.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 7).

---

## 7. HTTP Security Headers Policy

**Harden all HTTP responses against browser-based attack vectors.**

- **Always set security headers.** Use `helmet` (Node/Express), framework-native config, or set manually.
- **Required headers:**
  - `Content-Security-Policy` — restrict script/style/connect sources
  - `X-Frame-Options: DENY` — prevent clickjacking
  - `X-Content-Type-Options: nosniff` — prevent MIME sniffing
  - `Strict-Transport-Security` — force HTTPS (`max-age=31536000; includeSubDomains; preload`)
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Remove `X-Powered-By` header** to avoid leaking server and framework info.
- **Repository Implementation**:
  - `notifications/index.ts`: Implements `helmet` middleware and explicit HSTS middleware; disables `x-powered-by`.
  - `frontend/next.config.ts`: Sets `poweredByHeader: false` and injects full security headers into Next.js responses.
  - `frontend/vercel.json`: Defines edge security headers for production deployment.
  - Dedicated rule file: `.agents/rules/security-headers.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 8).

---

## 8. File Upload Security Policy

**Thoroughly inspect and isolate any user-uploaded files.**

- **Validate file type by MIME type AND extension server-side** — never trust the client's claim. Inspect magic bytes for binary integrity.
- **Set strict file size limits** (e.g., 5MB for images, 25MB for documents).
- **Store uploaded files outside the web root**, or in a cloud bucket (S3, GCS, Cloudinary).
- **Never serve user-uploaded files with executable permissions** (enforce `0o644` / non-executable).
- **Rename uploaded files to a UUID** (`crypto.randomUUID()`) — never use the original filename directly.
- **Scan for malware and script injection** if handling sensitive or public uploads.
- **Repository Implementation**:
  - `notifications/fileUploadSecurity.ts`: Validates dual MIME and extension match, inspects magic byte signatures (PNG, JPEG, PDF), enforces 5MB / 25MB limits, executes deep regex script injection scans, generates UUID filenames, and isolates files outside web roots.
  - Dedicated rule file: `.agents/rules/file-upload-security.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 9).

---

## 9. Error Handling & Logging Policy

**Maintain transparent server-side visibility while presenting zero attack surface to clients.**

- **Never return stack traces, raw error messages, or internal paths to the client in production.**
- **Always return generic error messages to users:** `"Something went wrong. Please try again later."` not `"Error: Cannot read property of undefined at /src/routes/user.ts:42"`.
- **Log errors server-side with context** (timestamp, user/wallet ID if available, route, sanitized input, stack trace).
- **Use a logging/monitoring service** (Sentry, Datadog, Logtail) for production error tracking.
- **Distinguish between `4xx` (client errors) and `5xx` (server errors)** — never use 500 for validation or authentication failures.
- **Repository Implementation**:
  - `notifications/logger.ts`: Structured contextual JSON logger with automated credential/key redaction (`redactSensitive`).
  - `notifications/index.ts`: Global error handler converts unhandled runtime exceptions into generic user messages and logs full details server-side.
  - Dedicated rule file: `.agents/rules/error-handling-logging.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 10).

---

## 10. Dependency Security Policy

**Maintain an auditable, patched, and locked dependency graph.**

- **Run `npm audit` / `pip-audit` / `cargo audit` after installing packages and fix all high and critical issues.**
- **Avoid packages that are unmaintained** (no updates in 2+ years for security-relevant libraries).
- **Pin dependency versions in production** using committed lockfiles (`package-lock.json`, `foundry.lock`).
- **Do not install packages with excessive permissions or suspicious install scripts without review.**
- **Use package overrides (`overrides` in `package.json`)** to remediate vulnerable transitive dependencies promptly.
- **Repository Implementation**:
  - `frontend/package.json`: Added `"overrides": { "ws": "^8.20.2" }`, resulting in **0 vulnerabilities** on `npm audit`.
  - `notifications/package.json`: Added `"overrides": { "qs": "^6.16.0" }`, resulting in **0 vulnerabilities** on `npm audit`.
  - Dedicated rule file: `.agents/rules/dependency-security.md`.

---

## 11. Content Security Policy (CSP) for Frontend

**Eliminate Cross-Site Scripting (XSS) and unsafe dynamic code evaluation in the browser.**

- **Do not use `dangerouslySetInnerHTML` in React** unless the content is fully sanitized with `DOMPurify` (or via `SafeHtml` wrapper).
- **Never use `eval()`, `new Function()`, or `innerHTML`** with dynamic user content. Enforce linting (`no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`).
- **Avoid inline `<script>` tags** — move all JavaScript to external files/bundles to enable strict CSP enforcement.
- **Maintain comprehensive CSP headers** across both edge hosting (`vercel.json`) and Next.js configuration (`next.config.ts`).
- **Repository Implementation**:
  - `frontend/lib/sanitize.ts`: Exports `sanitizeHtml` using `DOMPurify` with an explicit HTML tag/attribute whitelist (`ALLOWED_TAGS`, `ALLOWED_ATTR`) and SSR-safe fallback.
  - `frontend/components/SafeHtml.tsx`: Client component wrapping sanitized HTML rendering.
  - `frontend/eslint.config.mjs`: Strict ESLint security rules forbidding `no-eval`, `no-implied-eval`, `no-new-func`, and `no-script-url`.
  - `frontend/next.config.ts` & `frontend/vercel.json`: Strict CSP directives (`frame-ancestors 'none'`, `default-src 'self'`).
  - Dedicated rule file: `.agents/rules/frontend-csp.md`.
  - Regression tests: `notifications/test/security.test.ts` (Test 11 audits 36 frontend source files).

---

## 12. Verification & Regression Testing Matrix

Whenever modifying code in this repository, run the following automated checks to verify full compliance:

| Scope | Command | Purpose |
| :--- | :--- | :--- |
| **Security Suite** | `npm run test:security` (in `notifications/`) | Runs all 11 security regression tests (Tests 1–11) |
| **Notifications Service** | `npm test` (in `notifications/`) | Runs all backend unit, sentinel, and security suites |
| **Frontend Linter** | `npm run lint` (in `frontend/`) | Validates ESLint rules including `no-eval`, `no-script-url` |
| **Frontend Typecheck** | `npx tsc --noEmit` (in `frontend/`) | Verifies TypeScript types without emitting artifacts |
| **Vulnerability Audit** | `npm audit` (in `frontend/` & `notifications/`) | Verifies 0 high or critical CVE vulnerabilities |
