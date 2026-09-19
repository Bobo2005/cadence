"use client";

import React, { useState, useEffect } from "react";

export interface CountdownProps {
  targetTimestamp?: number; // Unix seconds
  initialHours?: number;
  initialMinutes?: number;
  initialSeconds?: number;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  onExpire?: () => void;
}

export default function Countdown({
  targetTimestamp,
  initialHours = 47,
  initialMinutes = 12,
  initialSeconds = 8,
  label = "TIME REMAINING",
  className = "",
  size = "lg",
  onExpire,
}: CountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (targetTimestamp) {
      const diff = targetTimestamp - Math.floor(Date.now() / 1000);
      return Math.max(0, diff);
    }
    return initialHours * 3600 + initialMinutes * 60 + initialSeconds;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onExpire]);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  const sizeStyles = {
    sm: "text-base sm:text-lg",
    md: "text-2xl sm:text-3xl",
    lg: "text-4xl sm:text-5xl md:text-6xl",
    xl: "text-5xl sm:text-7xl md:text-8xl",
  }[size];

  return (
    <div className={`space-y-1 text-center font-mono ${className}`}>
      {label && (
        <span className="text-[11px] font-bold tracking-widest text-[#5F6368] uppercase block">
          {label}
        </span>
      )}
      <div className={`font-bold tracking-tight text-[#111111] break-words tabular-nums ${sizeStyles}`}>
        {pad(h)}h : {pad(m)}m : {pad(s)}s
      </div>
    </div>
  );
}
