import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Flake {
  x: number; y: number; size: number; speed: number;
  wobble: number; wobbleSpeed: number; wobblePhase: number; opacity: number;
}

function newFlake(w: number, h: number, randomY = false): Flake {
  const size = 1.5 + Math.random() * 4;
  return {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : -size,
    size,
    speed: 20 + Math.random() * 40 + (4 - size) * 5,
    wobble: 0.5 + Math.random() * 1.5,
    wobbleSpeed: 0.5 + Math.random() * 1,
    wobblePhase: Math.random() * Math.PI * 2,
    opacity: 0.5 + Math.random() * 0.5,
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
    return { flakes: Array.from({ length: 180 }, () => newFlake(w, h, true)), time: 0 };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const flakes = state.flakes as Flake[];
    const time = (state.time as number) + dt;
    const target = Math.floor(40 + params.density * 400);
    const speedMult = 0.3 + params.speed * 2;
    const hue = 200 + params.hue * 150;
    const bg = 3 + params.brightness * 14;

    while (flakes.length < target) flakes.push(newFlake(w, h));
    while (flakes.length > target) flakes.pop();

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, `hsl(230, 30%, ${bg * 0.6}%)`);
    bgGrad.addColorStop(1, `hsl(220, 25%, ${bg}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    for (const f of flakes) {
      f.wobblePhase += f.wobbleSpeed * speedMult * dt;
      f.x += Math.sin(f.wobblePhase) * f.wobble * speedMult;
      f.y += f.speed * speedMult * dt;
      if (f.y > h + f.size) Object.assign(f, newFlake(w, h));

      const alpha = (0.4 + params.intensity * 0.5) * f.opacity;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
      g.addColorStop(0, `hsla(${hue}, 80%, 95%, ${alpha})`);
      g.addColorStop(0.5, `hsla(${hue}, 60%, 90%, ${alpha * 0.5})`);
      g.addColorStop(1, `hsla(${hue}, 40%, 80%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }

    return { flakes, time };
  },
} satisfies SceneDefinition;
