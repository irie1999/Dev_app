"use client";

import { useState } from "react";
import { useFavorites, Preset } from "@/hooks/useFavorites";
import { scenes } from "@/lib/scenes";
import GenerativePlayer from "@/components/GenerativePlayer";

export default function FavoritesPage() {
  const { favorites, remove } = useFavorites();
  const [active, setActive] = useState<Preset | null>(null);

  const activeScene = active ? scenes.find((s) => s.id === active.sceneId) : null;

  return (
    <>
      {active && activeScene && (
        <GenerativePlayer
          scene={activeScene}
          initialParams={active.params}
          onClose={() => setActive(null)}
        />
      )}

      <div className="min-h-screen bg-[#0a0a0f] pb-24">
        <header className="text-center pt-16 pb-8 px-4">
          <h1 className="text-2xl font-thin text-white tracking-widest">お気に入り</h1>
          <p className="text-gray-600 text-xs mt-2 tracking-wide">
            保存したプリセットを呼び出せます
          </p>
        </header>

        <main className="max-w-lg mx-auto px-4">
          {favorites.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4 opacity-30">⭐</div>
              <p className="text-gray-600 text-sm tracking-wide">
                映像を再生中に ★ ボタンで保存できます
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {favorites.map((preset) => {
                const scene = scenes.find((s) => s.id === preset.sceneId);
                if (!scene) return null;
                return (
                  <div
                    key={preset.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/8 group"
                  >
                    <button
                      onClick={() => setActive(preset)}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${scene.gradient} flex items-center justify-center text-2xl flex-shrink-0`}>
                        {scene.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-light truncate">{preset.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{scene.name}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => remove(preset.id)}
                      className="text-gray-700 hover:text-red-400 transition-colors p-2 opacity-0 group-hover:opacity-100"
                      aria-label="削除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
