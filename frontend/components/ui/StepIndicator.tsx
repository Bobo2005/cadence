"use client";

import React from "react";

export interface Step {
  number: number | string;
  title: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export default function StepIndicator({
  steps,
  currentStep,
  className = "",
}: StepIndicatorProps) {
  return (
    <div className={`flex items-center justify-between gap-2 w-full font-mono ${className}`}>
      {steps.map((step, idx) => {
        const isPast = idx + 1 < currentStep || step.isCompleted;
        const isCurrent = idx + 1 === currentStep || step.isCurrent;

        return (
          <React.Fragment key={idx}>
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isPast
                    ? "bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]"
                    : isCurrent
                    ? "bg-[#111111] text-white shadow-xs"
                    : "bg-[#F1F3F5] text-[#8A8F98]"
                }`}
              >
                {isPast ? "✓" : step.number}
              </span>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isCurrent ? "text-[#111111] font-bold" : "text-[#5F6368]"
                }`}
              >
                {step.title}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors ${
                  isPast ? "bg-[#22A06B]" : "bg-[#E8EAED]"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
