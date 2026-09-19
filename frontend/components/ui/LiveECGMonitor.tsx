"use client";

import React, { useEffect, useRef, useState, useId } from "react";

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
  // Unique ID per instance to avoid SVG filter ID collisions when multiple monitors render
  const uid = useId().replace(/:/g, "-");
  const filterId = `tracer-glow${uid}`;

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
        // Authentic, slightly irregular sinus arrhythmia with gentle ectopic variation
        // Uses a 2-beat macro rhythm to create an organic, non-chaotic irregular interval
        const macroPhase = (phase * 0.5) % 1; // 2-beat repeating macro cycle
        // Gentle baseline wander reflecting slight autonomic irregularity
        const wander = Math.sin(macroPhase * Math.PI * 4) * 1.2;

        // Beat 1: Slightly premature cardiac cycle (fires around macroPhase 0.15 - 0.45)
        if (macroPhase >= 0.10 && macroPhase < 0.17) {
          const p = (macroPhase - 0.10) / 0.07;
          return Math.sin(p * Math.PI) * 5 + wander;
        }
        if (macroPhase >= 0.19 && macroPhase < 0.22) {
          const q = (macroPhase - 0.19) / 0.03;
          return -Math.sin(q * Math.PI) * 6 + wander;
        }
        if (macroPhase >= 0.22 && macroPhase < 0.27) {
          const r = (macroPhase - 0.22) / 0.05;
          return Math.sin(r * Math.PI) * 38 + wander;
        }
        if (macroPhase >= 0.27 && macroPhase < 0.31) {
          const s = (macroPhase - 0.27) / 0.04;
          return -Math.sin(s * Math.PI) * 14 + wander;
        }
        if (macroPhase >= 0.35 && macroPhase < 0.45) {
          const t = (macroPhase - 0.35) / 0.10;
          return Math.sin(t * Math.PI) * 9 + wander;
        }

        // Beat 2: Delayed compensatory cardiac cycle with slightly taller deflection
        // (fires around macroPhase 0.65 - 0.95, giving a noticeable but calm irregular pause)
        if (macroPhase >= 0.62 && macroPhase < 0.68) {
          const p = (macroPhase - 0.62) / 0.06;
          return Math.sin(p * Math.PI) * 6 + wander;
        }
        if (macroPhase >= 0.70 && macroPhase < 0.73) {
          const q = (macroPhase - 0.70) / 0.03;
          return -Math.sin(q * Math.PI) * 8 + wander;
        }
        if (macroPhase >= 0.73 && macroPhase < 0.79) {
          const r = (macroPhase - 0.73) / 0.06;
          return Math.sin(r * Math.PI) * 44 + wander;
        }
        if (macroPhase >= 0.79 && macroPhase < 0.84) {
          const s = (macroPhase - 0.79) / 0.05;
          return -Math.sin(s * Math.PI) * 18 + wander;
        }
        if (macroPhase >= 0.88 && macroPhase < 0.98) {
          const t = (macroPhase - 0.88) / 0.10;
          return Math.sin(t * Math.PI) * 12 + wander;
        }

        return wander; // Calm isoelectric pause between irregular beats
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

      // Pulse trigger indication near peak of R-wave (only in steady active state; no flashing in erratic)
      const currentCyclePhase = (elapsed % beatPeriod) / beatPeriod;
      setPulseBeating(state === "active" && currentCyclePhase > 0.32 && currentCyclePhase < 0.40);

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

  // Calm teal color selection for light editorial aesthetic
  const strokeColor =
    state === "active"
      ? "#0D9488"
      : state === "erratic"
      ? "#D97706"
      : "#E11D48";

  const glowShadow =
    state === "active"
      ? "drop-shadow(0 0 8px rgba(13,148,136,0.35))"
      : state === "erratic"
      ? "drop-shadow(0 0 8px rgba(217,119,6,0.35))"
      : "drop-shadow(0 0 8px rgba(225,29,72,0.35))";

  return (
    <div className={`relative w-full h-28 my-2 flex items-center justify-center select-none ${className}`}>
      {/* Background Subtle Oscilloscope Grid Lines - Light Theme */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        viewBox="0 0 1000 100"
        fill="none"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="20" x2="1000" y2="20" stroke="#E8EAED" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="50" x2="1000" y2="50" stroke="#E8EAED" strokeWidth="1" />
        <line x1="0" y1="80" x2="1000" y2="80" stroke="#E8EAED" strokeWidth="1" strokeDasharray="4 4" />
        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((gx) => (
          <line key={gx} x1={gx} y1="0" x2={gx} y2="100" stroke="#E8EAED" strokeWidth="0.8" strokeDasharray="4 4" />
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
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
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
          filter={`url(#${filterId})`}
          className={`transition-transform duration-75 ${
            pulseBeating ? "scale-125" : "scale-100"
          }`}
        />
      </svg>
    </div>
  );
}
