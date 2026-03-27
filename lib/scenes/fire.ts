import { SceneDefinition, SceneState, SceneParams } from "./types";

interface FireParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
}

function newParticle(cx: number, cy: number): FireParticle {
  const spread = 30;
  return {
    x: cx + (Math.random() - 0.5) * spread,
    y: cy + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 60,
    vy: -(80 + Math.random() * 120),
    life: 0,
    maxLife: 0.6 + Math.random() * 1.2,
    size: 10 + Math.random() * 22,
  };
}

export const fireScene: SceneDefinition = {
  id: "fire",
  name: "炎",
  icon: "🔥",
  description: "炎のゆらめきに見惚れる",
  gradient: "from-orange-900 to-red-900",
  textColor: "text-orange-200",
  defaultParams: { speed: 0.5, intensity: 0.6, density: 0.45, hue: 0.05, brightness: 0.1 },

  init(w, h) {
    return { particles: [] as FireParticle[], cx: w / 2, cy: h * 0.82 };
  },

  render(ctx, state, params, dt, w, h) {
    const particles = state.particles as FireParticle[];
    const cx = w / 2;
    const cy = h * 0.82;
    const baseHue = 15 + params.hue * 40; // orange→yellow range
    const emitRate = 8 + params.density * 50;
    const speedMult = 0.4 + params.speed * 2.2;
    const glowAlpha = 0.25 + params.intensity * 0.5;
    const bg = 1 + params.brightness * 8;

    // Background
    ctx.fillStyle = `hsl(10, 20%, ${bg}%)`;
    ctx.fillRect(0, 0, w, h);

    // Base glow
    const baseGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.55);
    baseGlow.addColorStop(0, `hsla(${baseHue}, 90%, 20%, ${0.35 + params.intensity * 0.25})`);
    baseGlow.addColorStop(1, "hsla(0,0%,0%,0)");
    ctx.fillStyle = baseGlow;
    ctx.fillRect(0, 0, w, h);

    // Emit new particles
    const emitCount = Math.floor(emitRate * dt);
    for (let i = 0; i < emitCount; i++) particles.push(newParticle(cx, cy));

    // Draw particles (additive blend for glow)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }

      const t = p.life / p.maxLife;
      p.vx += (Math.random() - 0.5) * 120 * dt;
      p.vx *= 0.97;
      p.vy -= 60 * speedMult * dt;
      p.x += p.vx * speedMult * dt;
      p.y += p.vy * speedMult * dt;

      const curSize = p.size * (1 - t * 0.6);
      // Color: young=white→yellow, mid=orange, old=red→fade
      const h2 = t < 0.4 ? baseHue : baseHue - t * 10;
      const sat = 80 + t * 20;
      const light = 90 - t * 55;
      const alpha = glowAlpha * (1 - Math.max(0, (t - 0.5) * 2));

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, curSize);
      g.addColorStop(0, `hsla(${h2},${sat}%,${light}%,${alpha})`);
      g.addColorStop(0.5, `hsla(${h2 - 5},${sat}%,${light * 0.6}%,${alpha * 0.4})`);
      g.addColorStop(1, `hsla(${h2},${sat}%,${light * 0.3}%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    return { particles, cx, cy };
  },
};
