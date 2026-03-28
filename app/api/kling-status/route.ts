import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const maxDuration = 15;

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

export async function POST(req: NextRequest) {
  try {
    const { task_id, accessKey, secretKey } = await req.json() as {
      task_id: string;
      accessKey: string;
      secretKey: string;
    };

    const jwt = makeKlingJWT(accessKey, secretKey);
    const res = await fetch(
      `https://api.klingai.com/v1/videos/text2video/${task_id}`,
      { headers: { "Authorization": `Bearer ${jwt}` } },
    );

    const data = await res.json() as {
      code: number;
      message: string;
      data?: {
        task_status: "submitted" | "processing" | "succeed" | "failed";
        task_status_msg?: string;
        task_result?: { videos?: { url: string; duration: string }[] };
      };
    };

    if (data.code !== 0) {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    const task = data.data!;

    if (task.task_status === "failed") {
      return NextResponse.json(
        { error: `生成失敗: ${task.task_status_msg ?? "不明なエラー"}` },
        { status: 400 },
      );
    }

    if (task.task_status === "succeed") {
      const videoUrl = task.task_result?.videos?.[0]?.url;
      if (!videoUrl) {
        return NextResponse.json({ error: "動画 URL が取得できませんでした" }, { status: 500 });
      }
      return NextResponse.json({ status: "succeed", videoUrl });
    }

    // still processing
    return NextResponse.json({ status: task.task_status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
