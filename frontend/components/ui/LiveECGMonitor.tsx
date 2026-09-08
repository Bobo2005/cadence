"use client";

import React, { useEffect, useRef, useState } from "react";

export type ECGState = "active" | "erratic" | "flatline";

interface LiveECGMonitorProps {
  state?: ECGState;
  bpm?: number;
  className?: string;
}

/**
 * LiveECGMonitor
 *
 * Genuinely live real-time SVG oscilloscope animation for Cadence.
 * Uses requestAnimationFrame to generate a continuous, dynamic cardiac waveform
 * with a glowing scanning tracer and authentic P-Q-R-S-T voltage deflections.
 */
export default function LiveECGMonitor({
  state = "active",
  bpm = 62,
  className = "",
}: LiveECGMonitorProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const tracerRef = useRef<SVGCircleElement>(null);
  const [pulseBeating, setPulseBeating] = useState(false);

  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;

    // Viewbox width
    const width = 1000;
    const baseline = 50;

    // Period per beat based on BPM (e.g. 62 BPM => ~0.968 seconds per beat)
    const beatPeriod = (60 / bpm) * 1000;
    // Pixels traversed per millisecond (wave speed)
    const speed = 0.16; // px per ms

    // Heartbeat voltage calculation at normalized cycle position phase in [0, 1)
    const getHeartbeatVoltage = (phase: number, mode: ECGState): number => {
      if (mode === "flatline") {
        // Subtle residual electrical noise on flatline
        const noise = Math.sin(phase * Math.PI * 8) * 1.5;
        // Occasional tiny residual blip at phase ~ 0.5
        if (phase > 0.48 && phase < 0.52) {
          const blipPhase = (phase - 0.48) / 0.04;
          return Math.sin(blipPhase * Math.PI) * 3 + noise;
        }
        return noise;
      }

      if (mode === "erratic") {
        // High-amplitude chaotic arrhythmia with dense irregular spikes
        const chaoticPhase = (phase * 1.8) % 1;
        if (chaoticPhase > 0.1 && chaoticPhase < 0.16) return -12;
        if (chaoticPhase >= 0.16 && chaoticPhase < 0.22) return 38;
        if (chaoticPhase >= 0.22 && chaoticPhase < 0.28) return -34;
        if (chaoticPhase >= 0.28 && chaoticPhase < 0.35) return 18;
        if (chaoticPhase >= 0.5 && chaoticPhase < 0.58) return 25;
        if (chaoticPhase >= 0.7 && chaoticPhase < 0.76) return -28;
        if (chaoticPhase >= 0.76 && chaoticPhase < 0.84) return 36;
        return Math.sin(phase * Math.PI * 4) * 3;
      }

      // Active state: Clinically accurate P-Q-R-S-T wave complex
      // 1. P-Wave (atrial depolarization): rounded gentle peak
      if (phase >= 0.12 && phase < 0.22) {
        const p = (phase - 0.12) / 0.1;
        return Math.sin(p * Math.PI) * 6;
      }
      // 2. Q-Wave: quick small downward deflection
      if (phase >= 0.26 && phase < 0.30) {
        const q = (phase - 0.26) / 0.04;
        return -Math.sin(q * Math.PI) * 7;
      }
      // 3. R-Wave: massive, sharp ventricular spike
      if (phase >= 0.30 && phase < 0.37) {
        const r = (phase - 0.30) / 0.07;
        return Math.sin(r * Math.PI) * 44;
      }
      // 4. S-Wave: sharp downward plunge below baseline
      if (phase >= 0.37 && phase < 0.43) {
        const s = (phase - 0.37) / 0.06;
        return -Math.sin(s * Math.PI) * 18;
      }
      // 5. T-Wave (ventricular repolarization): medium rounded peak
      if (phase >= 0.52 && phase < 0.68) {
        const t = (phase - 0.52) / 0.16;
        return Math.sin(t * Math.PI) * 11;
      }

      return 0; // Isoelectric baseline
    };

    const renderFrame = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Pulse trigger indication near peak of R-wave
      const currentCyclePhase = (elapsed % beatPeriod) / beatPeriod;
      setPulseBeating(currentCyclePhase > 0.32 && currentCyclePhase < 0.40);

      // Generate continuous polyline points across the viewport
      const step = 4; // resolution step in pixels
      const points: string[] = [];

      for (let x = 0; x <= width; x += step) {
        // Map x-coordinate in viewport to virtual traveling time
        const virtualTime = elapsed + (x / speed);
        const cycleProgress = (virtualTime % beatPeriod) / beatPeriod;
        const voltage = getHeartbeatVoltage(cycleProgress, state);
        const y = baseline - voltage;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }

      const pathData = `M ${points.join(" L ")}`;

      if (pathRef.current) {
        pathRef.current.setAttribute("d", pathData);
      }
      if (glowPathRef.current) {
        glowPathRef.current.setAttribute("d", pathData);
      }

      // Position the glowing leading tracer head at the right side of the monitor
      if (tracerRef.current) {
        const lastPoint = points[points.length - 1].split(",");
        tracerRef.current.setAttribute("cx", lastPoint[0]);
        tracerRef.current.setAttribute("cy", lastPoint[1]);
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, bpm]);

  // Color selection according to DESIGN-SYSTEM.md table
  const strokeColor =
    state === "active"
      ? "#2EE6A8"
      : state === "erratic"
      ? "#F5B841"
      : "#F5484A";

  const glowShadow =
    state === "active"
      ? "drop-shadow(0 0 14px rgba(46,230,168,0.7))"
      : state === "erratic"
      ? "drop-shadow(0 0 14px rgba(245,184,65,0.7))"
      : "drop-shadow(0 0 14px rgba(245,72,74,0.7))";

  return (
    <div className={`relative w-full h-28 my-2 flex items-center justify-center select-none ${className}`}>
      {/* Background Subtle Oscilloscope Grid Lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        viewBox="0 0 1000 100"
        fill="none"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="20" x2="1000" y2="20" stroke="#232838" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="50" x2="1000" y2="50" stroke="#232838" strokeWidth="1" />
        <line x1="0" y1="80" x2="1000" y2="80" stroke="#232838" strokeWidth="1" strokeDasharray="4 4" />
        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((gx) => (
          <line key={gx} x1={gx} y1="0" x2={gx} y2="100" stroke="#232838" strokeWidth="0.8" strokeDasharray="4 4" />
        ))}
      </svg>

      {/* Dynamic Animated Vector ECG Waveform */}
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 100"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="tracer-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Bloom Wave */}
        <path
          ref={glowPathRef}
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-30 blur-[3px]"
        />

        {/* Sharp High-Definition Signal Trace */}
        <path
          ref={pathRef}
          stroke={strokeColor}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: glowShadow }}
        />

        {/* Real-time Leading Sweep Tracer Head */}
        <circle
          ref={tracerRef}
          r="4.5"
          fill="#FFFFFF"
          stroke={strokeColor}
          strokeWidth="2"
          filter="url(#tracer-glow)"
          className={`transition-transform duration-75 ${
            pulseBeating ? "scale-125" : "scale-100"
          }`}
        />
      </svg>
    </div>
  );
}
