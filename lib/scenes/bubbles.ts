import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Bubble {
  x: number; y: number; r: number; speed: number;
  wobble: number; wobbleSpeed: number; wobblePhase: number;
  hueOff: number; life: number; maxLife: number; shimmerPhase: number;
}

function newBubble(w: number, h: number, randomY = false): Bubble {
  const r = 3 + Math.random() * 22;
  const lifeTime = (h * 1.3) / (30 + Math.random() * 50 + (24 - r));
  return {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : h + r,
    r,
    speed: 28 + Math.random() * 45 + (24 - r) * 0.5,
    wobble: 0.25 + Math.random() * 0.7,
    wobbleSpeed: 0.7 + Math.random() * 1.1,
    wobblePhase: Math.random() * Math.PI * 2,
    hueOff: Math.random() * 80 - 40,
    life: 0, maxLife: lifeTime,
    shimmerPhase: Math.random() * Math.PI * 2,
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
    const target = Math.floor(8 + params.density * 90);
    const speedMult = 0.28 + params.speed * 1.9;
    const baseHue = 185 + params.hue * 120;
    const bg = 3 + params.brightness * 12;

    while (bubbles.length < target) bubbles.push(newBubble(w, h));
    while (bubbles.length > target) bubbles.pop();

    // Underwater background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, `hsl(${baseHue + 5}, 50%, ${bg * 1.4}%)`);
    bgGrad.addColorStop(0.5, `hsl(${baseHue}, 55%, ${bg}%)`);
    bgGrad.addColorStop(1, `hsl(${baseHue - 5}, 60%, ${bg * 0.5}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Caustic light shafts from above
    ctx.save();
    ctx.globalAlpha = 0.025 + params.brightness * 0.025;
    for (let i = 0; i < 6; i++) {
      const sx = w * (0.1 + (i / 5) * 0.8) + Math.sin(time * 0.25 + i) * w * 0.04;
      const lGrad = ctx.createLinearGradient(sx - w * 0.04, 0, sx + w * 0.04, h * 0.7);
      lGrad.addColorStop(0, `hsl(${baseHue + 20}, 80%, 80%)`);
      lGrad.addColorStop(1, "transparent");
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.03, 0);
      ctx.lineTo(sx + w * 0.03, 0);
      ctx.lineTo(sx + w * 0.12 + Math.sin(i) * w * 0.05, h * 0.7);
      ctx.lineTo(sx - w * 0.12 + Math.sin(i) * w * 0.05, h * 0.7);
      ctx.fill();
    }
    ctx.restore();

    // Bubbles
    for (const b of bubbles) {
      b.life += dt;
      b.wobblePhase += b.wobbleSpeed * dt;
      b.shimmerPhase += 2 * dt;
      b.x += Math.sin(b.wobblePhase) * b.wobble * speedMult;
      b.y -= b.speed * speedMult * dt;
      if (b.y < -b.r * 2) Object.assign(b, newBubble(w, h));

      const lifeT = Math.min(1, b.life * 2) * Math.max(0, 1 - Math.max(0, b.life / b.maxLife - 0.7) / 0.3);
      const baseAlpha = (0.18 + params.intensity * 0.42) * lifeT;
      if (baseAlpha <= 0) continue;
      const hue = (baseHue + b.hueOff) % 360;

      // Outer glow
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const outerG = ctx.createRadialGradient(b.x, b.y, b.r * 0.7, b.x, b.y, b.r * 1.6);
      outerG.addColorStop(0, `hsla(${hue}, 70%, 75%, 0)`);
      outerG.addColorStop(0.6, `hsla(${hue}, 75%, 80%, ${baseAlpha * 0.12})`);
      outerG.addColorStop(1, "transparent");
      ctx.fillStyle = outerG;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bubble rim (iridescent colors shift with shimmerPhase)
      const rimHue1 = (hue + Math.sin(b.shimmerPhase) * 60) % 360;
      const rimHue2 = (hue + 120 + Math.cos(b.shimmerPhase) * 40) % 360;
      ctx.save();
      ctx.strokeStyle = `hsla(${rimHue1}, 75%, 85%, ${baseAlpha * 1.3})`;
      ctx.lineWidth = Math.max(0.5, b.r * 0.07);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      // Second iridescent rim
      ctx.strokeStyle = `hsla(${rimHue2}, 80%, 80%, ${baseAlpha * 0.5})`;
      ctx.lineWidth = Math.max(0.3, b.r * 0.04);
      ctx.beginPath();
      ctx.arc(b.x + b.r * 0.06, b.y - b.r * 0.06, b.r * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Interior fill (subtle)
      const innerG = ctx.createRadialGradient(b.x - b.r * 0.28, b.y - b.r * 0.3, 0, b.x, b.y, b.r);
      innerG.addColorStop(0, `hsla(${(hue + 40) % 360}, 80%, 95%, ${baseAlpha * 0.35})`);
      innerG.addColorStop(0.5, `hsla(${hue}, 70%, 80%, ${baseAlpha * 0.1})`);
      innerG.addColorStop(1, `hsla(${hue}, 65%, 70%, 0)`);
      ctx.fillStyle = innerG;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight
      const hlG = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, 0, b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.4);
      hlG.addColorStop(0, `rgba(255,255,255,${baseAlpha * 0.6})`);
      hlG.addColorStop(1, "transparent");
      ctx.fillStyle = hlG;
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    return { bubbles, time };
  },
} satisfies SceneDefinition;
