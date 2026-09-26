/**
 * frontend/lib/totp.ts
 *
 * RFC 6238 Time-Based One-Time Password (TOTP) Generator.
 * Computes standard 6-digit Google Authenticator / Authy compatible codes
 * using client-side Web Crypto API (HMAC-SHA1).
 *
 * Zero plaintext persistence, zero network transmission.
 */

/**
 * Validates whether a string is a standard Base32 encoded secret.
 * Strips whitespace, hyphens, and equals signs before validating.
 */
export function isValidBase32(secret: string): boolean {
  if (!secret) return false;
  const clean = secret.toUpperCase().replace(/[\s=-]/g, "");
  return clean.length >= 8 && /^[A-Z2-7]+$/.test(clean);
}

/**
 * Decodes a Base32 string into a Uint8Array byte buffer.
 */
export function base32ToBytes(secret: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secret.toUpperCase().replace(/[\s=-]/g, "");
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = chars.indexOf(clean.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

/**
 * Calculates current seconds remaining in the standard 30-second TOTP cycle.
 */
export function getTotpSecondsRemaining(timeStep = 30): number {
  const epoch = Math.floor(Date.now() / 1000);
  return timeStep - (epoch % timeStep);
}

/**
 * Generates the current 6-digit TOTP code for a Base32 secret using Web Crypto API.
 */
export async function generateTOTP(
  secretBase32: string,
  timeStep = 30,
  epochSeconds?: number
): Promise<{ code: string; secondsRemaining: number }> {
  const clean = secretBase32.trim();
  if (!isValidBase32(clean)) {
    return { code: "------", secondsRemaining: 30 };
  }

  const now = epochSeconds ?? Math.floor(Date.now() / 1000);
  const timeCounter = Math.floor(now / timeStep);
  const secondsRemaining = timeStep - (now % timeStep);

  try {
    const keyBytes = base32ToBytes(clean);
    if (keyBytes.length === 0) {
      return { code: "------", secondsRemaining: 30 };
    }

    // Prepare 8-byte big-endian counter buffer
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setBigUint64(0, BigInt(timeCounter), false);

    let hmacBytes: Uint8Array;

    // Use Web Crypto if available, otherwise fallback to Node crypto
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes as unknown as BufferSource,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
      );

      const signature = await window.crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        counterBuffer
      );
      hmacBytes = new Uint8Array(signature);
    } else {
      // Node.js environment fallback
      const nodeCrypto = await import("crypto");
      const hmac = nodeCrypto.createHmac("sha1", Buffer.from(keyBytes));
      hmac.update(Buffer.from(counterBuffer));
      hmacBytes = new Uint8Array(hmac.digest());
    }

    // Dynamic truncation (RFC 4226 / RFC 6238)
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, "0");
    return { code: otp, secondsRemaining };
  } catch (err) {
    console.error("Failed to generate TOTP code:", err);
    return { code: "------", secondsRemaining: 30 };
  }
}
