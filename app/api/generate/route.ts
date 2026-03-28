import { NextRequest, NextResponse } from "next/server";

// Vercel Hobby: 最大60秒まで延長
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, token } = await req.json() as {
      prompt: string;
      model: string;
      token: string;
    };

    if (!token) {
      return NextResponse.json({ error: "トークンが必要です" }, { status: 401 });
    }

    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { num_frames: 25, fps: 8 },
          options: { wait_for_model: false },
        }),
      },
    );

    // Model loading → pass 503 back to client for retry
    if (hfRes.status === 503) {
      const data = await hfRes.json() as { estimated_time?: number };
      return NextResponse.json(data, { status: 503 });
    }

    if (hfRes.status === 401 || hfRes.status === 403) {
      return NextResponse.json({ error: "トークンが無効です。正しい HF トークンを入力してください。" }, { status: 401 });
    }

    if (hfRes.status === 404) {
      return NextResponse.json({ error: "このモデルは現在 HF Inference で利用できません。" }, { status: 404 });
    }

    if (!hfRes.ok) {
      const text = await hfRes.text();
      let msg = text;
      try { msg = (JSON.parse(text) as { error: string }).error ?? text; } catch { /* ignore */ }
      return NextResponse.json({ error: msg }, { status: hfRes.status });
    }

    // Stream video binary back to client
    const buffer = await hfRes.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": hfRes.headers.get("Content-Type") ?? "video/mp4",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `サーバーエラー: ${String(e)}` }, { status: 500 });
  }
}
