"use client";

import { SceneParams } from "@/lib/scenes/types";

interface SceneControlsProps {
  params: SceneParams;
  onChange: (params: SceneParams) => void;
}

const CONTROLS: { key: keyof SceneParams; label: string; emoji: string }[] = [
  { key: "speed",      label: "速さ",  emoji: "💨" },
  { key: "intensity",  label: "輝き",  emoji: "✦"  },
  { key: "density",    label: "密度",  emoji: "⠿"  },
  { key: "hue",        label: "色",    emoji: "🎨" },
  { key: "brightness", label: "明るさ", emoji: "☽"  },
];

export default function SceneControls({ params, onChange }: SceneControlsProps) {
  const set = (key: keyof SceneParams, value: number) =>
    onChange({ ...params, [key]: value });

  return (
    <div className="px-4 py-4 grid grid-cols-5 gap-3">
      {CONTROLS.map(({ key, label, emoji }) => (
        <div key={key} className="flex flex-col items-center gap-1.5">
          <span className="text-base leading-none">{emoji}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={params[key]}
            onChange={(e) => set(key, parseFloat(e.target.value))}
            className="w-full h-1 accent-white cursor-pointer"
            style={{ writingMode: "horizontal-tb" }}
          />
          <span className="text-gray-400 text-[10px] tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}
