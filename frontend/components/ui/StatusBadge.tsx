"use client";

import React from "react";

export type StatusVariant =
  | "active"
  | "pending"
  | "finalized"
  | "claimed"
  | "operational"
  | "synchronized"
  | "verified"
  | "warning"
  | "error";

export interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
  pulse?: boolean;
}

export default function StatusBadge({
  status,
  variant = "active",
  className = "",
  pulse = true,
}: StatusBadgeProps) {
  const styles: Record<StatusVariant, { bg: string; text: string; border: string; dot: string }> = {
    active: {
      bg: "bg-[#E9F8F1]",
      text: "text-[#22A06B]",
      border: "border-[#22A06B]/20",
      dot: "bg-[#22A06B]",
    },
    operational: {
      bg: "bg-[#E9F8F1]",
      text: "text-[#22A06B]",
      border: "border-[#22A06B]/20",
      dot: "bg-[#22A06B]",
    },
    synchronized: {
      bg: "bg-[#E9F8F1]",
      text: "text-[#22A06B]",
      border: "border-[#22A06B]/20",
      dot: "bg-[#22A06B]",
    },
    verified: {
      bg: "bg-[#E9F8F1]",
      text: "text-[#22A06B]",
      border: "border-[#22A06B]/20",
      dot: "bg-[#22A06B]",
    },
    pending: {
      bg: "bg-[#FFF6D8]",
      text: "text-[#D99A00]",
      border: "border-[#D99A00]/25",
      dot: "bg-[#D99A00]",
    },
    warning: {
      bg: "bg-[#FFF6D8]",
      text: "text-[#D99A00]",
      border: "border-[#D99A00]/25",
      dot: "bg-[#D99A00]",
    },
    finalized: {
      bg: "bg-[#FDECEC]",
      text: "text-[#D64545]",
      border: "border-[#D64545]/20",
      dot: "bg-[#D64545]",
    },
    error: {
      bg: "bg-[#FDECEC]",
      text: "text-[#D64545]",
      border: "border-[#D64545]/20",
      dot: "bg-[#D64545]",
    },
    claimed: {
      bg: "bg-[#F1F3F5]",
      text: "text-[#5F6368]",
      border: "border-[#E8EAED]",
      dot: "bg-[#8A8F98]",
    },
  };

  const current = styles[variant] || styles.active;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-mono font-medium uppercase tracking-wider ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} ${pulse ? "animate-pulse" : ""}`} />
      <span>{status}</span>
    </span>
  );
}
