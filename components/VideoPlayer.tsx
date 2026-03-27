"use client";

import { useState, useCallback } from "react";
import { VideoCategory, Video } from "@/data/videos";
import SleepTimer from "./SleepTimer";

interface VideoPlayerProps {
  category: VideoCategory;
  onClose: () => void;
}

export default function VideoPlayer({ category, onClose }: VideoPlayerProps) {
  const [activeVideo, setActiveVideo] = useState<Video>(category.videos[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [showTimerEnded, setShowTimerEnded] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const handleTimerEnd = useCallback(() => {
    setIsStopped(true);
    setShowTimerEnded(true);
    setTimeout(() => setShowTimerEnded(false), 4000);
  }, []);

  const handleResume = () => {
    setIsStopped(false);
  };

  const embedUrl = isStopped
    ? ""
    : `https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&loop=1&playlist=${activeVideo.youtubeId}&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&iv_load_policy=3`;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h2 className="text-white font-semibold leading-tight">{category.title}</h2>
            <p className="text-gray-400 text-xs">{activeVideo.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SleepTimer onTimerEnd={handleTimerEnd} />

          <button
            onClick={() => setIsMuted((m) => !m)}
            className="text-gray-300 hover:text-white transition-colors p-2"
            title={isMuted ? "音をオンにする" : "ミュート"}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536A5 5 0 016 12a5 5 0 012.464-4.464" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-2"
            title="閉じる"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 relative">
        {isStopped ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95">
            <div className="text-6xl mb-6">🌙</div>
            <h3 className="text-white text-2xl font-light mb-2">おやすみなさい</h3>
            <p className="text-gray-400 text-sm mb-8">スリープタイマーが終了しました</p>
            <button
              onClick={handleResume}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors"
            >
              再生を再開する
            </button>
          </div>
        ) : (
          <iframe
            key={activeVideo.youtubeId + isMuted}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}

        {/* Timer ended notification */}
        {showTimerEnded && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm fade-in">
            スリープタイマーが終了しました 🌙
          </div>
        )}
      </div>

      {/* Video list sidebar */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-white/10">
        <div className="flex gap-2 p-3 overflow-x-auto">
          {category.videos.map((video) => (
            <button
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm transition-all ${
                activeVideo.id === video.id
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {video.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
