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
