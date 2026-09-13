"use client";

import React, { useMemo } from "react";
import { sanitizeHtml } from "../lib/sanitize";

export interface SafeHtmlProps {
  /**
   * Raw HTML content to be sanitized.
   */
  html: string;
  /**
   * Optional CSS classes to apply to container.
   */
  className?: string;
  /**
   * HTML element tag to render as wrapper. Defaults to 'div'.
   */
  as?: React.ElementType;
}

/**
 * SafeHtml component for rendering HTML content safely.
 *
 * Enforces CSP and XSS prevention:
 * - Content is passed through DOMPurify before dangerouslySetInnerHTML is invoked.
 * - Strips all script tags, event handlers, javascript: pseudo-protocols, and eval expressions.
 */
export function SafeHtml({ html, className, as: Component = "div" }: SafeHtmlProps) {
  const cleanHtml = useMemo(() => sanitizeHtml(html), [html]);

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

export default SafeHtml;
