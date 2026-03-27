"use client";

import { useState } from "react";
import { categories, VideoCategory } from "@/data/videos";
import VideoPlayer from "@/components/VideoPlayer";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<VideoCategory | null>(null);

  return (
    <>
      {activeCategory && (
        <VideoPlayer
          category={activeCategory}
          onClose={() => setActiveCategory(null)}
        />
      )}

      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="text-center pt-16 pb-10 px-4">
          <div className="text-5xl mb-4">✨</div>
          <h1 className="text-4xl font-thin text-white tracking-widest mb-3">
            Yumeiro
          </h1>
          <p className="text-gray-400 text-base font-light tracking-wide">
            眠れない夜に、ずっと見ていたい映像を
          </p>
        </header>

        {/* Category grid */}
        <main className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category, i) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category)}
                className={`category-card relative overflow-hidden rounded-2xl p-6 text-left bg-gradient-to-br ${category.gradient} border border-white/10 fade-in`}
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                {/* Background glow */}
                <div className="absolute inset-0 bg-black/20" />

                <div className="relative z-10">
                  <div className="text-3xl mb-3">{category.icon}</div>
                  <h3 className="text-white text-xl font-semibold mb-1">
                    {category.title}
                  </h3>
                  <p className={`text-xs ${category.textColor} opacity-80 leading-relaxed`}>
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className="text-white/40 text-xs">
                      {category.videos.length}本の映像
                    </span>
                  </div>
                </div>

                {/* Play indicator */}
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 8 10">
                    <path d="M0 0l8 5-8 5V0z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Footer note */}
          <div className="text-center mt-12">
            <p className="text-gray-600 text-xs tracking-wide">
              スリープタイマーを設定して、安心してお休みください 🌙
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
