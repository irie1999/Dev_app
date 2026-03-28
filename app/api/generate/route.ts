import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const maxDuration = 60;

// Official HF Space IDs (owner/name) — @gradio/client resolves URLs automatically
const SPACE_IDS: Record<string, string> = {
  "ltx-video": "Lightricks/LTX-Video-Playground",
  "cogvideo":  "THUDM/CogVideoX-5B-Space",
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json() as { prompt: string; model: string };
    const spaceId = SPACE_IDS[model] ?? SPACE_IDS["ltx-video"];

    // Connect — @gradio/client handles sleeping spaces, URL resolution, version detection
    const client = await Client.connect(spaceId);

    // Discover API: find the first endpoint and its parameters
    const api = await client.view_api();
    const endpointName = Object.keys(api.named_endpoints)[0];
    if (!endpointName) throw new Error("このスペースに利用可能な API エンドポイントがありません");

    const endpoint = api.named_endpoints[endpointName];

    // Build params: inject prompt for text inputs, use defaults for everything else
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = endpoint.parameters.map((p: any) => {
      const isPromptField =
        p.component === "Textbox" ||
        String(p.label ?? "").toLowerCase().includes("prompt");
      if (isPromptField) return prompt;
      return p.parameter_has_default ? p.parameter_default : null;
    });

    // Run prediction
    const result = await client.predict(endpointName, params);
    const output = (result.data as unknown[])[0];

    // Extract video URL from various Gradio output shapes
    let videoUrl: string | null = null;
    if (typeof output === "string" && output.startsWith("http")) {
      videoUrl = output;
    } else if (output && typeof output === "object") {
      const obj = output as Record<string, unknown>;
      const nested = obj.video as Record<string, unknown> | undefined;
      videoUrl =
        (typeof obj.url === "string" ? obj.url : null) ??
        (typeof obj.path === "string" ? obj.path : null) ??
        (typeof nested?.url === "string" ? nested.url : null) ??
        null;
    }

    if (!videoUrl) throw new Error("動画 URL が取得できませんでした。スペースの出力形式が予期せぬ形式です。");

    // Fetch video binary and proxy to client
    const fullUrl = videoUrl.startsWith("http") ? videoUrl : `https://${spaceId.replace("/", "-").toLowerCase()}.hf.space${videoUrl}`;
    const videoRes = await fetch(fullUrl);
    if (!videoRes.ok) throw new Error(`動画ダウンロード失敗 (${videoRes.status})`);

    const buffer = await videoRes.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { "Content-Type": videoRes.headers.get("Content-Type") ?? "video/mp4" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
