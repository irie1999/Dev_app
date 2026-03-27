"use client";

import { useState, useEffect, useCallback } from "react";
import { SceneParams } from "@/lib/scenes/types";

export interface Preset {
  id: string;
  name: string;
  sceneId: string;
  params: SceneParams;
  createdAt: number;
}

const STORAGE_KEY = "yumeiro-favorites-v1";

function load(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Preset[]>([]);

  useEffect(() => {
    setFavorites(load());
  }, []);

  const save = useCallback((preset: Omit<Preset, "id" | "createdAt">) => {
    const entry: Preset = { ...preset, id: `${Date.now()}`, createdAt: Date.now() };
    const updated = [...load(), entry];
    persist(updated);
    setFavorites(updated);
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    const updated = load().filter((p) => p.id !== id);
    persist(updated);
    setFavorites(updated);
  }, []);

  return { favorites, save, remove };
}
