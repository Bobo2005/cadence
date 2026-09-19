import { formatEther as viemFormatEther } from "viem";

/**
 * Truncates an Ethereum address with leading and trailing characters.
 * Example: 0x043d...9e74
 */
export function formatAddress(
  address: string | null | undefined,
  head: number = 6,
  tail: number = 4
): string {
  if (!address) return "";
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

/**
 * Formats a duration in seconds into a structured object and countdown string.
 * Example: "2d 14h 32m 10s" or "03m 45s"
 */
export function formatCountdown(totalSeconds: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  let formatted = "";
  if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    formatted = `${minutes}m ${seconds}s`;
  }

  return { days, hours, minutes, seconds, formatted };
}

/**
 * Formats wei into ETH string with specified maximum decimals.
 */
export function formatBalance(
  wei: bigint | string | number | undefined,
  maxDecimals: number = 4
): string {
  if (wei === undefined || wei === null) return "0.00";
  try {
    const bigintWei = typeof wei === "bigint" ? wei : BigInt(wei.toString());
    const etherStr = viemFormatEther(bigintWei);
    const num = parseFloat(etherStr);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });
  } catch {
    return "0.00";
  }
}

/**
 * Masks an email address for privacy and zero data leakage.
 * Example: "alice@cadence.io" -> "a***e@cadence.io"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Formats a Unix timestamp into a readable date-time string.
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  if (!ts || ts === 0) return "Never";
  return new Date(ts * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
