# Content Security Policy (CSP) for Frontend

**Prevent XSS, script injection, and unsafe dynamic execution across all frontend layers.**

## Core Rules

1. **No Unsanitized `dangerouslySetInnerHTML` in React**:
   - Never use `dangerouslySetInnerHTML` unless the content is strictly sanitized using `DOMPurify` (or a dedicated component like `SafeHtml` from `components/SafeHtml`).
   - Strip executable script tags, event handlers (`onload`, `onerror`, `onclick`), `javascript:` pseudo-protocols, and unsafe attributes.
   - Enforce an explicit tag whitelist (`ALLOWED_TAGS`) and attribute whitelist (`ALLOWED_ATTR`).

2. **Absolute Ban on `eval()` and `new Function()`**:
   - Never use `eval()`, `new Function()`, `setTimeout(string)`, or `setInterval(string)`.
   - Dynamic code evaluation allows attackers to bypass static guarantees and inject arbitrary JavaScript execution contexts.
   - Enforce ESLint rules `no-eval`, `no-implied-eval`, `no-new-func`, and `no-script-url` across all builds.

3. **Absolute Ban on `innerHTML` with Dynamic User Content**:
   - Direct DOM manipulation via `element.innerHTML = userInput` is strictly forbidden.
   - Always use safe React bindings (`{children}` or text nodes) or `element.textContent` / `element.innerText`.

4. **Zero Inline `<script>` Tags**:
   - Never embed inline `<script>` tags inside HTML or JSX files.
   - All JavaScript logic must reside in external, bundled modules or static scripts to enable strict CSP enforcement without `'unsafe-inline'`.

5. **Strict Content Security Policy (CSP) Headers**:
   - Enforce CSP headers in both hosting platforms (`vercel.json`) and application configurations (`next.config.ts`).
   - Standard baseline directives:
     - `default-src 'self'`
     - `script-src 'self' ...` (strict source control, no dynamic untrusted hosts)
     - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
     - `font-src 'self' https://fonts.gstatic.com data:`
     - `img-src 'self' data: https: blob:`
     - `connect-src 'self' https: wss:`
     - `frame-ancestors 'none'`
     - `base-uri 'self'`
     - `form-action 'self'`
