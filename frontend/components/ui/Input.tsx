"use client";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export default function Input({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  className = "",
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full space-y-1.5 text-left font-sans">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#111111] uppercase tracking-wider font-mono">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftElement && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#8A8F98]">
            {leftElement}
          </div>
        )}

        <input
          id={inputId}
          className={`w-full py-3 rounded-2xl bg-white border text-sm text-[#111111] placeholder:text-[#8A8F98] focus:outline-none transition-all shadow-2xs font-sans ${
            leftElement ? "pl-11" : "pl-4"
          } ${rightElement ? "pr-11" : "pr-4"} ${
            error
              ? "border-[#D64545] focus:border-[#D64545] focus:ring-1 focus:ring-[#D64545]"
              : "border-[#D9DCE1] hover:border-[#AEB3BB] focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF]"
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3.5 flex items-center text-[#8A8F98]">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-[#D64545] font-mono">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#5F6368]">{hint}</p>
      ) : null}
    </div>
  );
}
