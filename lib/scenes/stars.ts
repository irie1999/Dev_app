import { SceneDefinition, SceneParams, SceneState } from "./types";

interface Star { x: number; y: number; size: number; phase: number; speed: number; hue: number; }
interface Shooter { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; active: boolean; }

function newStar(w: number, h: number): Star {
  return {
    x: Math.random() * w, y: Math.random() * h,
    size: 0.4 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 1.2,
    hue: 180 + Math.random() * 80,
  };
}

function newShooter(w: number, h: number): Shooter {
  const angle = -Math.PI / 6 + (Math.random() - 0.5) * 0.3;
  const speed = 400 + Math.random() * 300;
  return {
    x: Math.random() * w * 0.7, y: Math.random() * h * 0.4,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    life: 0, maxLife: 0.6 + Math.random() * 0.4, active: true,
  };
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
      stars: Array.from({ length: 300 }, () => newStar(w, h)),
      shooters: [] as Shooter[],
      time: 0,
      nextShoot: 3,
    };
  },

  render(ctx: CanvasRenderingContext2D, state: SceneState, params: SceneParams, dt: number, w: number, h: number) {
    const stars = state.stars as Star[];
    const shooters = state.shooters as Shooter[];
    const time = (state.time as number) + dt;
    let nextShoot = (state.nextShoot as number) - dt;
    const target = Math.floor(60 + params.density * 500);
    const bg = 1 + params.brightness * 8;
    const hueShift = params.hue * 80;
    const twinkleSpeed = 0.3 + params.speed * 1.5;

    while (stars.length < target) stars.push(newStar(w, h));
    while (stars.length > target) stars.pop();

    // Background
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, h);
    bgGrad.addColorStop(0, `hsl(${235 + hueShift * 0.1}, 35%, ${bg * 1.5}%)`);
    bgGrad.addColorStop(1, `hsl(225, 30%, ${bg}%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const s of stars) {
      s.phase += s.speed * twinkleSpeed * dt;
      const twinkle = 0.5 + Math.sin(s.phase) * 0.5;
      const alpha = (0.3 + params.intensity * 0.6) * twinkle;
      const curSize = s.size * (0.5 + twinkle * 0.5);

      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, curSize * 2);
      g.addColorStop(0, `hsla(${s.hue + hueShift}, 70%, 95%, ${alpha})`);
      g.addColorStop(0.4, `hsla(${s.hue + hueShift}, 60%, 80%, ${alpha * 0.4})`);
      g.addColorStop(1, "hsla(0,0%,100%,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, curSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shooting stars
    if (nextShoot <= 0 && params.speed > 0.1) {
      shooters.push(newShooter(w, h));
      nextShoot = 4 + Math.random() * 8 * (1 - params.speed * 0.7);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.life += dt;
      if (s.life >= s.maxLife) { shooters.splice(i, 1); continue; }
      const t = s.life / s.maxLife;
      const alpha = Math.sin(t * Math.PI) * (0.4 + params.intensity * 0.5);
      const tailLen = 80 + params.intensity * 120;

      const grad = ctx.createLinearGradient(
        s.x - s.vx * 0.1 * dt, s.y - s.vy * 0.1 * dt,
        s.x - (s.vx / Math.hypot(s.vx, s.vy)) * tailLen,
        s.y - (s.vy / Math.hypot(s.vx, s.vy)) * tailLen,
      );
      grad.addColorStop(0, `hsla(200, 80%, 95%, ${alpha})`);
      grad.addColorStop(1, "hsla(200, 80%, 90%, 0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(
        s.x - (s.vx / Math.hypot(s.vx, s.vy)) * tailLen,
        s.y - (s.vy / Math.hypot(s.vx, s.vy)) * tailLen,
      );
      ctx.stroke();

      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    ctx.restore();

    return { stars, shooters, time, nextShoot };
  },
} satisfies SceneDefinition;
