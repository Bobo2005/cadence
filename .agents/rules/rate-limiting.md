# Rate Limiting Policy

**Every public-facing endpoint must have rate limiting.**

## Core Rules

1. **Mandatory Rate Limiting on All Endpoints**:
   - Apply rate limiting on ALL API routes, especially authentication, form submissions, AI completions, file uploads, and any computationally expensive or state-modifying operation.

2. **Standard Limits**:
   - **Auth / Sensitive Form Submissions** (login, register, wallet binding, password reset): **5 requests / 15 minutes per IP**
   - **General API**: **60 requests / minute per IP**
   - **AI / LLM proxy endpoints**: **10 requests / minute per user**
   - **File uploads**: **5 requests / minute per IP**

3. **Stack-Appropriate Implementations**:
   - **Node/Express**: `express-rate-limit`
   - **Next.js**: `next-rate-limit` or edge/middleware with `lru-cache`
   - **Python/FastAPI**: `slowapi`
   - **Python/Flask**: `Flask-Limiter`
   - **Edge/Vercel**: Upstash Redis or KV-based sliding window counters

4. **HTTP 429 & Retry-After Protocol**:
   - Always return `429 Too Many Requests` with a `Retry-After` header indicating seconds until requests are permitted again.
   - Include a clear JSON error body with `error`, `message`, and `retryAfter`.

5. **Client-Side Graceful Handling**:
   - Never silently swallow rate limit errors on the frontend.
   - Parse HTTP 429 responses and display clear, user-friendly feedback indicating the retry wait duration.
