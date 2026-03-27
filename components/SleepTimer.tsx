"use client";

import { useState, useEffect, useCallback } from "react";

interface SleepTimerProps {
  onTimerEnd: () => void;
}

const TIMER_OPTIONS = [
  { label: "なし", minutes: 0 },
  { label: "15分", minutes: 15 },
  { label: "30分", minutes: 30 },
  { label: "60分", minutes: 60 },
  { label: "90分", minutes: 90 },
  { label: "120分", minutes: 120 },
];

export default function SleepTimer({ onTimerEnd }: SleepTimerProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const startTimer = useCallback((minutes: number) => {
    setSelectedMinutes(minutes);
    if (minutes === 0) {
      setIsRunning(false);
      setRemainingSeconds(0);
      return;
    }
    setRemainingSeconds(minutes * 60);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) {
      if (isRunning && remainingSeconds <= 0) {
        setIsRunning(false);
        onTimerEnd();
      }
      return;
    }
    const interval = setInterval(() => {
      setRemainingSeconds((s) => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, remainingSeconds, onTimerEnd]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm whitespace-nowrap">🌙 スリープ</span>
      <div className="flex gap-1">
        {TIMER_OPTIONS.map((opt) => (
          <button
            key={opt.minutes}
            onClick={() => startTimer(opt.minutes)}
            className={`px-2 py-1 rounded text-xs transition-all ${
              selectedMinutes === opt.minutes && isRunning
                ? "bg-indigo-600 text-white"
                : selectedMinutes === opt.minutes && opt.minutes === 0
                ? "bg-gray-700 text-gray-300"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {isRunning && remainingSeconds > 0 && (
        <span className="text-indigo-400 text-sm font-mono min-w-[48px]">
          {formatTime(remainingSeconds)}
        </span>
      )}
    </div>
  );
}
