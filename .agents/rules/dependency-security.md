# Dependency Security Policy

## Core Directives

- **Regular Security Auditing**:
    - Run `npm audit`, `pip-audit`, or `cargo audit` after installing or updating packages.
    - Resolve and patch all **high** and **critical** severity vulnerabilities before committing or deploying code.
    - Leverage package overrides (`"overrides"` in `package.json`) to force secure transitive dependency versions where parent packages have not yet released updates.
- **Avoid Unmaintained Dependencies**:
    - Do not introduce libraries that have been unmaintained (no releases or security updates for 2+ years), especially for security-sensitive operations (cryptography, auth, parsing, HTTP).
- **Pin Dependency Versions in Production**:
    - Always commit lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `requirements.txt`, `foundry.lock`) to git.
    - Use exact versions or strictly tested semver ranges in production builds.
    - Enforce reproducible builds via `npm ci` in CI/CD pipelines rather than `npm install`.
- **Review Package Scripts and Permissions**:
    - Do not install dependencies that execute arbitrary or untrusted install scripts (`postinstall`) without prior security review.
    - Utilize `.npmrc` settings (`ignore-scripts=true`) in untrusted or high-security environments when appropriate.
