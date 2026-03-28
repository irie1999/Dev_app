import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Star { x: number; y: number; size: number; phase: number; speed: number; hue: number; brightness: number; }
interface Shooter { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; }

// Simple pseudo-random for deterministic nebula
function prng(n: number) { return ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1; }

function newStar(w: number, h: number): Star {
  const brightness = Math.random();
  return {
    x: Math.random() * w, y: Math.random() * h,
    size: brightness < 0.05 ? 1.8 + Math.random() * 1.4 : 0.3 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.3 + Math.random() * 1.4,
    hue: [200, 220, 40, 30, 0, 280][Math.floor(Math.random() * 6)], // blue/white/yellow/orange/red/purple
    brightness,
  };
}

function newShooter(w: number, h: number): Shooter {
  const angle = -Math.PI / 5 + (Math.random() - 0.5) * 0.4;
  const sp = 500 + Math.random() * 400;
  return { x: Math.random() * w * 0.7, y: Math.random() * h * 0.35,
    vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
    life: 0, maxLife: 0.5 + Math.random() * 0.4 };
}

export const starsScene = {
  id: "stars",
  name: "星空",
  icon: "🌌",
  description: "無数の星に包まれる夜空",
  gradient: "from-indigo-950 to-violet-900",
  textColor: "text-indigo-200",
  defaultParams: { speed: 0.35, intensity: 0.6, density: 0.5, hue: 0.5, brightness: 0.15 },

  init(w: number, h: number) {
    return {
      stars: Array.from({ length: 350 }, () => newStar(w, h)),
      shooters: [] as Shooter[],
      time: 0, nextShoot: 3,
    };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const stars = state.stars as Star[];
    const shooters = state.shooters as Shooter[];
    const time = (state.time as number) + dt;
    let nextShoot = (state.nextShoot as number) - dt;
    const target = Math.floor(80 + params.density * 550);
    const bg = 1 + params.brightness * 7;
    const hueShift = params.hue * 60;
    const twinkleSpeed = 0.3 + params.speed * 1.5;

    while (stars.length < target) stars.push(newStar(w, h));
    while (stars.length > target) stars.pop();

    // Deep space background
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.5, Math.max(w, h));
    bgGrad.addColorStop(0, `hsl(${245 + hueShift * 0.1}, 40%, ${bg * 1.8}%)`);
    bgGrad.addColorStop(0.5, `hsl(235, 35%, ${bg * 1.2}%)`);
    bgGrad.addColorStop(1, `hsl(220, 30%, ${bg}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Milky Way band
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const mwAngle = Math.PI / 5;
    const mwCos = Math.cos(mwAngle);
    const mwSin = Math.sin(mwAngle);
    const mwCount = 35;
    for (let i = 0; i < mwCount; i++) {
      const t = i / mwCount;
      const d = (t - 0.5) * w * 2.5;
      const mx = w * 0.5 + d * mwCos;
      const my = h * 0.5 + d * mwSin;
      const mr = 30 + prng(i * 7) * 80;
      const malpha = (0.015 + prng(i * 13) * 0.03) * (0.3 + params.intensity * 0.7);
      const mhue = 220 + prng(i * 3) * 60;
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      mg.addColorStop(0, `hsla(${mhue}, 70%, 80%, ${malpha})`);
      mg.addColorStop(1, "transparent");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Stars
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const s of stars) {
      s.phase += s.speed * twinkleSpeed * dt;
      const twinkle = 0.5 + Math.sin(s.phase) * 0.5;
      const alpha = (0.3 + params.intensity * 0.65) * twinkle;
      const curSize = s.size * (0.6 + twinkle * 0.4);
      const starHue = s.hue + hueShift;

      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, curSize * 2.5);
      g.addColorStop(0, `hsla(${starHue}, 70%, 98%, ${alpha})`);
      g.addColorStop(0.3, `hsla(${starHue}, 60%, 85%, ${alpha * 0.4})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, curSize * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Cross rays for bright stars
      if (s.brightness > 0.9 && curSize > 1.5) {
        const rayLen = curSize * 12 * (0.5 + twinkle * 0.5);
        ctx.strokeStyle = `hsla(${starHue}, 60%, 90%, ${alpha * 0.5})`;
        ctx.lineWidth = 0.5;
        for (let r = 0; r < 2; r++) {
          ctx.beginPath();
          const a = (r * Math.PI) / 2;
          ctx.moveTo(s.x + Math.cos(a) * rayLen, s.y + Math.sin(a) * rayLen);
          ctx.lineTo(s.x - Math.cos(a) * rayLen, s.y - Math.sin(a) * rayLen);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Shooting stars
    if (nextShoot <= 0 && params.speed > 0.1) {
      shooters.push(newShooter(w, h));
      nextShoot = 5 + Math.random() * 10 * (1 - params.speed * 0.6);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.life += dt;
      if (s.life >= s.maxLife) { shooters.splice(i, 1); continue; }
      const t = s.life / s.maxLife;
      const alpha = Math.sin(t * Math.PI) * (0.5 + params.intensity * 0.5);
      const len = 100 + params.intensity * 150;
      const speed = Math.hypot(s.vx, s.vy);
      const nx = s.vx / speed; const ny = s.vy / speed;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - nx * len, s.y - ny * len);
      grad.addColorStop(0, `hsla(200, 80%, 97%, ${alpha})`);
      grad.addColorStop(0.3, `hsla(210, 70%, 80%, ${alpha * 0.3})`);
      grad.addColorStop(1, "transparent");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - nx * len, s.y - ny * len);
      ctx.stroke();
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    ctx.restore();

    return { stars, shooters, time, nextShoot };
  },
} satisfies SceneDefinition;
