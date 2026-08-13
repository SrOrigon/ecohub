export const THEME_STORAGE_KEY = "eduhub-theme";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

