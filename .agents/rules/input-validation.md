# Input Validation & Sanitization Policy

**Never trust user input. Validate and sanitize everything.**

## Core Rules

1. **Server-Side Validation is Mandatory**:
   - Validate ALL inputs on the **server side**. Client-side validation is strictly for user experience (UX), never security.

2. **Schema-Based Validation**:
   - Use schema validation libraries:
     - JavaScript / TypeScript: `zod`, `yup`, or `joi`
     - Python: `pydantic`
   - Define strict schemas validating data type, length/size bounds, allowed character sets, required fields, and enum values.

3. **Input Sanitization & XSS Prevention**:
   - Sanitize all string inputs before storing or displaying/interpolating into HTML templates or views.
   - Escape HTML entities (`&`, `<`, `>`, `"`, `'`) to prevent Cross-Site Scripting (XSS).
   - Strip control characters and normalize canonical forms (e.g. trimming and lowercasing emails, checksumming hex/addresses).

4. **Safe Query Practices**:
   - Always use parameterized queries, typed ORM models, or safe abstracted data mappers.
   - NEVER interpolate or concatenate user input into raw SQL or NoSQL queries.

5. **File Upload Hardening**:
   - For file uploads: validate MIME type, file extension, and file size strictly on the server side.

6. **Actionable Errors & Logging**:
   - Reject invalid input immediately with HTTP `400 Bad Request`.
   - Return structured, unambiguous error messages detailing which fields failed validation.
   - Log failed validation attempts for security auditing and abuse detection.
