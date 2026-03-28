import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Firefly {
  x: number; y: number; vx: number; vy: number;
  phase: number; phaseSpeed: number; size: number; hue: number;
  tx: number; ty: number; // target position for wandering
}

function newFirefly(w: number, h: number): Firefly {
  const x = Math.random() * w;
  const y = Math.random() * h;
  return {
    x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.4 + Math.random() * 1.2,
    size: 2 + Math.random() * 2.5,
    hue: 45 + Math.random() * 70,
    tx: x + (Math.random() - 0.5) * 200,
    ty: y + (Math.random() - 0.5) * 200,
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
    return { flies: Array.from({ length: 50 }, () => newFirefly(w, h)), time: 0 };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const flies = state.flies as Firefly[];
    const time = (state.time as number) + dt;
    const target = Math.floor(8 + params.density * 110);
    const speedMult = 0.25 + params.speed * 1.6;
    const glowR = 10 + params.intensity * 35;
    const hueBase = 40 + params.hue * 250;
    const bg = 1 + params.brightness * 6;

    while (flies.length < target) flies.push(newFirefly(w, h));
    while (flies.length > target) flies.pop();

    // Motion trail - key for glow trails
    ctx.fillStyle = `hsla(140, 22%, ${bg}%, 0.18)`;
    ctx.fillRect(0, 0, w, h);

    // Dark forest bg (first frame or on bright flash)
    if (time < 0.1) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, `hsl(140, 25%, ${bg * 0.4}%)`);
      bgGrad.addColorStop(1, `hsl(130, 20%, ${bg}%)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const f of flies) {
      f.phase += f.phaseSpeed * dt;

      // Wander toward target
      const toTx = f.tx - f.x;
      const toTy = f.ty - f.y;
      const dist = Math.hypot(toTx, toTy);
      if (dist < 20 || Math.random() < 0.005) {
        f.tx = Math.max(0.1, Math.min(0.9, f.x / w + (Math.random() - 0.5) * 0.3)) * w;
        f.ty = Math.max(0.1, Math.min(0.9, f.y / h + (Math.random() - 0.5) * 0.3)) * h;
      }
      f.vx += (toTx / Math.max(dist, 1)) * 30 * speedMult * dt;
      f.vy += (toTy / Math.max(dist, 1)) * 30 * speedMult * dt;
      f.vx *= 0.95; f.vy *= 0.95;
      f.x += f.vx * speedMult * dt;
      f.y += f.vy * speedMult * dt;

      // Pulse
      const pulse = 0.3 + Math.pow(Math.max(0, Math.sin(f.phase)), 2) * 0.7;
      const alpha = (0.25 + params.intensity * 0.6) * pulse;
      const r = glowR * (0.3 + pulse * 0.7);
      const hue = (hueBase + f.hue * 0.4) % 360;

      // Outer bloom ring (large, soft)
      const bloom = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 2.5);
      bloom.addColorStop(0, `hsla(${hue}, 90%, 85%, ${alpha * 0.2})`);
      bloom.addColorStop(1, "transparent");
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Mid glow
      const mid = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      mid.addColorStop(0, `hsla(${hue}, 90%, 92%, ${alpha * 0.7})`);
      mid.addColorStop(0.4, `hsla(${hue}, 85%, 70%, ${alpha * 0.3})`);
      mid.addColorStop(1, "transparent");
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      const core = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
      core.addColorStop(0, `hsla(${(hue + 20) % 360}, 95%, 98%, ${alpha})`);
      core.addColorStop(1, `hsla(${hue}, 90%, 80%, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    return { flies, time };
  },
} satisfies SceneDefinition;
