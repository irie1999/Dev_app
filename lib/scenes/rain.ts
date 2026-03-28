import { SceneDefinition, SceneState, SceneParams } from "./types";

interface Drop { x: number; y: number; speed: number; len: number; z: number; }
interface Ripple { x: number; y: number; r: number; maxR: number; }

function newDrop(w: number, h: number, randomY = false): Drop {
  const z = 0.2 + Math.random() * 0.8; // depth: 0=far, 1=near
  return {
    x: Math.random() * w * 1.4 - w * 0.2,
    y: randomY ? Math.random() * h : -30,
    speed: (180 + Math.random() * 200) * z,
    len: (8 + Math.random() * 14) * z,
    z,
  };
}

export const rainScene: SceneDefinition = {
  id: "rain",
  name: "雨",
  icon: "🌧️",
  description: "静かな雨音に包まれる",
  gradient: "from-slate-800 to-blue-900",
  textColor: "text-blue-200",
  defaultParams: { speed: 0.45, intensity: 0.55, density: 0.4, hue: 0.58, brightness: 0.15 },

  init(w, h) {
    const drops: Drop[] = Array.from({ length: 250 }, () => newDrop(w, h, true));
    return { drops, ripples: [] as Ripple[], time: 0 };
  },

  render(ctx, state, params, dt, w, h) {
    const drops = state.drops as Drop[];
    const ripples = state.ripples as Ripple[];
    const time = (state.time as number) + dt;
    const target = Math.floor(60 + params.density * 500);
    const speedMult = 0.3 + params.speed * 2.5;
    const hue = 180 + params.hue * 200;
    const bg = 3 + params.brightness * 14;
    const groundY = h * 0.92;

    while (drops.length < target) drops.push(newDrop(w, h));
    while (drops.length > target) drops.pop();

    // Motion blur: semi-transparent clear for trail effect
    ctx.fillStyle = `hsla(215, 25%, ${bg}%, 0.35)`;
    ctx.fillRect(0, 0, w, h);

    // Ground fog / puddle reflection
    const fogGrad = ctx.createLinearGradient(0, groundY, 0, h);
    fogGrad.addColorStop(0, `hsla(210, 30%, ${bg * 1.8}%, 0)`);
    fogGrad.addColorStop(1, `hsla(210, 30%, ${bg * 1.8}%, 0.4)`);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    const angle = 0.13;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Draw drops sorted by depth (far→near)
    const sorted = [...drops].sort((a, b) => a.z - b.z);
    for (const d of sorted) {
      const opacity = (0.15 + params.intensity * 0.5) * d.z;
      ctx.strokeStyle = `hsla(${hue % 360}, 65%, 88%, ${opacity})`;
      ctx.lineWidth = Math.max(0.3, d.z * 0.8);
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + sinA * d.len, d.y + cosA * d.len);
      ctx.stroke();

      d.y += d.speed * speedMult * dt;
      d.x += d.speed * speedMult * dt * Math.tan(angle);

      if (d.y > groundY && d.z > 0.5) {
        ripples.push({ x: d.x, y: groundY, r: 0, maxR: 4 + d.z * 14 });
      }
      if (d.y > h + d.len) Object.assign(d, newDrop(w, h));
    }

    // Ripples on ground
    ctx.save();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += (50 + params.intensity * 40) * dt;
      const alpha = (1 - rp.r / rp.maxR) * 0.35 * params.intensity;
      if (alpha <= 0) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `hsla(${hue % 360}, 50%, 75%, ${alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    return { drops, ripples, time };
  },
};
