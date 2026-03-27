"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SceneDefinition, SceneParams, SceneState } from "@/lib/scenes/types";
import SleepTimer from "./SleepTimer";
import SceneControls from "./SceneControls";

interface GenerativePlayerProps {
  scene: SceneDefinition;
  onClose: () => void;
}

export default function GenerativePlayer({ scene, onClose }: GenerativePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SceneState>({});
  const paramsRef = useRef<SceneParams>({ ...scene.defaultParams });
  const isStoppedRef = useRef(false);
  const [params, setParams] = useState<SceneParams>({ ...scene.defaultParams });
  const [isStopped, setIsStopped] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep paramsRef in sync for the animation loop
  useEffect(() => { paramsRef.current = params; }, [params]);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowUI(false), 4000);
  }, []);

  const handleInteraction = useCallback(() => {
    setShowUI(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [scheduleHide]);

  // Canvas setup + animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      stateRef.current = scene.init(w, h);
    };

    setup();
    window.addEventListener("resize", setup);

    let animId: number;
    let lastTime = 0;

    const loop = (ts: number) => {
      if (!isStoppedRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dt = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0.016;
          lastTime = ts;
          stateRef.current = scene.render(
            ctx, stateRef.current, paramsRef.current, dt,
            canvas.offsetWidth, canvas.offsetHeight,
          );
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", setup);
    };
  }, [scene]);

  const handleTimerEnd = useCallback(() => {
    isStoppedRef.current = true;
    setIsStopped(true);
  }, []);

  const handleResume = useCallback(() => {
    isStoppedRef.current = false;
    setIsStopped(false);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Header */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent z-10 transition-opacity duration-700 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{scene.icon}</span>
          <h2 className="text-white font-light tracking-widest text-lg">{scene.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          <SleepTimer onTimerEnd={handleTimerEnd} />
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-gray-300 hover:text-white p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Sleep ended overlay */}
      {isStopped && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/92 z-20">
          <div className="text-6xl mb-5">🌙</div>
          <h3 className="text-white text-2xl font-thin tracking-widest mb-2">おやすみなさい</h3>
          <p className="text-gray-500 text-sm mb-10">スリープタイマーが終了しました</p>
          <button
            onClick={handleResume}
            className="px-7 py-3 rounded-full border border-white/20 text-white/80 hover:border-white/50 hover:text-white transition-all text-sm tracking-wide"
          >
            再生を再開する
          </button>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 transition-opacity duration-700 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <SceneControls params={params} onChange={setParams} />
      </div>
    </div>
  );
}
