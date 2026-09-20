"use client";

import React, { useState, useEffect, useRef } from "react";

interface LiveStreamCounterProps {
  ratePerSecText?: string;
  initialReceivedEth?: number;
  ratePerSecEth?: number;
  isStreaming?: boolean;
  className?: string;
}

/**
 * LiveStreamCounter
 *
 * Isolated streaming counter component that updates only the numeric received amount
 * on a local ticker without causing whole-page React re-renders.
 */
export default function LiveStreamCounter({
  ratePerSecText = "0.00000231 ETH / SEC",
  initialReceivedEth = 0.0184,
  ratePerSecEth = 0.00000231,
  isStreaming = true,
  className = "",
}: LiveStreamCounterProps) {
  const [currentReceived, setCurrentReceived] = useState<number>(initialReceivedEth);
  const receivedRef = useRef<number>(initialReceivedEth);

  useEffect(() => {
    receivedRef.current = initialReceivedEth;
    setCurrentReceived(initialReceivedEth);
  }, [initialReceivedEth]);

  useEffect(() => {
    if (!isStreaming) return;

    // Local numeric update interval: increments numeric received amount every 100ms
    const interval = setInterval(() => {
      receivedRef.current += ratePerSecEth * 0.1;
      setCurrentReceived(receivedRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, ratePerSecEth]);

  return (
    <div
      className={`p-5 rounded-2xl bg-white border border-[#E8EAED] space-y-3 font-mono shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#22A06B] font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-pulse" />
          STREAMING
        </span>
        <span className="text-[#111111] font-semibold">{ratePerSecText}</span>
      </div>

      <div className="flex items-baseline justify-between pt-2 border-t border-[#E8EAED]">
        <span className="text-xs text-[#5F6368] font-bold uppercase tracking-wider">
          RECEIVED
        </span>
        <span className="text-2xl sm:text-3xl font-bold text-[#111111] tabular-nums tracking-tight">
          {currentReceived.toFixed(6)}{" "}
          <span className="text-sm font-semibold text-[#5F6368]">ETH</span>
        </span>
      </div>
    </div>
  );
}
