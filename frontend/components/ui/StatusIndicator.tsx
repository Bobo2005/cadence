"use client";

import React from "react";

export interface StatusIndicatorProps {
  label: string;
  statusText?: string;
  isHealthy?: boolean;
  className?: string;
}

export default function StatusIndicator({
  label,
  statusText = "OPERATIONAL",
  isHealthy = true,
  className = "",
}: StatusIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-xs font-mono ${className}`}>
      <span
        className={`w-2 h-2 rounded-full ${
          isHealthy ? "bg-[#22A06B] shadow-[0_0_8px_rgba(34,160,107,0.6)] animate-pulse" : "bg-[#D64545]"
        }`}
      />
      <span className="text-[#111111] font-semibold">{label}</span>
      <span className={isHealthy ? "text-[#22A06B]" : "text-[#D64545]"}>
        ● {statusText}
      </span>
    </div>
  );
}
