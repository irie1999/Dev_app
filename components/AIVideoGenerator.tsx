"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Models ───────────────────────────────────────────────────────────
const MODELS = [
  {
    id: "damo-vilab/text-to-video-ms-1.7b",
    label: "高速（256px・低品質）",
    desc: "〜30秒",
  },
  {
    id: "THUDM/CogVideoX-2b",
    label: "高品質（720p・6秒）",
    desc: "〜2分",
  },
] as const;

// ── Suggested prompts (Japanese, auto-translated on generate) ────────
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
  prompt: string;        // original (Japanese OK)
  promptEn: string;      // translated English sent to HF
  createdAt: number;
}

// ── Japanese detection & translation ────────────────────────────────
function hasJapanese(text: string): boolean {
  return /[\u3000-\u9fff\uff00-\uffef]/.test(text);
}

async function translateToEnglish(text: string): Promise<string> {
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("翻訳サービスに接続できませんでした");
  const data = await res.json() as { responseData: { translatedText: string }; responseStatus: number };
  if (data.responseStatus !== 200) throw new Error("翻訳に失敗しました");
  return data.responseData.translatedText;
}

// ── HF Inference ─────────────────────────────────────────────────────
async function callHF(
  model: string,
  prompt: string,
  token: string,
  onStatus: (s: string) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  for (let attempt = 0; attempt < 20; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    onStatus(attempt === 0 ? "リクエスト送信中..." : `生成中... (${attempt + 1}回目)`);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
      signal,
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({})) as { estimated_time?: number };
      const waitSec = Math.min(data.estimated_time ?? 20, 60);
      onStatus(`モデル起動中... 約 ${Math.round(waitSec)} 秒お待ちください`);
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, waitSec * 1000);
        signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
      });
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try { msg = (JSON.parse(text) as { error: string }).error ?? text; } catch { /* ignore */ }
      throw new Error(msg);
    }

    return await res.blob();
  }

  throw new Error("タイムアウトしました。しばらく後に再試行してください。");
}

// ── Main Component ───────────────────────────────────────────────────
export default function AIVideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState<string>(MODELS[0].id);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [translatedPrompt, setTranslatedPrompt] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Persist token in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("hf_token") ?? "";
    setToken(saved);
  }, []);
  const handleTokenChange = (v: string) => {
    setToken(v);
    localStorage.setItem("hf_token", v);
  };

  // Auto-play when active video changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => { /* autoplay may be blocked */ });
  }, [activeId]);

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      videos.forEach((v) => URL.revokeObjectURL(v.url));
    };
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
      // Translate Japanese → English if needed
      let promptEn = p;
      if (hasJapanese(p)) {
        setStatus("日本語を翻訳中...");
        promptEn = await translateToEnglish(p);
        setTranslatedPrompt(promptEn);
      }

      const blob = await callHF(modelId, promptEn, token, setStatus, ctrl.signal);
      const url = URL.createObjectURL(blob);
      const item: VideoItem = { id: crypto.randomUUID(), url, prompt: p, promptEn, createdAt: Date.now() };
      setVideos((prev) => [item, ...prev]);
      setActiveId(item.id);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message ?? "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  }, [prompt, modelId, token]);

  const activeVideo = videos.find((v) => v.id === activeId);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-thin tracking-widest text-white/90">AI 映像生成</h1>
        <p className="text-xs text-gray-600 mt-1 tracking-wide">テキストから映像を無料生成</p>
      </div>

      {/* ── Video Player ─────────────────────────────────────────── */}
      <div className="mx-4 rounded-2xl overflow-hidden bg-black/40 border border-white/8" style={{ aspectRatio: "16/9" }}>
        {activeVideo ? (
          <video
            ref={videoRef}
            src={activeVideo.url}
            loop
            muted
            playsInline
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-700">
            {isLoading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                <p className="text-xs tracking-wide text-gray-500">{status || "生成中..."}</p>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <p className="text-xs opacity-40">生成した映像がここに表示されます</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Loading status bar */}
      {isLoading && activeVideo === undefined && (
        <div className="mx-4 mt-2 text-center">
          <p className="text-xs text-gray-500 tracking-wide">{status}</p>
        </div>
      )}

      {/* ── Prompt Input ─────────────────────────────────────────── */}
      <div className="px-4 mt-5">
        <p className="text-[10px] text-gray-600 mb-2 tracking-wide">日本語・英語どちらでも入力できます</p>
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
            className={`px-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1 min-w-[64px] ${
              isLoading
                ? "bg-red-900/40 border border-red-500/30 text-red-400 hover:bg-red-900/60"
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

        {/* Translation preview */}
        {translatedPrompt && (
          <div className="mt-2 flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
            <span className="text-[9px] text-gray-600 mt-0.5 shrink-0">翻訳</span>
            <p className="text-[10px] text-gray-400 leading-relaxed">{translatedPrompt}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-2 text-xs text-red-400/80 bg-red-900/20 rounded-lg px-3 py-2 leading-relaxed">
            {error}
          </p>
        )}
      </div>

      {/* ── Suggested Prompts ─────────────────────────────────────── */}
      <div className="px-4 mt-3">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => setPrompt(s.prompt)}
              className="px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-gray-400 text-xs hover:text-white hover:bg-white/12 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Model Selector ───────────────────────────────────────── */}
      <div className="px-4 mt-4">
        <p className="text-[10px] text-gray-600 mb-2 tracking-wide">モデル選択</p>
        <div className="flex gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModelId(m.id)}
              className={`flex-1 py-2 rounded-xl border text-xs transition-all text-left px-3 ${
                modelId === m.id
                  ? "bg-white/12 border-white/25 text-white"
                  : "bg-white/4 border-white/8 text-gray-600 hover:text-gray-400"
              }`}
            >
              <div className="font-medium">{m.label}</div>
              <div className="opacity-60 text-[10px] mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── HF Token (optional) ──────────────────────────────────── */}
      <div className="px-4 mt-3">
        <button
          onClick={() => setShowToken((v) => !v)}
          className="text-[10px] text-gray-700 hover:text-gray-500 transition-colors flex items-center gap-1"
        >
          <svg className={`w-3 h-3 transition-transform ${showToken ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Hugging Face トークン（省略可・速度向上）
        </button>
        {showToken && (
          <div className="mt-2">
            <input
              type="password"
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 placeholder:text-gray-800 focus:outline-none focus:border-white/20"
            />
            <p className="text-[9px] text-gray-800 mt-1">
              huggingface.co → Settings → Access Tokens で取得（無料）
            </p>
          </div>
        )}
      </div>

      {/* ── History ──────────────────────────────────────────────── */}
      {videos.length > 1 && (
        <div className="px-4 mt-5">
          <p className="text-[10px] text-gray-600 mb-3 tracking-wide">生成履歴（このセッションのみ）</p>
          <div className="grid grid-cols-3 gap-2">
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveId(v.id)}
                className={`relative rounded-xl overflow-hidden aspect-video transition-all ${
                  activeId === v.id ? "ring-2 ring-white/60" : "ring-1 ring-white/10 opacity-60 hover:opacity-90"
                }`}
              >
                <video src={v.url} muted playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-end p-1">
                  <span className="text-[8px] text-white/70 leading-tight line-clamp-2">{v.prompt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Note ─────────────────────────────────────────────────── */}
      <div className="px-4 mt-5 mb-2">
        <p className="text-[10px] text-gray-800 leading-relaxed">
          ※ 日本語入力は MyMemory で自動翻訳後に生成します。Hugging Face 無料推論を使用。
          サービス状況により時間がかかる場合があります。生成映像は 2〜6 秒程度です。
        </p>
      </div>

      <div className="h-4" />
    </div>
  );
}
