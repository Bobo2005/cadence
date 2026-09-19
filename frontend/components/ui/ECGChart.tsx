"use client";

import React from "react";
import LiveECGMonitor, { type ECGState } from "./LiveECGMonitor";

export interface ECGChartProps {
  state?: ECGState;
  bpm?: number;
  label?: string;
  className?: string;
}

export default function ECGChart({
  state = "active",
  bpm = 72,
  label,
  className = "",
}: ECGChartProps) {
  const stateLabels: Record<ECGState, string> = {
    active: "68–74 BPM · SYNCHRONIZED",
    erratic: "88 BPM · UNSTABLE",
    flatline: "0 BPM · DISCHARGED",
  };

  const stateColors: Record<ECGState, string> = {
    active: "text-[#22A06B]",
    erratic: "text-[#D97706]",
    flatline: "text-[#C5221F]",
  };

  return (
    <div
      className={`relative bg-white/90 backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-[#E8EAED] shadow-2xs ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-mono text-[#5F6368] mb-1.5 px-1">
        <span>{label || "CARDIAC MONITORING SIGNAL"}</span>
        <span className={`font-semibold ${stateColors[state]}`}>
          {stateLabels[state]}
        </span>
      </div>
      <LiveECGMonitor state={state} bpm={bpm} />
    </div>
  );
}
