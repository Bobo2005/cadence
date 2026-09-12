# Frontend Secret Management & Zero Leakage Policy

**Never expose secrets in frontend code.**

## Core Rules

1. **Environment Storage Only**:
   - ALL API keys, tokens, database URLs, service credentials, and private configuration MUST live in `.env` files only.
   - Never commit `.env` or `.env.local` files to version control.

2. **Strict `.gitignore` Exclusion**:
   - Every `.gitignore` MUST explicitly exclude `.env`, `.env.local`, and `.env.*.local` (along with `.env*`).
   - Only `.env.example` or explicitly non-sensitive template files may be tracked.

3. **Zero Raw Secrets in Client Code**:
   - Frontend code (React, Next.js client components, Vue, plain JS/TS) must NEVER contain raw secret values.
   - Never hardcode raw private keys, internal tokens, or secret credentials (e.g. no `const API_KEY = "sk-..."`).

4. **Framework Prefix Conventions**:
   - For frameworks like Next.js/Vite: only variables prefixed with `NEXT_PUBLIC_` or `VITE_` belong in frontend client bundles.
   - Variables with these public prefixes must NEVER contain secret keys.

5. **Server-Only Access for Secrets**:
   - Backend/server-only secrets must be accessed via `process.env.VAR_NAME` (e.g. in Next.js Server Components, API routes, route handlers, or backend microservices).
   - Server routes must never return secrets to the client in API responses.
   - Internal microservice keys (such as internal triggering tokens) must be proxied via server routes, never called directly from the browser with secrets.

6. **Clean `.env.example` Templates**:
   - Generate and maintain `.env.example` files containing all required variable names with empty values, so collaborators know what is needed without risking accidental leakage.

7. **Explicit Documentation for Public/Publishable Keys**:
   - If a key must be used client-side (e.g. a Stripe publishable key or Pimlico paymaster public client key), comment clearly in code and `.env.example` that it is a **publishable/public** key intentionally exposed.
