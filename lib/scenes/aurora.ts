import { SceneDefinition, SceneParams, SceneState } from "./types";

export const auroraScene = {
  id: "aurora",
  name: "オーロラ",
  icon: "🌠",
  description: "幻想的な光の帯が揺れる",
  gradient: "from-emerald-900 to-indigo-900",
  textColor: "text-emerald-200",
  defaultParams: { speed: 0.35, intensity: 0.6, density: 0.45, hue: 0.4, brightness: 0.15 },

  init(_w: number, _h: number) {
    return { time: 0 };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const time = (state.time as number) + dt * (0.15 + params.speed * 0.6);
    const numBands = Math.floor(2 + params.density * 6);
    const baseHue = 140 + params.hue * 200; // green→purple range
    const alpha = 0.12 + params.intensity * 0.38;
    const bg = 2 + params.brightness * 10;

    // Night sky background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, `hsl(240, 30%, ${bg * 0.5}%)`);
    bgGrad.addColorStop(0.6, `hsl(230, 28%, ${bg}%)`);
    bgGrad.addColorStop(1, `hsl(220, 25%, ${bg * 1.4}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Faint stars
    ctx.save();
    const seed = 42;
    for (let i = 0; i < 80; i++) {
      const sx = ((seed * (i + 1) * 1234567) % w + w) % w;
      const sy = ((seed * (i + 1) * 7654321) % (h * 0.7) + h * 0.7) % (h * 0.7);
      const sa = 0.1 + ((seed * i * 999) % 100) / 300;
      ctx.fillStyle = `rgba(200,220,255,${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Aurora bands
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const steps = 60;

    for (let b = 0; b < numBands; b++) {
      const bandHue = (baseHue + b * 45) % 360;
      const bandCenterY = h * (0.1 + b * 0.12);
      const amplitude = h * (0.04 + params.intensity * 0.08);
      const freq1 = 0.002 + b * 0.0008;
      const freq2 = 0.005 + b * 0.0015;
      const timeOff = b * 1.7;
      const bandHeight = h * (0.06 + params.intensity * 0.09);

      // Build wavy path (top edge)
      const topPoints: [number, number][] = [];
      const botPoints: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const wave =
          Math.sin(x * freq1 + time + timeOff) * amplitude +
          Math.sin(x * freq2 - time * 0.7 + timeOff * 0.5) * amplitude * 0.4;
        topPoints.push([x, bandCenterY + wave - bandHeight]);
        botPoints.push([x, bandCenterY + wave + bandHeight]);
      }

      ctx.beginPath();
      ctx.moveTo(topPoints[0][0], topPoints[0][1]);
      for (let i = 1; i < topPoints.length; i++) {
        const [x, y] = topPoints[i];
        const [px, py] = topPoints[i - 1];
        ctx.bezierCurveTo(px + (x - px) * 0.5, py, x - (x - px) * 0.5, y, x, y);
      }
      for (let i = botPoints.length - 1; i >= 0; i--) {
        const [x, y] = botPoints[i];
        if (i === botPoints.length - 1) ctx.lineTo(x, y);
        else {
          const [nx, ny] = botPoints[i + 1];
          ctx.bezierCurveTo(nx - (nx - x) * 0.5, ny, x + (nx - x) * 0.5, y, x, y);
        }
      }
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(0, bandCenterY - bandHeight * 2, 0, bandCenterY + bandHeight * 2);
      fillGrad.addColorStop(0, `hsla(${bandHue}, 85%, 65%, 0)`);
      fillGrad.addColorStop(0.3, `hsla(${bandHue}, 85%, 65%, ${alpha})`);
      fillGrad.addColorStop(0.5, `hsla(${bandHue}, 90%, 75%, ${alpha * 1.6})`);
      fillGrad.addColorStop(0.7, `hsla(${bandHue}, 85%, 65%, ${alpha})`);
      fillGrad.addColorStop(1, `hsla(${bandHue}, 85%, 65%, 0)`);
      ctx.fillStyle = fillGrad;
      ctx.fill();
    }
    ctx.restore();

    return { time };
  },
} satisfies SceneDefinition;
