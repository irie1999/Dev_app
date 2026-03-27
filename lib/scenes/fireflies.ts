import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Firefly {
  x: number; y: number; vx: number; vy: number;
  phase: number; phaseSpeed: number; size: number; hue: number;
  ax: number; ay: number;
}

function newFirefly(w: number, h: number): Firefly {
  return {
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.5 + Math.random() * 1.5,
    size: 2 + Math.random() * 3,
    hue: 50 + Math.random() * 60, // yellow-green
    ax: 0, ay: 0,
  };
}

export const firefliesScene = {
  id: "fireflies",
  name: "蛍",
  icon: "✨",
  description: "闇に漂う光の粒",
  gradient: "from-green-950 to-teal-900",
  textColor: "text-green-200",
  defaultParams: { speed: 0.35, intensity: 0.65, density: 0.3, hue: 0.17, brightness: 0.08 },

  init(w: number, h: number) {
    return { flies: Array.from({ length: 60 }, () => newFirefly(w, h)), time: 0 };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const flies = state.flies as Firefly[];
    const time = (state.time as number) + dt;
    const target = Math.floor(10 + params.density * 120);
    const speedMult = 0.3 + params.speed * 1.8;
    const glowR = 8 + params.intensity * 30;
    const hueBase = 40 + params.hue * 250;
    const bg = 1 + params.brightness * 7;

    while (flies.length < target) flies.push(newFirefly(w, h));
    while (flies.length > target) flies.pop();

    // Dark forest background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, `hsl(140, 25%, ${bg * 0.5}%)`);
    bgGrad.addColorStop(1, `hsl(130, 20%, ${bg}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const f of flies) {
      f.phase += f.phaseSpeed * dt;
      // Wander: random acceleration
      f.ax = (Math.random() - 0.5) * 80 * speedMult;
      f.ay = (Math.random() - 0.5) * 80 * speedMult;
      f.vx = f.vx * 0.96 + f.ax * dt;
      f.vy = f.vy * 0.96 + f.ay * dt;
      // Soft boundary
      if (f.x < 0.1 * w) f.vx += 30;
      if (f.x > 0.9 * w) f.vx -= 30;
      if (f.y < 0.1 * h) f.vy += 20;
      if (f.y > 0.9 * h) f.vy -= 20;
      f.x += f.vx * speedMult * dt;
      f.y += f.vy * speedMult * dt;

      const pulse = 0.4 + Math.sin(f.phase) * 0.6;
      const alpha = (0.3 + params.intensity * 0.6) * pulse;
      const r = glowR * (0.4 + pulse * 0.6);
      const hue = (hueBase + f.hue * 0.5) % 360;

      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, `hsla(${hue}, 90%, 90%, ${alpha})`);
      g.addColorStop(0.3, `hsla(${hue}, 85%, 65%, ${alpha * 0.5})`);
      g.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    return { flies, time };
  },
} satisfies SceneDefinition;
