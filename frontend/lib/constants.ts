/**
 * frontend/lib/constants.ts
 *
 * Protocol constants, intervals, tokens, and presets.
 */

export interface IntervalPreset {
  label: string;
  seconds: number;
  display?: string;
  isTest?: boolean;
  desc?: string;
}

export const CHECKIN_INTERVALS: readonly IntervalPreset[] = [
  { label: "5 MIN (TEST)", display: "5 Minutes", seconds: 300, isTest: true, desc: "Rapid heartbeat testing (300s)" },
  { label: "10 MIN (TEST)", display: "10 Minutes", seconds: 600, isTest: true, desc: "Short inactivity testing (600s)" },
  { label: "30 DAYS", display: "30 Days", seconds: 86400 * 30, isTest: false, desc: "Active / Frequent check-in" },
  { label: "60 DAYS", display: "60 Days", seconds: 86400 * 60, isTest: false, desc: "Standard personal vault" },
  { label: "90 DAYS", display: "90 Days", seconds: 86400 * 90, isTest: false, desc: "Recommended Cadence default" },
  { label: "180 DAYS", display: "180 Days", seconds: 86400 * 180, isTest: false, desc: "Long-term cold storage" },
] as const;

export const INTERVAL_PRESETS = CHECKIN_INTERVALS;

export const CONTEST_PRESETS = [
  { label: "24 HOURS (TEST)", seconds: 86400, isTest: true },
  { label: "48 HOURS", seconds: 172800, isTest: false },
  { label: "72 HOURS (RECOMMENDED)", seconds: 259200, isTest: false },
  { label: "7 DAYS", seconds: 604800, isTest: false },
] as const;

export const SUPPORTED_TOKENS = [
  { symbol: "ETH", name: "Ethereum", icon: "Ξ" },
  { symbol: "USDC", name: "USD Coin", icon: "$" },
  { symbol: "USDT", name: "Tether USD", icon: "₮" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", icon: "₿" },
] as const;

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_EXPLORER_URL = "https://sepolia.etherscan.io";
