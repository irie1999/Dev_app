"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Models (HF public Spaces via Gradio) ─────────────────────────────
const MODELS = [
  { id: "ltx-video", label: "LTX-Video", sub: "高速・約30秒" },
  { id: "wan21",     label: "Wan 2.1",   sub: "高品質・約2分" },
] as const;

// ── Suggested prompts ────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: "雨夜",       prompt: "静かな夜、窓に打ち付ける雨、幻想的な光" },
  { label: "焚き火",     prompt: "暗闇の中でゆらめく焚き火、暖かいオレンジの炎" },
  { label: "雪景色",     prompt: "静かな森に静かに降り積もる雪、冬の夜" },
  { label: "星空",       prompt: "天の川が広がる満天の星空、深宇宙の静寂" },
  { label: "穏やかな海", prompt: "夕暮れの穏やかな海、波が静かに打ち寄せる" },
  { label: "蛍",         prompt: "夏の暗い森で幻想的に光る蛍たち" },
  { label: "桜吹雪",     prompt: "ゆっくりと舞い落ちる桜の花びら、春の優しい風" },
  { label: "竹林",       prompt: "風にそよぐ竹林、光と影の静かな世界" },
];

// ── Types ────────────────────────────────────────────────────────────
interface VideoItem {
  id: string;
  url: string;
  prompt: string;
  promptEn: string;
  createdAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────────
function hasJapanese(text: string) {
  return /[\u3000-\u9fff\uff00-\uffef]/.test(text);
}

async function translateToEnglish(text: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`,
  );
  if (!res.ok) throw new Error("翻訳サービスに接続できませんでした");
  const data = await res.json() as { responseData: { translatedText: string }; responseStatus: number };
  if (data.responseStatus !== 200) throw new Error("翻訳に失敗しました");
  return data.responseData.translatedText;
}

async function callGenerate(
  model: string,
  prompt: string,
  onStatus: (s: string) => void,
  signal: AbortSignal,
): Promise<Blob> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onStatus(attempt === 0 ? "リクエスト送信中..." : `生成中... (${attempt + 1})`);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model }),
      signal,
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({})) as { estimated_time?: number };
      const waitSec = Math.min(data.estimated_time ?? 20, 60);
      onStatus(`スペース起動中... 約 ${Math.round(waitSec)} 秒お待ちください`);
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, waitSec * 1000);
        signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
      });
      continue;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "不明なエラー" })) as { error?: string };
      throw new Error(data.error ?? "生成に失敗しました");
    }

    return await res.blob();
  }
  throw new Error("タイムアウトしました。しばらく後に再試行してください。");
}

// ── Main Component ───────────────────────────────────────────────────
export default function AIVideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState<string>(MODELS[0].id);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [translatedPrompt, setTranslatedPrompt] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => { /* autoplay blocked */ });
  }, [activeId]);

  useEffect(() => {
    return () => { videos.forEach((v) => URL.revokeObjectURL(v.url)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(async () => {
    const p = prompt.trim();
    if (!p) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError("");
    setStatus("");
    setTranslatedPrompt("");

    try {
      let promptEn = p;
      if (hasJapanese(p)) {
        setStatus("日本語を翻訳中...");
        promptEn = await translateToEnglish(p);
        setTranslatedPrompt(promptEn);
      }

      const blob = await callGenerate(modelId, promptEn, setStatus, ctrl.signal);
      const url = URL.createObjectURL(blob);
      const item: VideoItem = {
        id: crypto.randomUUID(), url, prompt: p, promptEn, createdAt: Date.now(),
      };
      setVideos((prev) => [item, ...prev]);
      setActiveId(item.id);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message ?? "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  }, [prompt, modelId]);

  const activeVideo = videos.find((v) => v.id === activeId);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* Header */}
      <div className="px-5 pt-12 pb-3">
        <h1 className="text-xl font-thin tracking-widest text-white/90">AI 映像生成</h1>
        <p className="text-xs text-gray-600 mt-0.5 tracking-wide">
          日本語・英語どちらでも入力できます　登録不要・完全無料
        </p>
      </div>

      {/* Video Player */}
      <div className="mx-4 rounded-2xl overflow-hidden bg-black/40 border border-white/8" style={{ aspectRatio: "16/9" }}>
        {activeVideo ? (
          <video
            ref={videoRef}
            src={activeVideo.url}
            loop muted playsInline autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            {isLoading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                <p className="text-xs text-gray-500 text-center px-6">{status || "生成中..."}</p>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <p className="text-xs text-gray-800">生成した映像がここに表示されます</p>
              </>
            )}
          </div>
        )}
      </div>

      {isLoading && status && (
        <p className="mx-4 mt-1.5 text-[10px] text-gray-600 text-center">{status}</p>
      )}

      {/* Prompt Input */}
      <div className="px-4 mt-4">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setTranslatedPrompt(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
            placeholder="静かな夜の雨、窓越しの雨音..."
            rows={2}
            className="flex-1 bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-white/30 resize-none"
          />
          <button
            onClick={isLoading ? () => abortRef.current?.abort() : generate}
            disabled={!isLoading && !prompt.trim()}
            className={`px-4 rounded-xl transition-all flex flex-col items-center justify-center gap-1 min-w-[60px] ${
              isLoading
                ? "bg-red-900/40 border border-red-500/30 text-red-400"
                : "bg-white/10 border border-white/15 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border border-red-400/60 border-t-red-400 animate-spin" />
                <span className="text-[9px]">中止</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                <span className="text-[9px]">生成</span>
              </>
            )}
          </button>
        </div>

        {translatedPrompt && (
          <div className="mt-2 flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
            <span className="text-[9px] text-gray-600 mt-0.5 shrink-0">EN</span>
            <p className="text-[10px] text-gray-400 leading-relaxed">{translatedPrompt}</p>
          </div>
        )}

        {error && (
          <div className="mt-2 bg-red-900/20 border border-red-500/20 rounded-xl px-3 py-2.5">
            <p className="text-xs text-red-400/90 leading-relaxed whitespace-pre-line">{error}</p>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 mt-3">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => { setPrompt(s.prompt); setTranslatedPrompt(""); setError(""); }}
              className="px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-gray-400 text-xs hover:text-white hover:bg-white/12 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selector */}
      <div className="px-4 mt-4">
        <div className="flex gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModelId(m.id)}
              className={`flex-1 py-2 rounded-xl border text-xs transition-all px-3 ${
                modelId === m.id
                  ? "bg-white/12 border-white/25 text-white"
                  : "bg-white/4 border-white/8 text-gray-600 hover:text-gray-400"
              }`}
            >
              <div className="font-medium">{m.label}</div>
              <div className="opacity-50 text-[10px] mt-0.5">{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      {videos.length > 1 && (
        <div className="px-4 mt-5">
          <p className="text-[10px] text-gray-700 mb-2 tracking-wide">生成履歴</p>
          <div className="grid grid-cols-3 gap-2">
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveId(v.id)}
                className={`relative rounded-xl overflow-hidden aspect-video transition-all ${
                  activeId === v.id ? "ring-2 ring-white/50" : "ring-1 ring-white/8 opacity-50 hover:opacity-80"
                }`}
              >
                <video src={v.url} muted playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                  <span className="text-[8px] text-white/60 leading-tight line-clamp-2">{v.prompt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
