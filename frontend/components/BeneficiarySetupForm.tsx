"use client";

import React, { useState, useEffect, useId } from "react";
import { type Address, isAddress } from "viem";
import { generateSalt, type BeneficiaryAllocation } from "../lib/merkle";
import OffChainLegacyBoxBuilder from "./OffChainLegacyBoxBuilder";
import type { SecretBoxItem } from "../types/secretBox";

export interface BeneficiaryItem {
  id: string;
  name: string;
  address: string;
  shareBps: number;
  suggestedEmail?: string;
  publicKey?: string;
  secretBoxItems?: SecretBoxItem[];
  personalMessage?: string;
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
      className="space-y-6"
    >
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8EAED]">
        <div>
          <h3 className="text-base font-bold text-[#111111]">
            Beneficiary Allocation
          </h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Specify heir addresses and share splits in basis points (100 BPS = 1.00%).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoBalanceEvenly}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-[#F7F8FA] hover:bg-[#E8EAED] text-[#111111] transition-colors border border-[#E8EAED] flex items-center gap-1.5 cursor-pointer"
            title="Split 10,000 bps evenly among all beneficiaries"
          >
            <svg className="w-3.5 h-3.5 text-[#7C5CFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Auto-Balance
          </button>

          <button
            type="button"
            onClick={() => setShowExplainer(!showExplainer)}
            className="w-7 h-7 flex items-center justify-center text-xs rounded-full bg-[#F7F8FA] text-[#5F6368] hover:text-[#111111] border border-[#E8EAED] cursor-pointer"
            aria-label="Explain allocation privacy"
            title="Why does total validation happen client-side?"
          >
            ?
          </button>
        </div>
      </div>

      {/* Explainer Card */}
      {showExplainer && (
        <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED] text-xs text-[#5F6368] space-y-2 animate-in fade-in">
          <div className="font-semibold text-[#111111] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#7C5CFF]" />
            Why must allocations sum to exactly 10,000 BPS client-side?
          </div>
          <p className="leading-relaxed">
            Cadence enforces <strong>complete allocation privacy</strong>. The smart contract stores only a 32-byte cryptographic Merkle root (<code>allocationRoot</code>) — individual percentages and blinding salts are ECIES-encrypted and never touch the blockchain in plaintext.
          </p>
          <p className="leading-relaxed">
            Because the contract cannot inspect or decrypt plaintext shares on-chain, <strong>total allocation validation structurally cannot happen on-chain</strong>. It must be strictly verified here in the client UI before the Merkle tree is generated.
          </p>
        </div>
      )}

      {/* Repeatable Beneficiary Rows */}
      <div className="space-y-4">
        {beneficiaries.map((b, index) => {
          const isAddrValid = !b.address || isAddress(b.address);
          const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

          return (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-white border border-[#E8EAED] shadow-sm space-y-4 transition-all hover:border-[#111111]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => updateBeneficiary(b.id, "name", e.target.value)}
                    placeholder={`Beneficiary ${index + 1}`}
                    className="text-sm font-semibold bg-transparent text-[#111111] focus:outline-none focus:border-b focus:border-[#111111] px-1 py-0.5 border-b border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {remainingBps > 0 && (
                    <button
                      type="button"
                      onClick={() => fillRemaining(b.id)}
                      className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-full bg-[#F0ECFF] hover:bg-[#E5DFFF] text-[#7C5CFF] border border-[#7C5CFF]/30 transition-colors cursor-pointer"
                      title={`Add remaining ${remainingBps} BPS to this beneficiary`}
                    >
                      + {remainingBps} BPS
                    </button>
                  )}

                  {beneficiaries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBeneficiary(b.id)}
                      className="p-1.5 text-[#8A8F98] hover:text-[#D64545] rounded-full hover:bg-[#FDECEC] transition-colors cursor-pointer"
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

              {/* Address and Allocation Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Beneficiary Address */}
                <div className="sm:col-span-8 space-y-1.5">
                  <label className="block text-[11px] font-mono font-semibold text-[#8A8F98] uppercase tracking-wider">
                    BENEFICIARY ADDRESS
                  </label>
                  <input
                    type="text"
                    value={b.address}
                    onChange={(e) => updateBeneficiary(b.id, "address", e.target.value.trim())}
                    placeholder="0xABCD...1234"
                    className={`w-full font-mono text-xs px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] text-[#111111] border focus:outline-none focus:bg-white transition-all ${
                      isAddrValid
                        ? "border-[#E8EAED] focus:border-[#111111]"
                        : "border-[#D64545] focus:border-[#D64545]"
                    }`}
                  />
                  {!isAddrValid && (
                    <span className="text-[10px] text-[#D64545] mt-1 block">
                      Invalid Ethereum address format
                    </span>
                  )}
                </div>

                {/* Allocation in Basis Points */}
                <div className="sm:col-span-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono font-semibold text-[#8A8F98] uppercase tracking-wider">
                      ALLOCATION
                    </label>
                    <span className="text-xs font-mono text-[#7C5CFF] font-bold">
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
                      placeholder="6000"
                      className="w-full font-mono text-xs px-3.5 py-2.5 pr-12 rounded-xl bg-[#F7F8FA] text-[#111111] border border-[#E8EAED] focus:outline-none focus:bg-white focus:border-[#111111] transition-all font-semibold"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[11px] font-mono text-[#8A8F98]">
                      BPS
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Presets for this beneficiary */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#8A8F98] font-mono uppercase">Presets:</span>
                {[1000, 2500, 3333, 5000, 10000].map((presetBps) => (
                  <button
                    key={presetBps}
                    type="button"
                    onClick={() => updateBeneficiary(b.id, "shareBps", presetBps)}
                    className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-[#F7F8FA] text-[#5F6368] hover:text-[#111111] hover:bg-[#E8EAED] border border-[#E8EAED] transition-colors cursor-pointer"
                  >
                    {(presetBps / 100).toFixed(presetBps % 100 === 0 ? 0 : 2)}%
                  </button>
                ))}
              </div>

              {/* Optional Beneficiary Email Suggestion */}
              <div className="pt-3 border-t border-[#E8EAED] space-y-1">
                <label className="block text-[11px] text-[#5F6368]">
                  Notification Email for Heir <span className="text-[#8A8F98]">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={b.suggestedEmail || ""}
                  onChange={(e) => updateBeneficiary(b.id, "suggestedEmail", e.target.value.trim())}
                  placeholder="heir@example.com"
                  className="w-full font-mono text-xs px-3.5 py-2 rounded-xl bg-[#F7F8FA] text-[#111111] border border-[#E8EAED] focus:outline-none focus:bg-white focus:border-[#111111] transition-all"
                />
                <p className="text-[10px] text-[#8A8F98]">
                  Heirs will be prompted to verify this email with a wallet signature before any claim notification is dispatched.
                </p>
              </div>

              {/* Off-Chain Legacy Box (Encrypted CEX, Seed Shards, Passwords, Will) */}
              <OffChainLegacyBoxBuilder
                beneficiaryName={b.name || `Beneficiary ${index + 1}`}
                beneficiaryAddress={b.address}
                items={b.secretBoxItems || []}
                personalMessage={b.personalMessage || ""}
                onChange={(items, personalMessage) => {
                  setBeneficiaries((prev) =>
                    prev.map((item) =>
                      item.id === b.id
                        ? { ...item, secretBoxItems: items, personalMessage }
                        : item
                    )
                  );
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Add Beneficiary Action Row */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={addBeneficiary}
          className="px-5 py-2.5 text-xs font-semibold rounded-full bg-[#F7F8FA] hover:bg-[#E8EAED] text-[#111111] border border-[#E8EAED] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <svg className="w-4 h-4 text-[#111111]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Beneficiary</span>
        </button>

        <div className="text-right text-xs font-mono">
          <span className="text-[#8A8F98]">Total: </span>
          <span
            className={`font-bold ${
              isExact10000
                ? "text-[#22A06B]"
                : isOverAllocated
                ? "text-[#D64545]"
                : "text-[#D99A00]"
            }`}
          >
            {totalBps.toLocaleString()} / 10,000 BPS ({totalPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}
