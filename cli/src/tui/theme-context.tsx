import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  THEMES,
  iris,
  loadSettings,
  saveThemeName,
  themeByName,
  type Theme,
} from "./theme.js";

interface ThemeContextValue {
  theme: Theme;
  /** Select a theme by name and persist the choice. */
  setTheme: (name: string) => void;
  /** Advance to the next theme in the list (wraps). */
  cycle: () => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: iris,
  setTheme: () => {},
  cycle: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState(() => loadSettings().theme ?? iris.name);

  const setTheme = useCallback((next: string) => {
    setName(next);
    saveThemeName(next);
  }, []);

  const cycle = useCallback(() => {
    setName((cur) => {
      const idx = THEMES.findIndex((t) => t.name === cur);
      const next = THEMES[(idx + 1) % THEMES.length].name;
      saveThemeName(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themeByName(name), setTheme, cycle, themes: THEMES }),
    [name, setTheme, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeControls(): ThemeContextValue {
  return useContext(ThemeContext);
}
