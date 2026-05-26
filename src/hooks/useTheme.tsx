import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'classic' | 'midnight' | 'champagne' | 'obsidian' | 'emerald' | 'navy' | 'rose';

const DARK_THEMES = new Set<Theme>(['midnight', 'obsidian', 'emerald', 'navy']);
const ALL_THEME_CLASSES = ['theme-classic','theme-midnight','theme-champagne','theme-obsidian','theme-emerald','theme-navy','theme-rose'];

export interface ThemeConfig {
  id: Theme;
  name: string;
  desc: string;
  accent: string;
  bg: string;
  dark: boolean;
}

export const THEMES: ThemeConfig[] = [
  { id: 'classic',   name: 'Classic',       desc: 'Clean white, timeless',         accent: '#a41e1e', bg: '#ffffff', dark: false },
  { id: 'midnight',  name: 'Midnight',      desc: 'Dark charcoal, elegant',        accent: '#cc4444', bg: '#0f0f0f', dark: true  },
  { id: 'champagne', name: 'Champagne',     desc: 'Warm ivory & gold',             accent: '#a07828', bg: '#f8f5ee', dark: false },
  { id: 'obsidian',  name: 'Obsidian',      desc: 'Deep slate & electric blue',    accent: '#4488ff', bg: '#0e0f18', dark: true  },
  { id: 'emerald',   name: 'Emerald Vault', desc: 'Forest green & gold',           accent: '#22c55e', bg: '#070f09', dark: true  },
  { id: 'navy',      name: 'Royal Navy',    desc: 'Navy & champagne gold',         accent: '#c9a84c', bg: '#060d1f', dark: true  },
  { id: 'rose',      name: 'Rose Quartz',   desc: 'Blush tones, refined',          accent: '#d63a6a', bg: '#fef7f8', dark: false },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'classic',
  setTheme: () => {},
  toggle: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('hou-theme');
    if (stored === 'light') return 'classic';
    if (stored === 'dark') return 'midnight';
    if (stored && THEMES.some(t => t.id === stored)) return stored as Theme;
    return 'classic';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...ALL_THEME_CLASSES, 'dark');
    if (theme !== 'classic') root.classList.add(`theme-${theme}`);
    if (DARK_THEMES.has(theme)) root.classList.add('dark');
    localStorage.setItem('hou-theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState(prev => DARK_THEMES.has(prev) ? 'classic' : 'midnight');
  const isDark = DARK_THEMES.has(theme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
