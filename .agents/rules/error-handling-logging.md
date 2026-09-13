# Error Handling & Logging Policy

## Core Directives

- **Never Leak Stack Traces, Raw Errors, or File Paths to the Client**:
    - Raw exceptions, stack traces, and internal source code paths must **NEVER** be sent in client-facing responses in any environment.
    - Always return generic, human-readable error messages to users:
      ```json
      // ❌ INSECURE - Leaks internal source path and schema details
      {
        "error": "Error: Cannot read property 'wallet' of undefined at /app/dist/routes/bind.js:42:15"
      }

      // ✅ SECURE - Client-safe generic message
      {
        "error": "Internal Server Error",
        "message": "Something went wrong. Please try again later."
      }
      ```
- **Contextual Server-Side Logging**:
    - Log errors on the server with rich context:
        - ISO 8601 Timestamp
        - Request route & HTTP method
        - Correlation / Request ID
        - User / Wallet identity (if authenticated)
        - Sanitized request inputs (passwords, private keys, secrets strictly redacted)
        - Full error stack trace
- **Use Production Monitoring & Error Tracking Services**:
    - Integrate tools like Sentry, Datadog, or Logtail in production.
    - Monitor crash loops, unhandled promise rejections, and uncaught exceptions.
- **Strict Distinction Between `4xx` and `5xx` Status Codes**:
    - **`4xx` Client Errors**: Return `400 Bad Request` for schema/input validation errors, `401 Unauthorized` for missing/invalid credentials, `403 Forbidden` for permission failures, `429 Too Many Requests` for rate limits.
    - **`5xx` Server Errors**: Reserve `500 Internal Server Error` strictly for unexpected server faults, database connectivity failures, or unhandled runtime exceptions.
    - **Never** use HTTP 500 for client validation failures.
