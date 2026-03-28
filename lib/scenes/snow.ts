import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Flake {
  x: number; y: number; size: number; speed: number;
  wobble: number; wobbleSpeed: number; wobblePhase: number;
  opacity: number; z: number; acc: number; // accumulated y offset
}
interface Pile { x: number; h: number; } // ground snow pile

function newFlake(w: number, h: number, randomY = false): Flake {
  const z = 0.2 + Math.random() * 0.8;
  const size = (1 + Math.random() * 4) * z;
  return {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : -size * 2,
    size, speed: (18 + Math.random() * 30) * z,
    wobble: (0.3 + Math.random() * 1.2) * z,
    wobbleSpeed: 0.4 + Math.random() * 0.8,
    wobblePhase: Math.random() * Math.PI * 2,
    opacity: 0.5 + Math.random() * 0.5, z, acc: 0,
  };
}

export const snowScene = {
  id: "snow",
  name: "雪",
  icon: "❄️",
  description: "静寂の雪景色",
  gradient: "from-slate-700 to-indigo-900",
  textColor: "text-slate-200",
  defaultParams: { speed: 0.3, intensity: 0.6, density: 0.4, hue: 0.6, brightness: 0.2 },

  init(w: number, h: number) {
    const pileCount = Math.floor(w / 6);
    return {
      flakes: Array.from({ length: 200 }, () => newFlake(w, h, true)),
      piles: Array.from({ length: pileCount }, (_, i) => ({
        x: (i / pileCount) * w,
        h: 0,
      })) as Pile[],
      time: 0,
    };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const flakes = state.flakes as Flake[];
    const piles = state.piles as Pile[];
    const time = (state.time as number) + dt;
    const target = Math.floor(50 + params.density * 450);
    const speedMult = 0.3 + params.speed * 2;
    const hue = 200 + params.hue * 150;
    const bg = 3 + params.brightness * 14;
    const groundY = h * 0.92;
    const windPhase = time * 0.3;
    const wind = Math.sin(windPhase) * 0.6 + Math.sin(windPhase * 0.4) * 0.3;

    while (flakes.length < target) flakes.push(newFlake(w, h));
    while (flakes.length > target) flakes.pop();

    // Sky gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, `hsl(230, 30%, ${bg * 0.5}%)`);
    bgGrad.addColorStop(0.7, `hsl(220, 25%, ${bg}%)`);
    bgGrad.addColorStop(1, `hsl(210, 20%, ${bg * 1.8}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Snow ground accumulation
    const maxPile = h * 0.06 * params.density;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const pile of piles) {
      ctx.lineTo(pile.x, groundY - pile.h);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const snowGrad = ctx.createLinearGradient(0, groundY - maxPile, 0, h);
    snowGrad.addColorStop(0, `hsla(${hue}, 50%, 95%, 0.9)`);
    snowGrad.addColorStop(1, `hsla(${hue}, 40%, 80%, 0.6)`);
    ctx.fillStyle = snowGrad;
    ctx.fill();
    ctx.restore();

    // Flakes
    for (const f of flakes) {
      f.wobblePhase += f.wobbleSpeed * speedMult * dt;
      f.x += (Math.sin(f.wobblePhase) * f.wobble + wind * f.z * 0.8) * speedMult;
      f.y += f.speed * speedMult * dt;

      if (f.y > groundY - (piles[Math.floor(f.x / (w / piles.length))]?.h ?? 0)) {
        // Accumulate
        const pi = Math.min(piles.length - 1, Math.floor(f.x / (w / piles.length)));
        if (piles[pi]) piles[pi].h = Math.min(maxPile, piles[pi].h + 0.08 * params.density);
        Object.assign(f, newFlake(w, h));
        continue;
      }
      if (f.x < -20) f.x = w + 20;
      if (f.x > w + 20) f.x = -20;

      const alpha = (0.4 + params.intensity * 0.5) * f.opacity;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size + 1);
      g.addColorStop(0, `hsla(${hue}, 75%, 97%, ${alpha})`);
      g.addColorStop(0.5, `hsla(${hue}, 60%, 90%, ${alpha * 0.45})`);
      g.addColorStop(1, `hsla(${hue}, 40%, 85%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    return { flakes, piles, time };
  },
} satisfies SceneDefinition;
