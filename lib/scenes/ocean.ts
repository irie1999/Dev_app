import { SceneDefinition, SceneParams, SceneState } from "./types";

export const oceanScene = {
  id: "ocean",
  name: "海",
  icon: "🌊",
  description: "波の満ち引きに身を委ねる",
  gradient: "from-cyan-900 to-blue-900",
  textColor: "text-cyan-200",
  defaultParams: { speed: 0.35, intensity: 0.55, density: 0.45, hue: 0.5, brightness: 0.2 },

  init(_w: number, _h: number) {
    return { time: 0 };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const time = (state.time as number) + dt * (0.2 + params.speed * 0.8);
    const numLayers = Math.floor(3 + params.density * 6);
    const waveH = h * (0.04 + params.intensity * 0.12);
    const baseHue = 185 + params.hue * 50; // cyan→blue
    const bg = 3 + params.brightness * 12;
    const steps = 80;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    skyGrad.addColorStop(0, `hsl(${baseHue - 10}, 40%, ${bg * 0.4}%)`);
    skyGrad.addColorStop(1, `hsl(${baseHue}, 45%, ${bg * 0.8}%)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.35);

    // Deep water background
    const seaGrad = ctx.createLinearGradient(0, h * 0.35, 0, h);
    seaGrad.addColorStop(0, `hsl(${baseHue}, 50%, ${bg * 0.9}%)`);
    seaGrad.addColorStop(1, `hsl(${baseHue + 5}, 55%, ${bg * 0.4}%)`);
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, h * 0.35, w, h * 0.65);

    // Wave layers back→front
    for (let l = 0; l < numLayers; l++) {
      const t = l / numLayers;
      const baseY = h * (0.25 + t * 0.55);
      const hue = baseHue + l * 4;
      const light = bg * 1.2 + t * 18;
      const layerAlpha = 0.5 + t * 0.35;

      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const y =
          baseY +
          Math.sin(x * 0.006 + time + l * 0.9) * waveH +
          Math.sin(x * 0.013 - time * 0.8 + l * 0.5) * waveH * 0.45 +
          Math.sin(x * 0.022 + time * 0.5 + l) * waveH * 0.2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      const wGrad = ctx.createLinearGradient(0, baseY - waveH * 2, 0, h);
      wGrad.addColorStop(0, `hsla(${hue}, 65%, ${light + 8}%, ${layerAlpha * 0.6})`);
      wGrad.addColorStop(0.15, `hsla(${hue}, 65%, ${light}%, ${layerAlpha})`);
      wGrad.addColorStop(1, `hsla(${hue}, 60%, ${light * 0.6}%, ${layerAlpha * 1.1})`);
      ctx.fillStyle = wGrad;
      ctx.fill();

      // Foam highlight on wave crest
      if (l === numLayers - 1) {
        ctx.save();
        ctx.strokeStyle = `hsla(195, 60%, 88%, 0.25)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w;
          const y =
            baseY +
            Math.sin(x * 0.006 + time + l * 0.9) * waveH +
            Math.sin(x * 0.013 - time * 0.8 + l * 0.5) * waveH * 0.45 +
            Math.sin(x * 0.022 + time * 0.5 + l) * waveH * 0.2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    return { time };
  },
} satisfies SceneDefinition;
