"use client";

import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export default function Select({
  label,
  options,
  error,
  className = "",
  id,
  ...props
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full space-y-1.5 text-left font-sans">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-[#111111] uppercase tracking-wider font-mono">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={`w-full py-3 pl-4 pr-10 rounded-2xl bg-white border appearance-none text-sm text-[#111111] focus:outline-none transition-all shadow-2xs font-sans cursor-pointer ${
            error
              ? "border-[#D64545] focus:border-[#D64545]"
              : "border-[#D9DCE1] hover:border-[#AEB3BB] focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF]"
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A8F98]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error && <p className="text-xs text-[#D64545] font-mono">{error}</p>}
    </div>
  );
}
