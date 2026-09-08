"use client";

import React, { useState, useEffect, useId } from "react";
import { type Address, isAddress } from "viem";
import { generateSalt, type BeneficiaryAllocation } from "../lib/merkle";

export interface BeneficiaryItem {
  id: string;
  name: string;
  address: string;
  shareBps: number;
  suggestedEmail?: string;
}

export interface BeneficiarySetupFormProps {
  initialBeneficiaries?: BeneficiaryItem[];
  onChange?: (state: {
    beneficiaries: BeneficiaryItem[];
    totalBps: number;
    isValid: boolean;
    allocations: BeneficiaryAllocation[];
    errorMessage?: string;
  }) => void;
}

const DEFAULT_BENEFICIARIES: BeneficiaryItem[] = [
  {
    id: "ben-1",
    name: "Primary Beneficiary",
    address: "",
    shareBps: 6000, // 60%
  },
  {
    id: "ben-2",
    name: "Secondary Beneficiary",
    address: "",
    shareBps: 4000, // 40%
  },
];

const SEGMENT_COLORS = [
  "#2EE6A8", // Teal / Pulse
  "#38BDF8", // Sky Blue
  "#A78BFA", // Lavender
  "#F472B6", // Pink
  "#FBBF24", // Amber
  "#34D399", // Emerald
];

export default function BeneficiarySetupForm({
  initialBeneficiaries = DEFAULT_BENEFICIARIES,
  onChange,
}: BeneficiarySetupFormProps) {
  const formId = useId();
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryItem[]>(initialBeneficiaries);
  const [showExplainer, setShowExplainer] = useState(false);

  // Calculate live sum in basis points
  const totalBps = beneficiaries.reduce(
    (sum, b) => sum + (Number.isFinite(b.shareBps) ? Number(b.shareBps) : 0),
    0
  );
  const totalPercent = (totalBps / 100).toFixed(2);
  const remainingBps = 10000 - totalBps;
  const isExact10000 = totalBps === 10000;
  const isOverAllocated = totalBps > 10000;
  const isUnderAllocated = totalBps < 10000;

  // Validate addresses
  const invalidAddressIndices = beneficiaries
    .map((b, idx) => (!b.address || !isAddress(b.address) ? idx : -1))
    .filter((idx) => idx !== -1);
  const areAddressesValid = invalidAddressIndices.length === 0;

  const isFormValid = isExact10000 && areAddressesValid && beneficiaries.length > 0;

  // Determine error message
  let errorMessage: string | undefined;
  if (isUnderAllocated) {
    errorMessage = `Total allocation is ${totalBps.toLocaleString()} / 10,000 bps (${totalPercent}%). Underallocated by ${remainingBps.toLocaleString()} bps (${(remainingBps / 100).toFixed(2)}%). Exactly 10,000 bps (100%) required before creating vault.`;
  } else if (isOverAllocated) {
    const surplus = totalBps - 10000;
    errorMessage = `Total allocation exceeds 100%: ${totalBps.toLocaleString()} / 10,000 bps (${totalPercent}%). Overallocated by ${surplus.toLocaleString()} bps (${(surplus / 100).toFixed(2)}%). Please reduce shares to exactly 10,000 bps.`;
  } else if (!areAddressesValid) {
    errorMessage = `Please enter valid Ethereum addresses (0x...) for all beneficiaries.`;
  }

  const onChangeRef = React.useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Track previous serialized state to only fire onChange when data genuinely changes
  const prevSerializedRef = React.useRef<string>("");

  // Notify parent component on state change safely
  useEffect(() => {
    const serialized = JSON.stringify({
      beneficiaries,
      totalBps,
      isFormValid,
      errorMessage,
    });

    if (serialized !== prevSerializedRef.current) {
      prevSerializedRef.current = serialized;
      if (onChangeRef.current) {
        const allocations: BeneficiaryAllocation[] = beneficiaries.map((b) => ({
          address: (b.address as Address) || "0x0000000000000000000000000000000000000000",
          shareBps: BigInt(b.shareBps || 0),
          salt: generateSalt(),
        }));

        onChangeRef.current({
          beneficiaries,
          totalBps,
          isValid: isFormValid,
          allocations,
          errorMessage,
        });
      }
    }
  }, [beneficiaries, totalBps, isFormValid, errorMessage]);

  // Update a single field
  const updateBeneficiary = (id: string, field: keyof BeneficiaryItem, value: string | number) => {
    setBeneficiaries((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Add a new row
  const addBeneficiary = () => {
    const newShare = remainingBps > 0 ? remainingBps : 0;
    const newId = `ben-${Date.now()}`;
    setBeneficiaries((prev) => [
      ...prev,
      {
        id: newId,
        name: `Beneficiary ${prev.length + 1}`,
        address: "",
        shareBps: newShare,
      },
    ]);
  };

  // Remove a row
  const removeBeneficiary = (id: string) => {
    if (beneficiaries.length <= 1) return;
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  // Auto-balance evenly
  const autoBalanceEvenly = () => {
    const count = beneficiaries.length;
    if (count === 0) return;
    const baseShare = Math.floor(10000 / count);
    const remainder = 10000 - baseShare * count;

    setBeneficiaries((prev) =>
      prev.map((b, idx) => ({
        ...b,
        // Give remainder to the last beneficiary so sum is guaranteed to be 10,000 bps
        shareBps: idx === count - 1 ? baseShare + remainder : baseShare,
      }))
    );
  };

  // Fill remaining bps for specific row
  const fillRemaining = (id: string) => {
    setBeneficiaries((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const currentShare = b.shareBps || 0;
          const adjusted = currentShare + remainingBps;
          return { ...b, shareBps: Math.max(0, adjusted) };
        }
        return b;
      })
    );
  };

  return (
    <div
      id={`${formId}-beneficiary-form`}
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl transition-all"
    >
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Beneficiary Allocations
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-surface-alt)] text-[var(--accent-pulse)] font-mono border border-[var(--accent-pulse)]/20">
              Off-Chain Merkle Root
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Specify heir addresses and share splits in basis points (100 bps = 1.00%).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoBalanceEvenly}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-surface-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)] flex items-center gap-1.5 cursor-pointer"
            title="Split 10,000 bps evenly among all beneficiaries"
          >
            <svg className="w-3.5 h-3.5 text-[var(--accent-pulse)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Auto-Balance
          </button>

          <button
            type="button"
            onClick={() => {
              setBeneficiaries([
                {
                  id: "ben-1",
                  name: "Alice",
                  address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                  shareBps: 6000,
                },
                {
                  id: "ben-2",
                  name: "Bob",
                  address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                  shareBps: 4000,
                },
              ]);
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-surface-alt)] hover:bg-[var(--border-subtle)] text-[var(--accent-pulse)] transition-colors border border-[var(--border-subtle)] flex items-center gap-1.5 cursor-pointer"
            title="Prefill with Alice and Bob demo addresses for testing"
          >
            + Demo Beneficiaries
          </button>

          <button
            type="button"
            onClick={() => setShowExplainer(!showExplainer)}
            className="p-1.5 text-xs rounded-lg bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer"
            aria-label="Explain constraint #4"
            title="Why does total validation happen client-side?"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Explainer Accordion (Anti-Bridge-Anxiety & Constraint #4) */}
      {showExplainer && (
        <div className="mt-4 p-4 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--accent-pulse)]/20 text-xs text-[var(--text-secondary)] space-y-2">
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-pulse)] animate-ping" />
            Why must allocations sum to exactly 10,000 bps client-side? (Constraint #4)
          </div>
          <p>
            Cadence enforces <strong>complete allocation privacy</strong> (Constraint #3). The smart contract stores only a 32-byte cryptographic Merkle root (<code>allocationRoot</code>) — individual percentages and blinding salts are ECIES-encrypted and never touch the blockchain in plaintext.
          </p>
          <p>
            Because the contract cannot inspect or decrypt plaintext shares on-chain, <strong>total-allocation validation structurally cannot happen on-chain</strong>. It must be strictly enforced here in the client UI before the Merkle tree is generated and submitted to the blockchain.
          </p>
        </div>
      )}

      {/* Live Allocation Visual Progress Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)] font-medium">
            Total Allocated:
          </span>
          <div className="flex items-center gap-2 font-mono">
            <span
              className={`font-semibold ${
                isExact10000
                  ? "text-[var(--accent-pulse)]"
                  : isOverAllocated
                  ? "text-[var(--accent-danger)]"
                  : "text-[var(--accent-warning)]"
              }`}
            >
              {totalBps.toLocaleString()} / 10,000 bps
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isExact10000
                  ? "bg-[var(--accent-pulse)]/15 text-[var(--accent-pulse)] border border-[var(--accent-pulse)]/30"
                  : isOverAllocated
                  ? "bg-[var(--accent-danger)]/15 text-[var(--accent-danger)] border border-[var(--accent-danger)]/30"
                  : "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] border border-[var(--accent-warning)]/30"
              }`}
            >
              {totalPercent}%
            </span>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="h-3 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden flex border border-[var(--border-subtle)] relative">
          {beneficiaries.map((b, idx) => {
            const share = Number(b.shareBps) || 0;
            const widthPct = Math.min(100, Math.max(0, (share / 10000) * 100));
            if (widthPct <= 0) return null;
            return (
              <div
                key={b.id}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
                }}
                className="h-full transition-all duration-300 relative group"
                title={`${b.name || `Beneficiary ${idx + 1}`}: ${share} bps (${(share / 100).toFixed(2)}%)`}
              />
            );
          })}

          {/* Over-allocation indicator */}
          {isOverAllocated && (
            <div
              className="h-full bg-[var(--accent-danger)] animate-pulse"
              style={{ width: `${Math.min(100, ((totalBps - 10000) / 10000) * 100)}%` }}
              title={`Over-allocated by ${totalBps - 10000} bps`}
            />
          )}
        </div>
      </div>

      {/* Clear Inline Error / Success Alert */}
      <div className="mt-4">
        {isUnderAllocated && (
          <div
            id="allocation-inline-warning"
            className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--accent-warning)]/40 bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] text-xs leading-relaxed"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-sm">Allocation Incomplete</div>
              <p className="mt-0.5">
                Current total is <strong className="font-mono">{totalBps.toLocaleString()} bps</strong> ({totalPercent}%). You must allocate the remaining <strong className="font-mono">{remainingBps.toLocaleString()} bps</strong> ({(remainingBps / 100).toFixed(2)}%) to reach exactly 10,000 bps (100%) before constructing the Merkle tree.
              </p>
            </div>
          </div>
        )}

        {isOverAllocated && (
          <div
            id="allocation-inline-error"
            className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] text-xs leading-relaxed"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-sm">Allocation Exceeds 100%</div>
              <p className="mt-0.5">
                Current total is <strong className="font-mono">{totalBps.toLocaleString()} bps</strong> ({totalPercent}%). Overallocated by <strong className="font-mono">{(totalBps - 10000).toLocaleString()} bps</strong> ({((totalBps - 10000) / 100).toFixed(2)}%). Please reduce beneficiary shares to exactly 10,000 bps before proceeding.
              </p>
            </div>
          </div>
        )}

        {isExact10000 && areAddressesValid && (
          <div
            id="allocation-inline-success"
            className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--accent-pulse)]/40 bg-[var(--accent-pulse)]/10 text-[var(--accent-pulse)] text-xs leading-relaxed"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-sm">Perfect Allocation Verified</div>
              <p className="mt-0.5">
                All shares sum to exactly <strong className="font-mono">10,000 bps (100.00%)</strong> across {beneficiaries.length} beneficiaries. Ready to generate cryptographically blind Merkle leaves and build the vault deployment commitment.
              </p>
            </div>
          </div>
        )}

        {isExact10000 && !areAddressesValid && (
          <div
            id="allocation-inline-address-error"
            className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--accent-warning)]/40 bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] text-xs leading-relaxed"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-sm">Invalid Beneficiary Address</div>
              <p className="mt-0.5">
                Total shares sum to 10,000 bps, but one or more beneficiary addresses are invalid. Enter valid 42-character 0x addresses.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Beneficiary Rows List */}
      <div className="mt-6 space-y-4">
        {beneficiaries.map((b, index) => {
          const isAddrValid = !b.address || isAddress(b.address);
          const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

          return (
            <div
              key={b.id}
              className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-3 transition-all hover:border-[var(--border-subtle)]/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => updateBeneficiary(b.id, "name", e.target.value)}
                    placeholder={`Beneficiary ${index + 1}`}
                    className="text-sm font-medium bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-pulse)]/50 rounded px-1.5 py-0.5 border border-transparent hover:border-[var(--border-subtle)]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {remainingBps > 0 && (
                    <button
                      type="button"
                      onClick={() => fillRemaining(b.id)}
                      className="px-2 py-1 text-[11px] font-mono rounded bg-[var(--bg-primary)] hover:bg-[var(--border-subtle)] text-[var(--accent-pulse)] border border-[var(--accent-pulse)]/30 transition-colors cursor-pointer"
                      title={`Add remaining ${remainingBps} bps to this beneficiary`}
                    >
                      + {remainingBps} bps
                    </button>
                  )}

                  {beneficiaries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBeneficiary(b.id)}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-danger)] transition-colors cursor-pointer"
                      title="Remove beneficiary"
                      aria-label="Remove beneficiary"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Address and Share Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Beneficiary Address */}
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Beneficiary Wallet / Stealth Address
                  </label>
                  <input
                    type="text"
                    value={b.address}
                    onChange={(e) => updateBeneficiary(b.id, "address", e.target.value.trim())}
                    placeholder="0x..."
                    className={`w-full font-mono text-xs px-3 py-2 rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] border focus:outline-none focus:ring-1 ${
                      isAddrValid
                        ? "border-[var(--border-subtle)] focus:border-[var(--accent-pulse)] focus:ring-[var(--accent-pulse)]/30"
                        : "border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]/30"
                    }`}
                  />
                  {!isAddrValid && (
                    <span className="text-[10px] text-[var(--accent-danger)] mt-1 block">
                      Invalid Ethereum address format
                    </span>
                  )}
                </div>

                {/* Share in Basis Points */}
                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)]">
                      Share Allocation
                    </label>
                    <span className="text-[11px] font-mono text-[var(--accent-pulse)] font-semibold">
                      {((Number(b.shareBps) || 0) / 100).toFixed(2)}%
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={1}
                      value={b.shareBps === 0 ? "" : b.shareBps}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                        updateBeneficiary(b.id, "shareBps", isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      placeholder="0"
                      className="w-full font-mono text-xs px-3 py-2 pr-12 rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent-pulse)] focus:ring-1 focus:ring-[var(--accent-pulse)]/30"
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-mono text-[var(--text-secondary)]">
                      bps
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Presets for this beneficiary */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[var(--text-secondary)]">Presets:</span>
                {[1000, 2500, 3333, 5000, 10000].map((presetBps) => (
                  <button
                    key={presetBps}
                    type="button"
                    onClick={() => updateBeneficiary(b.id, "shareBps", presetBps)}
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                  >
                    {(presetBps / 100).toFixed(presetBps % 100 === 0 ? 0 : 2)}%
                  </button>
                ))}
              </div>

              {/* Optional Beneficiary Email Suggestion (DESIGN-SYSTEM.md item 3) */}
              <div className="pt-2.5 border-t border-[var(--border-subtle)]/50 space-y-1">
                <label className="block text-[11px] font-medium text-[var(--text-secondary)]">
                  Suggest an email for this beneficiary (optional)
                </label>
                <input
                  type="email"
                  value={b.suggestedEmail || ""}
                  onChange={(e) => updateBeneficiary(b.id, "suggestedEmail", e.target.value.trim())}
                  placeholder="beneficiary@example.com"
                  className="w-full font-mono text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent-pulse)]"
                />
                <p className="text-[10px] text-[var(--text-secondary)]">
                  They&apos;ll need to confirm this themselves before any notification is sent
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Beneficiary Action */}
      <div className="mt-5 flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={addBeneficiary}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--bg-surface-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4 text-[var(--accent-pulse)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Beneficiary
        </button>

        <div className="text-right text-xs font-mono">
          <span className="text-[var(--text-secondary)]">Sum: </span>
          <span
            className={`font-semibold ${
              isExact10000
                ? "text-[var(--accent-pulse)]"
                : isOverAllocated
                ? "text-[var(--accent-danger)]"
                : "text-[var(--accent-warning)]"
            }`}
          >
            {totalBps.toLocaleString()} / 10,000 bps ({totalPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}
