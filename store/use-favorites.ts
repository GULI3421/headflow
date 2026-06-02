"use client";

import { useCallback, useEffect, useState } from "react";

const FAVORITES_STORAGE_KEY = "heatflow:favorites";
const FAVORITES_CHANGED_EVENT = "heatflow:favorites-changed";

function readFavoriteIds() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const syncFavorites = () => setFavorites(readFavoriteIds());

    syncFavorites();
    window.addEventListener("storage", syncFavorites);
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);

    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    };
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    if (!productId || typeof window === "undefined") return;

    const currentFavorites = readFavoriteIds();
    const nextFavorites = currentFavorites.includes(productId)
      ? currentFavorites.filter((id) => id !== productId)
      : [...currentFavorites, productId];

    writeFavoriteIds(nextFavorites);
    setFavorites(nextFavorites);
  }, []);

  const isFavorite = useCallback((productId: string) => favorites.includes(productId), [favorites]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}
