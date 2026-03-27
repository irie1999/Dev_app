"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SceneDefinition, SceneParams, SceneState } from "@/lib/scenes/types";
import { scenes } from "@/lib/scenes";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useFavorites } from "@/hooks/useFavorites";
import SleepTimer from "./SleepTimer";
import SceneControls from "./SceneControls";
import BreathingGuide from "./BreathingGuide";

// ─── Mood presets ────────────────────────────────────────────────────
const MOODS: { label: string; emoji: string; params: SceneParams }[] = [
  { label: "眠り",   emoji: "🌙", params: { speed: 0.15, intensity: 0.25, density: 0.2,  hue: 0.5, brightness: 0.05 } },
  { label: "くつろぎ", emoji: "😌", params: { speed: 0.35, intensity: 0.5,  density: 0.4,  hue: 0.5, brightness: 0.2  } },
  { label: "瞑想",   emoji: "🧘", params: { speed: 0.2,  intensity: 0.6,  density: 0.25, hue: 0.45, brightness: 0.1  } },
  { label: "幻想的", emoji: "✨", params: { speed: 0.6,  intensity: 0.8,  density: 0.6,  hue: 0.7, brightness: 0.3  } },
];

interface GenerativePlayerProps {
  scene: SceneDefinition;
  initialParams?: SceneParams;
  onClose: () => void;
}

export default function GenerativePlayer({ scene, initialParams, onClose }: GenerativePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SceneState>({});
  const paramsRef = useRef<SceneParams>(initialParams ?? { ...scene.defaultParams });
  const isStoppedRef = useRef(false);
  const fadeRef = useRef(0); // 0-1 fade opacity

  const [activeScene, setActiveScene] = useState<SceneDefinition>(scene);
  const [params, setParams] = useState<SceneParams>(initialParams ?? { ...scene.defaultParams });
  const [isStopped, setIsStopped] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [showBreathing, setShowBreathing] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { save: savePreset } = useFavorites();

  // Wake Lock: keep screen on while player is open
  useWakeLock(true);

  // Sync paramsRef
  useEffect(() => { paramsRef.current = params; }, [params]);

  // Sync activeScene ref for animation loop
  const activeSceneRef = useRef(activeScene);
  useEffect(() => { activeSceneRef.current = activeScene; }, [activeScene]);

  // ── UI auto-hide ──────────────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowUI(false), 4500);
  }, []);

  const handleInteraction = useCallback(() => {
    setShowUI(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [scheduleHide]);

  // ── Canvas animation loop ─────────────────────────────────────────
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
      stateRef.current = activeSceneRef.current.init(w, h);
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
          stateRef.current = activeSceneRef.current.render(
            ctx, stateRef.current, paramsRef.current, dt,
            canvas.offsetWidth, canvas.offsetHeight,
          );

          // Fade overlay
          const fo = fadeRef.current;
          if (fo > 0) {
            ctx.fillStyle = `rgba(0,0,0,${fo})`;
            ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
          }
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", setup);
    };
  }, []); // run once; scene changes handled via ref

  // Reinitialize canvas when scene switches
  const switchScene = useCallback((next: SceneDefinition) => {
    setActiveScene(next);
    setParams({ ...next.defaultParams });
    paramsRef.current = { ...next.defaultParams };
    activeSceneRef.current = next;
    const canvas = canvasRef.current;
    if (!canvas) return;
    stateRef.current = next.init(canvas.offsetWidth, canvas.offsetHeight);
  }, []);

  // ── Sleep timer with 5-second fade-out ───────────────────────────
  const handleTimerEnd = useCallback(() => {
    const FADE_DURATION = 5000;
    const start = performance.now();
    const fade = (now: number) => {
      const t = Math.min((now - start) / FADE_DURATION, 1);
      fadeRef.current = t;
      setFadeOpacity(t);
      if (t < 1) requestAnimationFrame(fade);
      else {
        isStoppedRef.current = true;
        setIsStopped(true);
      }
    };
    requestAnimationFrame(fade);
  }, []);

  const handleResume = useCallback(() => {
    fadeRef.current = 0;
    setFadeOpacity(0);
    isStoppedRef.current = false;
    setIsStopped(false);
  }, []);

  // ── Save preset ───────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const name = saveName.trim() || `${activeScene.name} のひととき`;
    savePreset({ name, sceneId: activeScene.id, params: { ...paramsRef.current } });
    setSaveModalOpen(false);
    setSaveName("");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [saveName, activeScene, savePreset]);

  const uiVisible = showUI || saveModalOpen;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent z-20 transition-opacity duration-700 ${uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex items-center gap-3">
          <span className="text-xl select-none">{activeScene.icon}</span>
          <h2 className="text-white font-light tracking-widest">{activeScene.name}</h2>
        </div>
        <div className="flex items-center gap-1">
          <SleepTimer onTimerEnd={handleTimerEnd} />

          {/* Breathing guide toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowBreathing((v) => !v); }}
            className={`p-2 transition-colors ${showBreathing ? "text-blue-300" : "text-gray-400 hover:text-white"}`}
            title="呼吸ガイド"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeWidth={1.5} d="M12 8v4l2 2" />
            </svg>
          </button>

          {/* Save preset */}
          <button
            onClick={(e) => { e.stopPropagation(); setSaveModalOpen(true); setSaveName(""); }}
            className="p-2 text-gray-400 hover:text-yellow-300 transition-colors"
            title="お気に入りに保存"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>

          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Canvas ─────────────────────────────────────────────────── */}
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Breathing guide overlay */}
      {showBreathing && <BreathingGuide onClose={() => setShowBreathing(false)} />}

      {/* Saved flash notification */}
      {savedFlash && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-xs px-4 py-2 rounded-full z-30 fade-in tracking-wide">
          ⭐ お気に入りに保存しました
        </div>
      )}

      {/* ── Sleep ended overlay ─────────────────────────────────────── */}
      {isStopped && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30">
          <div className="text-5xl mb-5 select-none">🌙</div>
          <h3 className="text-white text-2xl font-thin tracking-widest mb-2">おやすみなさい</h3>
          <p className="text-gray-600 text-xs mb-10 tracking-wide">スリープタイマーが終了しました</p>
          <button onClick={handleResume} className="px-7 py-3 rounded-full border border-white/20 text-white/70 hover:border-white/50 hover:text-white transition-all text-sm tracking-wide">
            再生を再開する
          </button>
        </div>
      )}

      {/* ── Save preset modal ───────────────────────────────────────── */}
      {saveModalOpen && (
        <div
          className="absolute inset-0 z-40 flex items-end justify-center pb-8 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSaveModalOpen(false); }}
        >
          <div className="w-full max-w-sm mx-4 bg-[#1a1a2e] border border-white/15 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-light tracking-wider mb-4 text-center">お気に入りに保存</h3>
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={`${activeScene.name} のひととき`}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/40 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setSaveModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 text-sm hover:text-white transition-colors">
                キャンセル
              </button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-white/15 text-white text-sm hover:bg-white/25 transition-colors">
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom controls ─────────────────────────────────────────── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-700 ${uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scene switcher */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
          {scenes.map((s) => (
            <button
              key={s.id}
              onClick={() => switchScene(s)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                activeScene.id === s.id
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
              }`}
            >
              <span className="text-base select-none">{s.icon}</span>
              <span className="text-[9px] tracking-wide">{s.name}</span>
            </button>
          ))}
        </div>

        {/* Mood presets */}
        <div className="flex gap-2 px-4 pb-2">
          {MOODS.map((mood) => (
            <button
              key={mood.label}
              onClick={() => { setParams({ ...mood.params }); paramsRef.current = { ...mood.params }; }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/6 border border-white/8 text-gray-400 hover:text-white hover:bg-white/12 transition-all"
            >
              <span className="text-xs select-none">{mood.emoji}</span>
              <span className="text-[10px] tracking-wide">{mood.label}</span>
            </button>
          ))}
        </div>

        {/* Parameter sliders */}
        <div className="bg-gradient-to-t from-black/85 to-transparent pt-3">
          <SceneControls params={params} onChange={setParams} />
        </div>
      </div>
    </div>
  );
}
