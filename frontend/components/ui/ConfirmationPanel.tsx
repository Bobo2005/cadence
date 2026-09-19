"use client";

import React from "react";
import Button from "./Button";

export interface ConfirmationPanelProps {
  title: string;
  warningText: string;
  confirmButtonText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  variant?: "danger" | "warning" | "default";
  className?: string;
}

export default function ConfirmationPanel({
  title,
  warningText,
  confirmButtonText,
  onConfirm,
  onCancel,
  isProcessing = false,
  variant = "warning",
  className = "",
}: ConfirmationPanelProps) {
  const isDanger = variant === "danger";

  return (
    <div
      className={`p-6 sm:p-8 rounded-3xl bg-white border border-[#E8EAED] space-y-6 shadow-xl max-w-md mx-auto text-center font-sans ${className}`}
    >
      <div
        className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
          isDanger ? "bg-[#FDECEC] text-[#D64545]" : "bg-[#FFF6D8] text-[#D99A00]"
        }`}
      >
        ⚠
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-[#111111] tracking-tight">{title}</h3>
        <p className="text-xs sm:text-sm text-[#5F6368] leading-relaxed">{warningText}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant={isDanger ? "danger" : "primary"}
          onClick={onConfirm}
          isLoading={isProcessing}
          className="w-full sm:w-auto"
        >
          {confirmButtonText}
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
