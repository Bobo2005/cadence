"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "interactive" | "danger" | "success" | "warning";
}

export default function Card({
  children,
  variant = "default",
  className = "",
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-white border-[#E8EAED] text-[#111111]",
    subtle: "bg-[#F7F8FA] border-[#E8EAED] text-[#111111]",
    interactive: "bg-white border-[#E8EAED] hover:border-[#111111] transition-all cursor-pointer",
    danger: "bg-[#FFF5F5] border-[#FAD2CF] text-[#C5221F]",
    success: "bg-[#E6F4EA]/40 border-[#CEEAD6] text-[#137333]",
    warning: "bg-[#FFFBF0] border-[#F5B841]/50 text-[#B45309]",
  }[variant];

  return (
    <div
      className={`rounded-3xl border p-6 sm:p-8 shadow-xs ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
