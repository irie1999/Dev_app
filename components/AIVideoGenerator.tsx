"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Models ────────────────────────────────────────────────────────────
const MODELS = [
  { id: "kling-v1.6-standard", label: "v1.6 Standard", sub: "高速・10クレジット/本" },
  { id: "kling-v2.1-standard", label: "v2.1 Standard", sub: "高品質・35クレジット/本" },
] as const;

// ── Suggested prompts ─────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────
interface VideoItem {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
}

interface KlingKeys { accessKey: string; secretKey: string }

// ── Helpers ───────────────────────────────────────────────────────────
function hasJapanese(t: string) { return /[\u3000-\u9fff\uff00-\uffef]/.test(t); }

async function translateToEnglish(text: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`,
  );
  const data = await res.json() as { responseData: { translatedText: string }; responseStatus: number };
  if (data.responseStatus !== 200) throw new Error("翻訳に失敗しました");
  return data.responseData.translatedText;
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
  });
}

// ── Setup Screen ──────────────────────────────────────────────────────
function KeySetup({ onSave }: { onSave: (k: KlingKeys) => void }) {
  const [ak, setAk] = useState("");
  const [sk, setSk] = useState("");
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col px-5 pt-14">
      <div className="text-3xl mb-4">🎬</div>
      <h1 className="text-lg font-light tracking-widest mb-2">Kling AI API キー設定</h1>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">
        Kling AI の無料プランで 1 日 66 クレジット（約 6 本/日）が使えます。
      </p>

      <div className="space-y-3 mb-6">
        {[
          "klingai.com にアクセスして無料登録",
          "右上アイコン → API → 「API キー作成」",
          "Access Key と Secret Key をコピー",
        ].map((text, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-white/10 text-xs flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-gray-400">{text}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-5">
        <div>
          <p className="text-[10px] text-gray-600 mb-1">Access Key</p>
          <input
            value={ak}
            onChange={(e) => setAk(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <p className="text-[10px] text-gray-600 mb-1">Secret Key</p>
          <input
            type="password"
            value={sk}
            onChange={(e) => setSk(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      <button
        onClick={() => { if (ak && sk) onSave({ accessKey: ak, secretKey: sk }); }}
        disabled={!ak || !sk}
        className="w-full py-3 rounded-xl bg-white/12 border border-white/20 text-white text-sm tracking-wide hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        保存して使い始める
      </button>
      <p className="text-[9px] text-gray-800 mt-3 text-center">
        キーはこのデバイスの localStorage にのみ保存されます
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function AIVideoGenerator() {
  const [keys, setKeys] = useState<KlingKeys | null>(null);
  const [loaded, setLoaded] = useState(false);
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
    const ak = localStorage.getItem("kling_ak") ?? "";
    const sk = localStorage.getItem("kling_sk") ?? "";
    if (ak && sk) setKeys({ accessKey: ak, secretKey: sk });
    setLoaded(true);
  }, []);

  const saveKeys = useCallback((k: KlingKeys) => {
    localStorage.setItem("kling_ak", k.accessKey);
    localStorage.setItem("kling_sk", k.secretKey);
    setKeys(k);
    setError("");
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load(); v.play().catch(() => {});
  }, [activeId]);

  useEffect(() => () => { videos.forEach((v) => URL.revokeObjectURL(v.url)); }, []); // eslint-disable-line

  const generate = useCallback(async () => {
    const p = prompt.trim();
    if (!p || !keys) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError("");
    setStatus("");
    setTranslatedPrompt("");

    try {
      // Translate if Japanese
      let promptEn = p;
      if (hasJapanese(p)) {
        setStatus("日本語を翻訳中...");
        promptEn = await translateToEnglish(p);
        setTranslatedPrompt(promptEn);
      }

      // Submit task
      setStatus("タスクを送信中...");
      const createRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptEn, model: modelId, ...keys }),
        signal: ctrl.signal,
      });
      const createData = await createRes.json() as { task_id?: string; error?: string };
      if (!createData.task_id) throw new Error(createData.error ?? "タスク作成に失敗しました");

      const taskId = createData.task_id;

      // Poll for result (2-5 minutes)
      let elapsed = 0;
      while (elapsed < 360) {
        if (ctrl.signal.aborted) throw new DOMException("Aborted", "AbortError");
        await sleep(6000, ctrl.signal);
        elapsed += 6;

        setStatus(`生成中... ${elapsed}秒経過（最大6分）`);

        const pollRes = await fetch("/api/kling-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId, ...keys }),
          signal: ctrl.signal,
        });
        const pollData = await pollRes.json() as {
          status?: string;
          videoUrl?: string;
          error?: string;
        };

        if (pollData.error) throw new Error(pollData.error);

        if (pollData.status === "succeed" && pollData.videoUrl) {
          setStatus("動画をダウンロード中...");
          const videoRes = await fetch(pollData.videoUrl, { signal: ctrl.signal });
          const blob = await videoRes.blob();
          const url = URL.createObjectURL(blob);
          const item: VideoItem = { id: crypto.randomUUID(), url, prompt: p, createdAt: Date.now() };
          setVideos((prev) => [item, ...prev]);
          setActiveId(item.id);
          return;
        }
      }
      throw new Error("タイムアウト（6分）: Kling AI の混雑が考えられます。再試行してください。");

    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message ?? "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  }, [prompt, modelId, keys]);

  if (!loaded) return null;
  if (!keys) return <KeySetup onSave={saveKeys} />;

  const activeVideo = videos.find((v) => v.id === activeId);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-thin tracking-widest text-white/90">AI 映像生成</h1>
          <p className="text-xs text-gray-600 mt-0.5">Kling AI · 日本語・英語対応</p>
        </div>
        <button
          onClick={() => { localStorage.removeItem("kling_ak"); localStorage.removeItem("kling_sk"); setKeys(null); }}
          className="text-[10px] text-gray-700 hover:text-gray-500 pb-1 transition-colors"
        >
          キー変更
        </button>
      </div>

      {/* Video Player */}
      <div className="mx-4 rounded-2xl overflow-hidden bg-black/40 border border-white/8" style={{ aspectRatio: "16/9" }}>
        {activeVideo ? (
          <video ref={videoRef} src={activeVideo.url} loop muted playsInline autoPlay className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            {isLoading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                <p className="text-xs text-gray-500 text-center px-6">{status}</p>
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
      {isLoading && status && <p className="mx-4 mt-1.5 text-[10px] text-gray-600 text-center">{status}</p>}

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
              <><div className="w-4 h-4 rounded-full border border-red-400/60 border-t-red-400 animate-spin" /><span className="text-[9px]">中止</span></>
            ) : (
              <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg><span className="text-[9px]">生成</span></>
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

      {/* Suggestions */}
      <div className="px-4 mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => { setPrompt(s.prompt); setTranslatedPrompt(""); setError(""); }}
            className="px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-gray-400 text-xs hover:text-white hover:bg-white/12 transition-all">
            {s.label}
          </button>
        ))}
      </div>

      {/* Model Selector */}
      <div className="px-4 mt-4 flex gap-2">
        {MODELS.map((m) => (
          <button key={m.id} onClick={() => setModelId(m.id)}
            className={`flex-1 py-2 rounded-xl border text-xs transition-all px-3 ${modelId === m.id ? "bg-white/12 border-white/25 text-white" : "bg-white/4 border-white/8 text-gray-600 hover:text-gray-400"}`}>
            <div className="font-medium">{m.label}</div>
            <div className="opacity-50 text-[10px] mt-0.5">{m.sub}</div>
          </button>
        ))}
      </div>

      {/* Note */}
      <div className="px-4 mt-4">
        <p className="text-[10px] text-gray-800 leading-relaxed">
          ※ 無料プラン: 66 クレジット/日。v1.6 Standard は 10 クレジット/本 = 約 6 本/日。
          生成に 2〜5 分かかります。
        </p>
      </div>

      {/* History */}
      {videos.length > 1 && (
        <div className="px-4 mt-5">
          <p className="text-[10px] text-gray-700 mb-2">生成履歴</p>
          <div className="grid grid-cols-3 gap-2">
            {videos.map((v) => (
              <button key={v.id} onClick={() => setActiveId(v.id)}
                className={`relative rounded-xl overflow-hidden aspect-video transition-all ${activeId === v.id ? "ring-2 ring-white/50" : "ring-1 ring-white/8 opacity-50 hover:opacity-80"}`}>
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
