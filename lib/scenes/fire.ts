import { SceneDefinition, SceneState, SceneParams } from "./types";

interface FireParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; type: "flame" | "ember" | "smoke";
}

function newFlame(cx: number, cy: number): FireParticle {
  return {
    x: cx + (Math.random() - 0.5) * 50,
    y: cy + Math.random() * 10,
    vx: (Math.random() - 0.5) * 50,
    vy: -(70 + Math.random() * 130),
    life: 0, maxLife: 0.5 + Math.random() * 1.1,
    size: 12 + Math.random() * 26, type: "flame",
  };
}
function newEmber(cx: number, cy: number): FireParticle {
  const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
  const sp = 60 + Math.random() * 120;
  return {
    x: cx + (Math.random() - 0.5) * 30,
    y: cy,
    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
    life: 0, maxLife: 1.5 + Math.random() * 2,
    size: 2 + Math.random() * 3, type: "ember",
  };
}
function newSmoke(cx: number, cy: number): FireParticle {
  return {
    x: cx + (Math.random() - 0.5) * 40,
    y: cy - 80 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 20, vy: -(15 + Math.random() * 25),
    life: 0, maxLife: 2 + Math.random() * 2,
    size: 20 + Math.random() * 50, type: "smoke",
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
    return { particles: [] as FireParticle[], time: 0 };
  },

  render(ctx, state, params, dt, w, h) {
    const particles = state.particles as FireParticle[];
    const time = (state.time as number) + dt;
    const cx = w / 2;
    const cy = h * 0.82;
    const baseHue = 15 + params.hue * 40;
    const speedMult = 0.4 + params.speed * 2.2;
    const bg = 1 + params.brightness * 6;

    const flameRate = 10 + params.density * 55;
    const emberRate = 0.5 + params.density * 3;
    const smokeRate = 1 + params.density * 2;

    // Motion blur background
    ctx.fillStyle = `hsla(10, 20%, ${bg}%, 0.25)`;
    ctx.fillRect(0, 0, w, h);

    // Deep base glow
    const baseGlow = ctx.createRadialGradient(cx, cy + 10, 0, cx, cy, w * 0.6);
    baseGlow.addColorStop(0, `hsla(${baseHue}, 90%, 22%, ${0.4 + params.intensity * 0.3})`);
    baseGlow.addColorStop(0.5, `hsla(${baseHue - 5}, 80%, 10%, 0.15)`);
    baseGlow.addColorStop(1, "hsla(0,0%,0%,0)");
    ctx.fillStyle = baseGlow;
    ctx.fillRect(0, 0, w, h);

    // Emit
    const emitFlames = Math.floor(flameRate * dt);
    const emitEmbers = Math.random() < emberRate * dt ? 1 : 0;
    const emitSmoke = Math.random() < smokeRate * dt ? 1 : 0;
    for (let i = 0; i < emitFlames; i++) particles.push(newFlame(cx, cy));
    if (emitEmbers) particles.push(newEmber(cx, cy));
    if (emitSmoke) particles.push(newSmoke(cx, cy));

    // Sort: smoke back, flame mid, ember front
    const order = { smoke: 0, flame: 1, ember: 2 };

    // Draw smoke first (behind)
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
      const t = p.life / p.maxLife;
      p.vx += (Math.random() - 0.5) * 80 * dt;
      p.vx *= 0.97;
      if (p.type === "ember") { p.vy += 60 * dt; p.vx += (Math.random() - 0.5) * 120 * dt; }
      else { p.vy -= 40 * speedMult * dt; }
      p.x += p.vx * speedMult * dt;
      p.y += p.vy * speedMult * dt;

      if (p.type === "smoke") {
        const alpha = Math.sin(t * Math.PI) * 0.08 * params.intensity;
        if (alpha <= 0) continue;
        const sr = p.size * (1 + t * 1.5);
        const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sr);
        sg.addColorStop(0, `hsla(20, 10%, 60%, ${alpha})`);
        sg.addColorStop(1, `hsla(20, 5%, 40%, 0)`);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Draw flames + embers with additive blend
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      if (p.type === "smoke") continue;
      const t = p.life / p.maxLife;
      if (p.type === "flame") {
        const curSize = p.size * (1 - t * 0.65);
        const fh = t < 0.35 ? baseHue + 30 : baseHue;
        const sat = 90;
        const light = 85 - t * 55;
        const alpha = (0.22 + params.intensity * 0.4) * (1 - Math.max(0, (t - 0.5) * 2));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, curSize);
        g.addColorStop(0, `hsla(${fh}, ${sat}%, ${light}%, ${alpha})`);
        g.addColorStop(0.45, `hsla(${fh - 5}, ${sat}%, ${light * 0.55}%, ${alpha * 0.45})`);
        g.addColorStop(1, `hsla(${fh}, ${sat}%, 20%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // ember: small bright dot with tail glow
        const alpha = (1 - t) * (0.5 + params.intensity * 0.5);
        const eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        eg.addColorStop(0, `hsla(50, 100%, 95%, ${alpha})`);
        eg.addColorStop(0.4, `hsla(30, 100%, 70%, ${alpha * 0.5})`);
        eg.addColorStop(1, "transparent");
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    return { particles, time };
  },
};
