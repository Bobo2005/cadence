"use client";

import React from "react";
import ECGChart from "./ECGChart";
import Button from "./Button";
import StatusBadge from "./StatusBadge";

export interface HeartbeatCardProps {
  status?: "ACTIVE" | "CLAIM PENDING" | "FINALIZED";
  intervalDays?: number;
  timeRemaining?: string;
  onCheckIn?: () => void;
  isCheckingIn?: boolean;
  className?: string;
}

export default function HeartbeatCard({
  status = "ACTIVE",
  intervalDays = 90,
  timeRemaining = "88d 14h 22m",
  onCheckIn,
  isCheckingIn = false,
  className = "",
}: HeartbeatCardProps) {
  return (
    <div
      className={`rounded-3xl bg-white border border-[#E8EAED] p-6 sm:p-8 space-y-6 shadow-xs font-sans ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EAED] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8A8F98]">
            LIVENESS TELEMETRY
          </div>
          <h3 className="text-xl font-bold text-[#111111] tracking-tight">
            Heartbeat Cadence
          </h3>
        </div>
        <StatusBadge
          status={status}
          variant={
            status === "ACTIVE"
              ? "active"
              : status === "CLAIM PENDING"
              ? "pending"
              : "finalized"
          }
        />
      </div>

      <ECGChart
        state={
          status === "ACTIVE"
            ? "active"
            : status === "CLAIM PENDING"
            ? "erratic"
            : "flatline"
        }
      />

      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED]">
          <div className="text-[#8A8F98] text-[10px] uppercase">CHECK-IN INTERVAL</div>
          <div className="text-[#111111] font-bold text-sm sm:text-base mt-0.5">
            {intervalDays} Days
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-[#E8EAED]">
          <div className="text-[#8A8F98] text-[10px] uppercase">REMAINING WINDOW</div>
          <div className="text-[#111111] font-bold text-sm sm:text-base mt-0.5">
            {timeRemaining}
          </div>
        </div>
      </div>

      {onCheckIn && (
        <div className="pt-1">
          <Button
            onClick={onCheckIn}
            isLoading={isCheckingIn}
            className="w-full sm:w-auto"
          >
            RECORD ON-CHAIN HEARTBEAT
          </Button>
        </div>
      )}
    </div>
  );
}
