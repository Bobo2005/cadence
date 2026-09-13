# Project Guidelines & Agent Instructions

## Frontend Secret Management & Zero Leakage Policy

**Never expose secrets in frontend code.**

- **ALL** API keys, tokens, database URLs, service credentials, and private config MUST live in `.env` files only.
- `.env` files MUST be listed in `.gitignore` — always maintain a `.gitignore` that explicitly excludes `.env`, `.env.local`, and `.env.*.local`.
- Frontend code (React, Next.js, Vue, plain JS/TS) must NEVER contain raw secret values. No `const API_KEY = "sk-..."` in client-side files.
- For frameworks like Next.js/Vite: only variables prefixed with `NEXT_PUBLIC_` or `VITE_` belong in the frontend, and those must NEVER be secret keys.
- Backend/server-only secrets must be accessed via `process.env.VAR_NAME` and never returned to the client in API responses.
- Maintain `.env.example` files with all required variable names but empty values, so collaborators know what's needed.
- If a key must be used client-side (e.g., a Stripe publishable key or Pimlico paymaster public client key), comment clearly that it is a **publishable/public** key intentionally exposed.

## Rate Limiting Policy

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

## Input Validation & Sanitization Policy

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

## Authentication & Authorization Policy

- **Use established auth libraries** — never roll your own auth from scratch.
    - Recommended: `NextAuth.js`, `Clerk`, `Supabase Auth`, `Auth0`, `Passport.js`, `lucia-auth`.
    - Web3 stacks: standard SIWE (`EIP-4361`), EIP-712 structured signing, `viem` / `wagmi`.
- **Passwords must NEVER be stored in plain text.** Use `bcrypt` (min cost 12) or `argon2`.
- **JWTs must be signed with a strong secret** (`JWT_SECRET` from env, min 32 chars). Set short expiry (`15m`–`1h`).
- **Refresh tokens must be stored securely** (`httpOnly` cookies, not `localStorage`).
- **Always verify the user's identity AND their permission** to access the requested resource on every request (AuthN + AuthZ).
- **Implement account lockout** after repeated failed login attempts (e.g. 5 failed attempts locks out for 15 minutes).
- **For admin routes or sensitive operations, add an explicit role/permission check.**

## SQL & Database Security Policy

- **Always use an ORM (Prisma, Drizzle, SQLAlchemy, Mongoose) or parameterized queries.**
- **Never construct queries via string concatenation with user data.**
- **Apply the principle of least privilege:** DB user should only have permissions it actually needs.
- **Sanitize and validate all fields before any DB write.**
- **Do not return raw DB errors to the client** — they leak schema information, column names, and system paths. Log full errors server-side and return generic, sanitized errors.

## CORS Configuration Policy

- **Do NOT use wildcard `*` CORS in production.**
- **Explicitly whitelist only the origins that should access your API.**
- **Restrict allowed HTTP methods to only what each endpoint needs.**
- **Restrict allowed headers and enforce secure preflight caching.**

## HTTP Security Headers Policy

- **Always set security headers.** Use `helmet` (Node/Express), framework-native config, or set manually.
- **Required headers:**
    - `Content-Security-Policy` — restrict script/style/connect sources
    - `X-Frame-Options: DENY` — prevent clickjacking
    - `X-Content-Type-Options: nosniff` — prevent MIME sniffing
    - `Strict-Transport-Security` — force HTTPS (`max-age=31536000; includeSubDomains; preload`)
    - `Referrer-Policy: strict-origin-when-cross-origin`
- **Remove `X-Powered-By` header** to avoid leaking server and framework info.

## File Upload Security Policy

- **Validate file type by MIME type AND extension server-side** — never trust the client's claim. Inspect magic bytes for binary integrity.
- **Set strict file size limits** (e.g., 5MB for images, 25MB for documents).
- **Store uploaded files outside the web root**, or in a cloud bucket (S3, GCS, Cloudinary).
- **Never serve user-uploaded files with executable permissions** (enforce `0o644` / non-executable).
- **Rename uploaded files to a UUID** (`crypto.randomUUID()`) — never use the original filename directly.
- **Scan for malware and script injection** if handling sensitive or public uploads.

## Error Handling & Logging Policy

- **Never return stack traces, raw error messages, or internal paths to the client in production.**
- **Always return generic error messages to users:** `"Something went wrong. Please try again later."` not `"Error: Cannot read property of undefined at /src/routes/user.ts:42"`.
- **Log errors server-side with context** (timestamp, user/wallet ID if available, route, sanitized input, stack trace).
- **Use a logging/monitoring service** (Sentry, Datadog, Logtail) for production error tracking.
- **Distinguish between `4xx` (client errors) and `5xx` (server errors)** — never use 500 for validation or authentication failures.

## Dependency Security Policy

- **Run `npm audit` / `pip-audit` / `cargo audit` after installing packages and fix all high and critical issues.**
- **Avoid packages that are unmaintained** (no updates in 2+ years for security-relevant libraries).
- **Pin dependency versions in production** using committed lockfiles (`package-lock.json`, `foundry.lock`).
- **Do not install packages with excessive permissions or suspicious install scripts without review.**
- **Use package overrides (`overrides` in `package.json`)** to remediate vulnerable transitive dependencies promptly.

## Content Security Policy (CSP) for Frontend

- **Do not use `dangerouslySetInnerHTML` in React** unless the content is fully sanitized with `DOMPurify` (or via `SafeHtml` wrapper).
- **Never use `eval()`, `new Function()`, or `innerHTML`** with dynamic user content. Enforce linting (`no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`).
- **Avoid inline `<script>` tags** — move all JavaScript to external files/bundles to enable strict CSP enforcement.
- **Maintain comprehensive CSP headers** across both edge hosting (`vercel.json`) and Next.js configuration (`next.config.ts`).

