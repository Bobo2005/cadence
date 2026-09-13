# File Upload Security Policy

## Core Directives

- **Validate File Type by MIME Type AND Extension Server-Side**:
    - Never trust the client-supplied `Content-Type` header or file extension alone.
    - Validate both extension and MIME type against an explicit allowlist.
    - Inspect magic bytes (file signature) to ensure binary contents match declared format.
    - Reject dangerous executable extensions (`.exe`, `.sh`, `.bat`, `.cmd`, `.js`, `.php`, `.py`, `.html`, `.svg`).
- **Strict File Size Limits**:
    - Enforce server-side file size limits:
        - Images: **5 MB max**
        - Documents (PDF, DOCX): **25 MB max**
        - General file uploads: **10 MB max**
    - Terminate transfers immediately when limits are exceeded.
- **Store Uploads Outside the Web Root or in Cloud Buckets**:
    - Never save uploaded files within public or static web server roots.
    - Store in isolated private storage directories or object storage (AWS S3, Google Cloud Storage, Cloudinary) with private access policies.
- **Enforce Non-Executable File Permissions**:
    - Set non-executable filesystem permissions (`0o644` or `0o600`).
    - Never execute user-uploaded files on the server.
- **UUID File Renaming**:
    - Always rename uploaded files to a randomly generated UUID (`crypto.randomUUID() + extension`).
    - Strip the original filename, directory paths, and special characters to prevent path traversal (`../`) and overwrite attacks.
- **Malware & Script Scanning**:
    - Scan files for embedded script tags (`<script`), PHP tags (`<?php`), or executable payload signatures before storage or processing.
