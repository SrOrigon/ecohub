"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { isTheme, THEME_STORAGE_KEY, type ResolvedTheme, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
}

const subscribe = () => () => {};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === "system") return getSystemTheme();
    return theme;
  });

  const updateAppliedTheme = useCallback((newTheme: Theme) => {
    const actual = newTheme === "system" ? getSystemTheme() : newTheme;
    setResolvedTheme(actual);
    applyThemeClass(actual);
  }, []);

  useEffect(() => {
    updateAppliedTheme(theme);

    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      updateAppliedTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, updateAppliedTheme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      updateAppliedTheme(next);
    },
    [updateAppliedTheme]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      let next: Theme;
      if (current === "system") next = "light";
      else if (current === "light") next = "dark";
      else next = "system";

      localStorage.setItem(THEME_STORAGE_KEY, next);
      updateAppliedTheme(next);
      return next;
    });
  }, [updateAppliedTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, mounted }),
    [theme, resolvedTheme, setTheme, toggleTheme, mounted]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return ctx;
}

