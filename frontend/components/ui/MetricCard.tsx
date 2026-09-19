"use client";

import React from "react";

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  subtitle,
  badge,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`p-5 rounded-2xl bg-white border border-[#E8EAED] space-y-1.5 shadow-2xs font-sans ${className}`}
    >
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A8F98]">
        <span>{label}</span>
        {badge && <div>{badge}</div>}
      </div>
      <div className="text-xl sm:text-2xl font-bold font-mono text-[#111111] tracking-tight">
        {value}
      </div>
      {subtitle && <div className="text-xs text-[#5F6368]">{subtitle}</div>}
    </div>
  );
}
