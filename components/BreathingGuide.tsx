"use client";

import { useEffect, useState, useRef } from "react";

// Box breathing: 4s inhale → 4s hold → 4s exhale → 4s hold
const PHASES = [
  { label: "吸う",   duration: 4, scale: 1   },
  { label: "止める", duration: 4, scale: 1   },
  { label: "吐く",   duration: 4, scale: 0.4 },
  { label: "止める", duration: 4, scale: 0.4 },
] as const;

const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0); // 16s

interface BreathingGuideProps {
  onClose: () => void;
}

export default function BreathingGuide({ onClose }: BreathingGuideProps) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = ((now - startRef.current) / 1000) % TOTAL;
      setElapsed(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Determine current phase and progress within it
  let acc = 0;
  let phaseIdx = 0;
  let phaseProgress = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (elapsed < acc + PHASES[i].duration) {
      phaseIdx = i;
      phaseProgress = (elapsed - acc) / PHASES[i].duration;
      break;
    }
    acc += PHASES[i].duration;
  }

  const phase = PHASES[phaseIdx];
  const prevScale = phaseIdx === 0 ? PHASES[PHASES.length - 1].scale : PHASES[phaseIdx - 1].scale;
  // Smooth interpolation between prev and current target scale
  const scale = prevScale + (phase.scale - prevScale) * easeInOut(phaseProgress);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
      {/* Close button (needs pointer events) */}
      <button
        className="absolute top-16 right-4 pointer-events-auto text-white/40 hover:text-white/80 transition-colors p-2"
        onClick={onClose}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow rings */}
        {[1.6, 1.35, 1.15].map((r, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/10"
            style={{
              width: `${120 * scale * r}px`,
              height: `${120 * scale * r}px`,
              transition: "width 0.1s linear, height 0.1s linear",
              opacity: 0.3 - i * 0.08,
            }}
          />
        ))}
        {/* Main circle */}
        <div
          className="rounded-full bg-white/15 border border-white/30 flex items-center justify-center backdrop-blur-sm"
          style={{
            width: `${120 * scale}px`,
            height: `${120 * scale}px`,
            transition: "width 0.1s linear, height 0.1s linear",
            boxShadow: `0 0 ${40 * scale}px rgba(180,200,255,${0.15 * scale})`,
          }}
        >
          <span className="text-white/70 text-sm tracking-widest select-none">
            {phase.label}
          </span>
        </div>
      </div>

      {/* Phase timer dots */}
      <div className="mt-8 flex gap-2">
        {PHASES.map((p, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === phaseIdx ? "24px" : "6px",
              background: i === phaseIdx ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
