"use client";

import { useState } from "react";
import { scenes, SceneDefinition } from "@/lib/scenes";
import GenerativePlayer from "@/components/GenerativePlayer";

export default function Home() {
  const [activeScene, setActiveScene] = useState<SceneDefinition | null>(null);

  return (
    <>
      {activeScene && (
        <GenerativePlayer
          scene={activeScene}
          onClose={() => setActiveScene(null)}
        />
      )}

      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="text-center pt-16 pb-10 px-4">
          <div className="text-4xl mb-4 select-none">✨</div>
          <h1 className="text-4xl font-thin text-white tracking-widest mb-3">
            Yumeiro
          </h1>
          <p className="text-gray-500 text-sm font-light tracking-widest">
            眠れない夜に、ずっと見ていたい映像を
          </p>
        </header>

        {/* Scene grid */}
        <main className="max-w-2xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {scenes.map((scene, i) => (
              <button
                key={scene.id}
                onClick={() => setActiveScene(scene)}
                className={`category-card relative overflow-hidden rounded-2xl p-5 text-left bg-gradient-to-br ${scene.gradient} border border-white/10 fade-in`}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
              >
                <div className="relative z-10">
                  <div className="text-3xl mb-3 select-none">{scene.icon}</div>
                  <h3 className="text-white text-lg font-light tracking-widest mb-1">
                    {scene.name}
                  </h3>
                  <p className={`text-xs ${scene.textColor} opacity-70 leading-relaxed`}>
                    {scene.description}
                  </p>
                </div>
                {/* Play button */}
                <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 8 10">
                    <path d="M0 0l8 5-8 5V0z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Hint */}
          <p className="text-center mt-10 text-gray-700 text-xs tracking-widest">
            映像を開いたら、下のスライダーで自由に調整できます
          </p>
        </main>
      </div>
    </>
  );
}
