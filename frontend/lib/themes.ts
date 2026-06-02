export type ThemeId =
  | "theme-default"
  | "theme-rose-pine"
  | "theme-gruvbox"
  | "theme-light"
  | "theme-rose-pine-dawn";

export interface Theme {
  id: ThemeId;
  name: string;
  label: string;
  mode: "dark" | "light";
  preview: {
    bg: string;
    card: string;
    primary: string;
    border: string;
    text: string;
  };
}

export const themes: Theme[] = [
  {
    id: "theme-default",
    name: "Deep Dark",
    label: "Dark",
    mode: "dark",
    preview: {
      bg: "#09090b",
      card: "#18181b",
      primary: "#22c55e",
      border: "#27272a",
      text: "#fafafa",
    },
  },
  {
    id: "theme-rose-pine",
    name: "Rose Pine",
    label: "Dusk",
    mode: "dark",
    preview: {
      bg: "#191724",
      card: "#1f1d2e",
      primary: "#9ccfd8",
      border: "#393552",
      text: "#e0def4",
    },
  },
  {
    id: "theme-gruvbox",
    name: "Gruvbox",
    label: "Warm",
    mode: "dark",
    preview: {
      bg: "#282828",
      card: "#32302f",
      primary: "#98971a",
      border: "#504945",
      text: "#ebdbb2",
    },
  },
  {
    id: "theme-light",
    name: "Light",
    label: "Light",
    mode: "light",
    preview: {
      bg: "#fafafa",
      card: "#ffffff",
      primary: "#16a34a",
      border: "#e4e4e7",
      text: "#09090b",
    },
  },
  {
    id: "theme-rose-pine-dawn",
    name: "Rose Pine Dawn",
    label: "Dawn",
    mode: "light",
    preview: {
      bg: "#faf4ed",
      card: "#fffaf3",
      primary: "#286983",
      border: "#dfdad9",
      text: "#575279",
    },
  },
];

export function getThemeFromCookie(value: string | undefined): ThemeId {
  if (value && themes.some((t) => t.id === value)) {
    return value as ThemeId;
  }
  return "theme-default";
}
