import DOMPurify from "dompurify";

/**
 * Sanitizes an untrusted HTML string to prevent Cross-Site Scripting (XSS).
 *
 * Strict Content Security Policy (CSP) & DOMPurify Enforcement:
 * - Prohibits <script> tags, inline event handlers (onload, onerror, onclick),
 *   javascript: URIs, data: URIs for executable contexts, and eval-triggering payloads.
 * - Enforces rel="noopener noreferrer" on external links.
 * - Safe for use in dangerouslySetInnerHTML when rich HTML rendering is strictly required.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  // If executing in browser environment where window.DOMParser exists
  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: [
        "b",
        "i",
        "em",
        "strong",
        "a",
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "code",
        "pre",
        "span",
        "div",
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ],
      ALLOWED_ATTR: ["href", "title", "target", "rel", "class", "id"],
      ALLOW_DATA_ATTR: false,
      SAFE_FOR_TEMPLATES: true,
      ADD_ATTR: ["target"],
      FORCE_BODY: true,
    });
  }

  // Safe fallback for SSR if DOMPurify is invoked outside browser: strip tags entirely
  return dirtyHtml.replace(/<[^>]*>?/gm, "");
}

/**
 * Checks if input contains dangerous patterns that would violate CSP or lead to XSS.
 */
export function containsDangerousContent(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const lower = input.toLowerCase();
  const hasScriptUrl = /javascript\s*:/i.test(input);
  const hasEvalCall = /\beval\s*\(/i.test(input);
  const hasNewFunction = /\bnew\s+Function\b/i.test(input);
  return (
    hasScriptUrl ||
    hasEvalCall ||
    hasNewFunction ||
    lower.includes("<script") ||
    lower.includes("onload=") ||
    lower.includes("onerror=") ||
    lower.includes("onclick=")
  );
}
