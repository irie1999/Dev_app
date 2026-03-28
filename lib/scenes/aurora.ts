import { SceneDefinition, SceneParams, SceneState } from "./types";

function prng(n: number) { return ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1; }

export const auroraScene = {
  id: "aurora",
  name: "オーロラ",
  icon: "🌠",
  description: "幻想的な光の帯が揺れる",
  gradient: "from-emerald-900 to-indigo-900",
  textColor: "text-emerald-200",
  defaultParams: { speed: 0.35, intensity: 0.6, density: 0.45, hue: 0.4, brightness: 0.15 },

  init(_w: number, _h: number) { return { time: 0 }; },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const time = (state.time as number) + dt * (0.12 + params.speed * 0.55);
    const numBands = Math.floor(3 + params.density * 6);
    const baseHue = 140 + params.hue * 200;
    const alpha = 0.1 + params.intensity * 0.35;
    const bg = 2 + params.brightness * 8;
    const steps = 70;

    // Night sky
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, `hsl(245, 35%, ${bg * 0.4}%)`);
    bgGrad.addColorStop(0.6, `hsl(230, 30%, ${bg}%)`);
    bgGrad.addColorStop(1, `hsl(220, 25%, ${bg * 1.5}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < 100; i++) {
      const sx = prng(i * 7 + 1) * w;
      const sy = prng(i * 3 + 2) * h * 0.75;
      const sa = (0.1 + prng(i * 11) * 0.3) * params.brightness;
      ctx.fillStyle = `rgba(210,225,255,${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let b = 0; b < numBands; b++) {
      const bandHue = (baseHue + b * 40) % 360;
      const bandCY = h * (0.08 + b * 0.11);
      const amp = h * (0.035 + params.intensity * 0.07);
      const bHeight = h * (0.055 + params.intensity * 0.085);
      const f1 = 0.0018 + b * 0.0007;
      const f2 = 0.0045 + b * 0.0015;
      const f3 = 0.009 + b * 0.002;
      const tOff = b * 2.1;

      // Build top/bottom edge using multi-frequency waves
      const pts: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const wave =
          Math.sin(x * f1 + time + tOff) * amp +
          Math.sin(x * f2 - time * 0.65 + tOff * 0.6) * amp * 0.45 +
          Math.sin(x * f3 + time * 0.4 + tOff * 1.2) * amp * 0.2;
        pts.push([x, bandCY + wave]);
      }

      // Band fill
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] - bHeight);
      for (let i = 1; i < pts.length; i++) {
        const [px, py] = pts[i - 1]; const [cx2, cy2] = pts[i];
        ctx.bezierCurveTo(px + (cx2 - px) * 0.5, py - bHeight, cx2 - (cx2 - px) * 0.5, cy2 - bHeight, cx2, cy2 - bHeight);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        const [px, py] = pts[i];
        if (i < pts.length - 1) {
          const [nx, ny] = pts[i + 1];
          ctx.bezierCurveTo(nx - (nx - px) * 0.5, ny + bHeight, px + (nx - px) * 0.5, py + bHeight, px, py + bHeight);
        } else {
          ctx.lineTo(px, py + bHeight);
        }
      }
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, bandCY - bHeight * 2.5, 0, bandCY + bHeight * 2.5);
      fillGrad.addColorStop(0, `hsla(${bandHue}, 88%, 68%, 0)`);
      fillGrad.addColorStop(0.25, `hsla(${bandHue}, 88%, 68%, ${alpha})`);
      fillGrad.addColorStop(0.5, `hsla(${bandHue}, 92%, 78%, ${alpha * 1.7})`);
      fillGrad.addColorStop(0.75, `hsla(${bandHue}, 88%, 68%, ${alpha})`);
      fillGrad.addColorStop(1, `hsla(${bandHue}, 88%, 68%, 0)`);
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Vertical light rays at band bottom
      const rayCount = Math.floor(3 + params.intensity * 6);
      for (let r = 0; r < rayCount; r++) {
        const rx = (r / rayCount + prng(b * 10 + r) * 0.1) * w;
        const ry = pts[Math.floor((rx / w) * steps)]?.[1] ?? bandCY;
        const rLen = h * (0.05 + prng(b * 5 + r) * 0.1) * params.intensity;
        const rAlpha = alpha * 0.5 * prng(b * 7 + r + time * 0.1);
        const rGrad = ctx.createLinearGradient(rx, ry, rx, ry + rLen);
        rGrad.addColorStop(0, `hsla(${bandHue}, 85%, 75%, ${rAlpha})`);
        rGrad.addColorStop(1, `hsla(${bandHue}, 85%, 65%, 0)`);
        ctx.strokeStyle = rGrad;
        ctx.lineWidth = 1 + prng(b + r) * 2;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + (Math.random() - 0.5) * 5, ry + rLen);
        ctx.stroke();
      }
    }
    ctx.restore();

    return { time };
  },
} satisfies SceneDefinition;
