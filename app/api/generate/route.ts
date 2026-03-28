import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Public HF Spaces (Gradio) — free, no token needed
const SPACES: Record<string, string> = {
  "ltx-video": "https://lightricks-ltx-video-playground.hf.space",
  "cogvideo":  "https://thudm-cogvideox-5b-space.hf.space",
};

// ── Gradio Space caller ─────────────────────────────────────────────
async function callGradioSpace(spaceUrl: string, prompt: string): Promise<ArrayBuffer> {
  // 1. Discover API endpoints
  const infoRes = await fetch(`${spaceUrl}/info`, {
    headers: { "Accept": "application/json" },
  });

  let fnName = "/predict";
  if (infoRes.ok) {
    const info = await infoRes.json() as { named_endpoints?: Record<string, unknown> };
    const names = Object.keys(info.named_endpoints ?? {});
    if (names.length > 0) fnName = names[0];
  }

  // 2. Submit job
  const submitRes = await fetch(`${spaceUrl}/gradio_api/call${fnName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [prompt] }),
  });

  if (!submitRes.ok) {
    const txt = await submitRes.text().catch(() => String(submitRes.status));
    throw new Error(`スペースへの接続失敗 (${submitRes.status}): ${txt.slice(0, 200)}`);
  }

  const { event_id } = await submitRes.json() as { event_id: string };
  if (!event_id) throw new Error("event_id が取得できませんでした");

  // 3. Stream SSE result
  const sseRes = await fetch(`${spaceUrl}/gradio_api/call${fnName}/${event_id}`);
  if (!sseRes.ok || !sseRes.body) throw new Error("結果ストリームに接続できませんでした");

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let videoUrl: string | null = null;
  const deadline = Date.now() + 55_000;

  outer: while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";

    for (const chunk of chunks) {
      let evtType = "";
      let dataStr = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event: ")) evtType = line.slice(7).trim();
        if (line.startsWith("data: "))  dataStr = line.slice(6).trim();
      }

      if (evtType === "error") throw new Error(`生成エラー: ${dataStr}`);

      if (evtType === "process_completed" || dataStr.includes("process_completed")) {
        try {
          const parsed = JSON.parse(dataStr) as {
            output?: { data?: unknown[] };
            success?: boolean;
            error?: string;
          };
          if (parsed.error) throw new Error(parsed.error);

          const first = parsed.output?.data?.[0];
          if (!first) throw new Error("出力データが空です");

          // Gradio returns video as: string URL, {url:...}, {video:{url:...}}, or {path:...}
          if (typeof first === "string") {
            videoUrl = first;
          } else {
            const obj = first as Record<string, unknown>;
            const nested = obj.video as Record<string, unknown> | undefined;
            videoUrl = (
              (typeof obj.url === "string" ? obj.url : null) ??
              (typeof obj.path === "string" ? obj.path : null) ??
              (typeof nested?.url === "string" ? nested.url : null)
            );
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
        break outer;
      }
    }
  }

  if (!videoUrl) throw new Error("動画生成がタイムアウトしました（60秒）");

  // 4. Fetch and return video binary
  const fullUrl = videoUrl.startsWith("http") ? videoUrl : `${spaceUrl}${videoUrl}`;
  const videoRes = await fetch(fullUrl);
  if (!videoRes.ok) throw new Error(`動画のダウンロードに失敗しました (${videoRes.status})`);
  return await videoRes.arrayBuffer();
}

// ── Route handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json() as { prompt: string; model: string };

    const spaceUrl = SPACES[model] ?? SPACES["ltx-video"];

    const buffer = await callGradioSpace(spaceUrl, prompt);
    return new NextResponse(buffer, {
      headers: { "Content-Type": "video/mp4" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
