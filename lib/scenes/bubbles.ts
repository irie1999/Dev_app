import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Bubble {
  x: number; y: number; r: number; speed: number;
  wobble: number; wobbleSpeed: number; wobblePhase: number;
  hueOff: number; life: number; maxLife: number;
}

function newBubble(w: number, h: number, randomY = false): Bubble {
  const r = 4 + Math.random() * 20;
  return {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : h + r,
    r,
    speed: 20 + Math.random() * 40 + (22 - r),
    wobble: 0.3 + Math.random() * 0.8,
    wobbleSpeed: 0.8 + Math.random() * 1.2,
    wobblePhase: Math.random() * Math.PI * 2,
    hueOff: Math.random() * 60 - 30,
    life: 0,
    maxLife: (h + r * 2) / 60,
  };
}

export const bubblesScene = {
  id: "bubbles",
  name: "泡",
  icon: "🫧",
  description: "漂う泡の幻想的な世界",
  gradient: "from-blue-900 to-cyan-900",
  textColor: "text-blue-200",
  defaultParams: { speed: 0.3, intensity: 0.55, density: 0.35, hue: 0.55, brightness: 0.18 },

  init(w: number, h: number) {
    return { bubbles: Array.from({ length: 40 }, () => newBubble(w, h, true)), time: 0 };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const bubbles = state.bubbles as Bubble[];
    const time = (state.time as number) + dt;
    const target = Math.floor(10 + params.density * 100);
    const speedMult = 0.3 + params.speed * 2;
    const baseHue = 185 + params.hue * 120;
    const bg = 3 + params.brightness * 12;

    while (bubbles.length < target) bubbles.push(newBubble(w, h));
    while (bubbles.length > target) bubbles.pop();

    // Underwater background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, `hsl(${baseHue - 5}, 45%, ${bg * 1.3}%)`);
    bgGrad.addColorStop(1, `hsl(${baseHue + 5}, 55%, ${bg * 0.5}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle caustics effect
    ctx.save();
    ctx.globalAlpha = 0.04 + params.brightness * 0.04;
    for (let i = 0; i < 6; i++) {
      const cx = w * (0.1 + ((i * 137) % 100) / 100 * 0.8);
      const cy = h * (0.2 + ((i * 97) % 100) / 100 * 0.6);
      const r = 40 + i * 20;
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g2.addColorStop(0, `hsl(${baseHue}, 70%, 70%)`);
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(cx + Math.sin(time * 0.4 + i) * 8, cy + Math.cos(time * 0.3 + i) * 6, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const b of bubbles) {
      b.life += dt;
      b.wobblePhase += b.wobbleSpeed * dt;
      b.x += Math.sin(b.wobblePhase) * b.wobble * speedMult;
      b.y -= b.speed * speedMult * dt;
      if (b.y < -b.r * 2) Object.assign(b, newBubble(w, h));

      const lifeAlpha = Math.min(1, b.life * 2) * Math.max(0, 1 - (b.life / b.maxLife - 0.7) / 0.3);
      const alpha = (0.2 + params.intensity * 0.4) * lifeAlpha;
      const hue = (baseHue + b.hueOff) % 360;

      // Bubble rim
      ctx.save();
      ctx.strokeStyle = `hsla(${hue}, 70%, 85%, ${alpha * 1.2})`;
      ctx.lineWidth = Math.max(0.5, b.r * 0.08);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner highlight
      const shimmer = ctx.createRadialGradient(
        b.x - b.r * 0.3, b.y - b.r * 0.3, 0,
        b.x, b.y, b.r,
      );
      shimmer.addColorStop(0, `hsla(${(hue + 30) % 360}, 80%, 95%, ${alpha * 0.5})`);
      shimmer.addColorStop(0.4, `hsla(${hue}, 70%, 80%, ${alpha * 0.15})`);
      shimmer.addColorStop(1, `hsla(${hue}, 65%, 70%, 0)`);
      ctx.fillStyle = shimmer;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    return { bubbles, time };
  },
} satisfies SceneDefinition;
