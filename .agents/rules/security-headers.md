# HTTP Security Headers Policy

## Core Directives

- **Always configure security headers**:
    - Use `helmet` in Node.js/Express, or framework-native security middleware.
- **Required Security Headers**:
    - **`Content-Security-Policy`**: Restrict script, style, frame, connect, and object sources (`default-src 'self'`).
    - **`X-Frame-Options: DENY`**: Prevent clickjacking by forbidding embedding in iframes.
    - **`X-Content-Type-Options: nosniff`**: Prevent MIME-type sniffing attacks.
    - **`Strict-Transport-Security` (HSTS)**: Force HTTPS (`max-age=31536000; includeSubDomains; preload`).
    - **`Referrer-Policy: strict-origin-when-cross-origin`**: Protect referrer metadata while preserving cross-origin origin integrity.
- **Remove `X-Powered-By` Header**:
    - Disable framework fingerprinting (`app.disable('x-powered-by')` in Express, `poweredByHeader: false` in Next.js).
