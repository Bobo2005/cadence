# CORS Configuration Policy

## Core Directives

- **Do NOT use wildcard `*` CORS in production**:
    - Never set `origin: "*"` or `Access-Control-Allow-Origin: *` in production environments, especially on APIs handling sensitive data, authenticated requests, or state mutations.
- **Explicitly whitelist only trusted origins**:
    - Load allowed origins from environment variables (e.g., `process.env.CLIENT_URL`) and explicit production domain lists.
    - In production, exclude local development origins (`http://localhost:*`, `http://127.0.0.1:*`).
    - If a request originates from an unwhitelisted origin, reject or omit the `Access-Control-Allow-Origin` response header.
- **Restrict allowed HTTP methods**:
    - Limit `methods` to only those required by the API endpoints (e.g. `["GET", "POST", "OPTIONS"]`).
    - Never permit unnecessary or dangerous methods (e.g., `TRACE`, `CONNECT`).
- **Restrict allowed headers and cache preflight**:
    - Explicitly specify `allowedHeaders` needed for client-server communication (`Content-Type`, `Authorization`, custom internal headers).
    - Set a reasonable `maxAge` on preflight responses to minimize redundant `OPTIONS` round-trips while preserving access control.
