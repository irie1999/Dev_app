import type { NextConfig } from "next";

// NEXT_STATIC_EXPORT=true → Capacitor用静的ビルド (out/)
// 通常 → Vercel サーバーレス (API ルートが使える)
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isStaticExport ? { output: "export" } : {}),
};

export default nextConfig;
