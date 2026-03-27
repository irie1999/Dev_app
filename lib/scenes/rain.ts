import { SceneDefinition, SceneState, SceneParams } from "./types";

interface Drop { x: number; y: number; speed: number; len: number; }

function newDrop(w: number, h: number, randomY = false): Drop {
  return {
    x: Math.random() * w * 1.3 - w * 0.15,
    y: randomY ? Math.random() * h : -30,
    speed: 300 + Math.random() * 250,
    len: 12 + Math.random() * 18,
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
    const drops: Drop[] = Array.from({ length: 200 }, () => newDrop(w, h, true));
    return { drops };
  },

  render(ctx, state, params, dt, w, h) {
    const drops = state.drops as Drop[];
    const target = Math.floor(40 + params.density * 450);
    const speedMult = 0.3 + params.speed * 2.5;
    const opacity = 0.25 + params.intensity * 0.55;
    const hue = 180 + params.hue * 200;
    const bg = 3 + params.brightness * 14;

    while (drops.length < target) drops.push(newDrop(w, h));
    while (drops.length > target) drops.pop();

    ctx.fillStyle = `hsl(215, 25%, ${bg}%)`;
    ctx.fillRect(0, 0, w, h);

    const angle = 0.12;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    ctx.save();
    ctx.strokeStyle = `hsla(${hue % 360}, 65%, 82%, ${opacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + sinA * d.len, d.y + cosA * d.len);
      d.y += d.speed * speedMult * dt;
      d.x += d.speed * speedMult * dt * Math.tan(angle);
      if (d.y > h + d.len) Object.assign(d, newDrop(w, h));
    }
    ctx.stroke();
    ctx.restore();

    return { drops };
  },
};
