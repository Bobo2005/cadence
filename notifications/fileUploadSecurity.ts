import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage location strictly outside web root
const DEFAULT_UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "secure_uploads");

export const FILE_LIMITS = {
  IMAGE_MAX_BYTES: 5 * 1024 * 1024, // 5 MB
  DOCUMENT_MAX_BYTES: 25 * 1024 * 1024, // 25 MB
};

// Allowed MIME types mapped to canonical extension
const ALLOWED_MIME_TYPES: Record<string, { ext: string; category: "image" | "document" }> = {
  "image/jpeg": { ext: ".jpg", category: "image" },
  "image/png": { ext: ".png", category: "image" },
  "image/webp": { ext: ".webp", category: "image" },
  "application/pdf": { ext: ".pdf", category: "document" },
  "text/plain": { ext: ".txt", category: "document" },
};

// Explicitly blocked dangerous executable or script extensions
const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".sh", ".bat", ".cmd", ".com", ".msi", ".vbs",
  ".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx",
  ".php", ".phtml", ".py", ".rb", ".pl", ".cgi",
  ".html", ".htm", ".xhtml", ".svg", ".xml"
]);

// Known file signatures (magic bytes)
const MAGIC_BYTES: Record<string, number[]> = {
  ".png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ".jpg": [0xff, 0xd8, 0xff],
  ".jpeg": [0xff, 0xd8, 0xff],
  ".pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  category?: "image" | "document";
  safeFileName?: string;
  storagePath?: string;
}

/**
 * Validates magic bytes against expected file signature.
 */
export function verifyMagicBytes(buffer: Buffer, ext: string): boolean {
  const expected = MAGIC_BYTES[ext.toLowerCase()];
  if (!expected) return true; // Format without strict magic byte check (e.g. plain text)

  if (buffer.length < expected.length) return false;

  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Scans content buffer for common script injection patterns (XSS / WebShells).
 */
export function scanForMaliciousPayloads(buffer: Buffer): { safe: boolean; reason?: string } {
  const sample = buffer.subarray(0, Math.min(buffer.length, 16384)).toString("utf8", 0);
  const lower = sample.toLowerCase();

  if (lower.includes("<script") || lower.includes("javascript:") || lower.includes("onload=")) {
    return { safe: false, reason: "Embedded JavaScript or HTML script tags detected" };
  }
  if (lower.includes("<?php") || lower.includes("<?=") || lower.includes("<%")) {
    return { safe: false, reason: "Server-side executable tags detected" };
  }
  if (lower.includes("eval(") || lower.includes("base64_decode(")) {
    return { safe: false, reason: "Potentially obfuscated script execution detected" };
  }

  return { safe: true };
}

/**
 * Validates, renames, and prepares an uploaded file for secure storage.
 */
export function validateAndPrepareUpload(params: {
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
  targetDir?: string;
}): FileValidationResult {
  const { originalFilename, mimeType, buffer, targetDir = DEFAULT_UPLOAD_DIR } = params;

  // 1. Validate original file extension
  const rawExt = path.extname(originalFilename).toLowerCase();
  if (!rawExt || DANGEROUS_EXTENSIONS.has(rawExt)) {
    return {
      valid: false,
      error: `File extension '${rawExt}' is prohibited for security reasons`,
    };
  }

  // 2. Validate MIME type
  const allowed = ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
  if (!allowed) {
    return {
      valid: false,
      error: `MIME type '${mimeType}' is not allowed`,
    };
  }

  // 3. Ensure extension and MIME type correspond
  if (allowed.ext !== rawExt && !(rawExt === ".jpeg" && allowed.ext === ".jpg")) {
    return {
      valid: false,
      error: `File extension '${rawExt}' does not match declared MIME type '${mimeType}'`,
    };
  }

  // 4. Enforce strict file size limits
  const maxBytes =
    allowed.category === "image"
      ? FILE_LIMITS.IMAGE_MAX_BYTES
      : FILE_LIMITS.DOCUMENT_MAX_BYTES;

  if (buffer.length > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024);
    return {
      valid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds limit of ${maxMb} MB for ${allowed.category}s`,
    };
  }

  // 5. Binary integrity check via Magic Bytes
  if (!verifyMagicBytes(buffer, rawExt)) {
    return {
      valid: false,
      error: "File content signature (magic bytes) does not match expected format",
    };
  }

  // 6. Malware & Script Injection Scan
  const scan = scanForMaliciousPayloads(buffer);
  if (!scan.safe) {
    return {
      valid: false,
      error: `File rejected by security scanner: ${scan.reason}`,
    };
  }

  // 7. Generate UUID safe filename (Never use original filename)
  const safeFileName = `${crypto.randomUUID()}${allowed.ext}`;
  const storagePath = path.join(targetDir, safeFileName);

  return {
    valid: true,
    category: allowed.category,
    safeFileName,
    storagePath,
  };
}

/**
 * Saves validated upload with non-executable permissions outside web root.
 */
export function saveUploadSecurely(storagePath: string, buffer: Buffer): void {
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write with non-executable permission (0o644: rw-r--r--)
  fs.writeFileSync(storagePath, buffer, { mode: 0o644 });
}
