import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const maxDuration = 30;

// ── Kling JWT (HS256) ─────────────────────────────────────────────────
function makeKlingJWT(accessKey: string, secretKey: string): string {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const header  = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({ iss: accessKey, exp: now + 1800, nbf: now - 5 });
  const sig = crypto
    .createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${sig}`;
}

// ── Route ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { prompt, model, accessKey, secretKey } = await req.json() as {
      prompt: string;
      model: string;
      accessKey: string;
      secretKey: string;
    };

    if (!accessKey || !secretKey) {
      return NextResponse.json({ error: "Kling API キーが必要です" }, { status: 401 });
    }

    const jwt = makeKlingJWT(accessKey, secretKey);

    const res = await fetch("https://api.klingai.com/v1/videos/text2video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        cfg_scale: 0.5,
        mode: "std",
        aspect_ratio: "16:9",
        duration: "5",
      }),
    });

    const data = await res.json() as {
      code: number;
      message: string;
      data?: { task_id: string };
    };

    if (data.code !== 0 || !data.data?.task_id) {
      return NextResponse.json(
        { error: `Kling エラー: ${data.message} (code ${data.code})` },
        { status: 400 },
      );
    }

    return NextResponse.json({ task_id: data.data.task_id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
