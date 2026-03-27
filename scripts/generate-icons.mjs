import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const r = size * 0.18;
  const cx = size / 2;
  const cy = size * 0.44;
  const moonR = size * 0.22;
  const shadowR = moonR * 0.85;
  const shadowOffX = moonR * 0.36;
  const shadowOffY = -moonR * 0.1;

  const stars = [
    [0.18, 0.18], [0.76, 0.14], [0.86, 0.36],
    [0.13, 0.56], [0.82, 0.66], [0.33, 0.76],
    [0.67, 0.80], [0.09, 0.82],
  ]
    .map(([x, y]) => {
      const sr = Math.max(2, size * 0.014);
      return `<circle cx="${x * size}" cy="${y * size}" r="${sr}" fill="rgba(200,220,255,0.75)"/>`;
    })
    .join("\n");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a3e"/>
      <stop offset="100%" stop-color="#0a0a1f"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  ${stars}
  <circle cx="${cx}" cy="${cy}" r="${moonR}" fill="#c8d8ff"/>
  <circle cx="${cx + shadowOffX}" cy="${cy + shadowOffY}" r="${shadowR}" fill="#1a1a3e"/>
  <text x="${cx}" y="${size * 0.88}" font-size="${size * 0.1}" font-family="serif"
    text-anchor="middle" fill="rgba(180,200,255,0.7)" font-weight="bold">夢色</text>
</svg>`.trim();

  await sharp(Buffer.from(svg)).png().toFile(`public/icons/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

// Simple screenshot placeholder
const screenshotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
  <rect width="390" height="844" fill="#0a0a0f"/>
  <text x="195" y="422" font-size="32" font-family="serif"
    text-anchor="middle" fill="#4a4a6a">Yumeiro</text>
</svg>`.trim();

await sharp(Buffer.from(screenshotSvg)).png().toFile("public/icons/screenshot.png");
console.log("Generated screenshot.png");
