import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Foam { x: number; y: number; vx: number; life: number; maxLife: number; size: number; }

export const oceanScene = {
  id: "ocean",
  name: "海",
  icon: "🌊",
  description: "波の満ち引きに身を委ねる",
  gradient: "from-cyan-900 to-blue-900",
  textColor: "text-cyan-200",
  defaultParams: { speed: 0.35, intensity: 0.55, density: 0.45, hue: 0.5, brightness: 0.2 },

  init(_w: number, _h: number) { return { time: 0, foams: [] as Foam[] }; },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const time = (state.time as number) + dt * (0.18 + params.speed * 0.75);
    const foams = state.foams as Foam[];
    const numLayers = Math.floor(3 + params.density * 6);
    const waveH = h * (0.035 + params.intensity * 0.1);
    const baseHue = 185 + params.hue * 50;
    const bg = 3 + params.brightness * 12;
    const steps = 90;

    // Sky with subtle horizon glow
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.38);
    skyGrad.addColorStop(0, `hsl(${baseHue + 5}, 35%, ${bg * 0.35}%)`);
    skyGrad.addColorStop(0.7, `hsl(${baseHue + 10}, 40%, ${bg * 0.7}%)`);
    skyGrad.addColorStop(1, `hsl(${baseHue + 15}, 50%, ${bg * 1.1}%)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.38);

    // Moon/sun reflection streak on horizon
    ctx.save();
    const reflGrad = ctx.createLinearGradient(w * 0.3, h * 0.34, w * 0.7, h * 0.34);
    reflGrad.addColorStop(0, "transparent");
    reflGrad.addColorStop(0.5, `hsla(${baseHue + 20}, 70%, 85%, ${0.05 + params.intensity * 0.06})`);
    reflGrad.addColorStop(1, "transparent");
    ctx.fillStyle = reflGrad;
    ctx.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.08);
    ctx.restore();

    // Deep water base
    const seaGrad = ctx.createLinearGradient(0, h * 0.38, 0, h);
    seaGrad.addColorStop(0, `hsl(${baseHue}, 55%, ${bg * 0.95}%)`);
    seaGrad.addColorStop(0.5, `hsl(${baseHue + 3}, 58%, ${bg * 0.65}%)`);
    seaGrad.addColorStop(1, `hsl(${baseHue + 5}, 62%, ${bg * 0.35}%)`);
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, h * 0.38, w, h * 0.62);

    // Underwater shimmer caustics
    ctx.save();
    ctx.globalAlpha = 0.03 + params.brightness * 0.03;
    for (let i = 0; i < 8; i++) {
      const cx = w * (0.05 + (i / 8) * 0.9);
      const cy = h * (0.5 + Math.sin(time * 0.4 + i * 0.8) * 0.12);
      const cr = 35 + i * 12;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      cg.addColorStop(0, `hsl(${baseHue + 10}, 75%, 75%)`);
      cg.addColorStop(1, "transparent");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Wave layers (back → front)
    for (let l = 0; l < numLayers; l++) {
      const t = l / (numLayers - 1);
      const baseY = h * (0.27 + t * 0.52);
      const lHue = baseHue + l * 3;
      const light = bg * 1.1 + t * 20;
      const layerAlpha = 0.45 + t * 0.4;

      // Wave path
      const wavePts: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const y = baseY
          + Math.sin(x * 0.005 + time + l * 0.85) * waveH
          + Math.sin(x * 0.012 - time * 0.75 + l * 0.5) * waveH * 0.45
          + Math.sin(x * 0.021 + time * 0.45 + l) * waveH * 0.2;
        wavePts.push([x, y]);
      }

      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i <= steps; i++) {
        const [x, y] = wavePts[i];
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();

      const wGrad = ctx.createLinearGradient(0, baseY - waveH * 2, 0, h);
      wGrad.addColorStop(0, `hsla(${lHue}, 65%, ${light + 10}%, ${layerAlpha * 0.5})`);
      wGrad.addColorStop(0.1, `hsla(${lHue}, 65%, ${light}%, ${layerAlpha})`);
      wGrad.addColorStop(1, `hsla(${lHue}, 60%, ${light * 0.55}%, ${layerAlpha * 1.1})`);
      ctx.fillStyle = wGrad;
      ctx.fill();

      // Foam on frontmost wave crests
      if (l === numLayers - 1) {
        // Emit foam particles at wave peaks
        for (let i = 2; i < wavePts.length - 2; i++) {
          const [, py] = wavePts[i];
          const [, py1] = wavePts[i - 1];
          const [, py2] = wavePts[i + 1];
          if (py < py1 && py < py2 && Math.random() < 0.06 * params.density) {
            foams.push({ x: wavePts[i][0], y: py, vx: (Math.random() - 0.5) * 30, life: 0, maxLife: 0.6 + Math.random() * 0.6, size: 2 + Math.random() * 5 });
          }
        }
        // Crest highlight
        ctx.save();
        ctx.strokeStyle = `hsla(190, 60%, 90%, ${0.2 + params.intensity * 0.15})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        wavePts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.stroke();
        ctx.restore();
      }
    }

    // Foam particles
    ctx.save();
    for (let i = foams.length - 1; i >= 0; i--) {
      const f = foams[i];
      f.life += dt;
      if (f.life >= f.maxLife) { foams.splice(i, 1); continue; }
      f.x += f.vx * dt; f.vx *= 0.95;
      const fa = Math.sin((f.life / f.maxLife) * Math.PI) * 0.55 * params.intensity;
      ctx.fillStyle = `rgba(220, 240, 255, ${fa})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * (1 + f.life / f.maxLife * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    return { time, foams };
  },
} satisfies SceneDefinition;
