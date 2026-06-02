"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const storageKey = "heatflow-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey) as Theme | null;
    const initialTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="grid size-10 place-items-center rounded-md border border-black/10 bg-black/5 text-lg transition hover:bg-black/10 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem(storageKey, nextTheme);
      }}
      type="button"
    >
      <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
