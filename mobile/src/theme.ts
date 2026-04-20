import { createContext, useContext } from 'react';

export const COLORS = {
  dark: {
    bg: '#08090a',
    surface: '#0f1011',
    surface2: '#191a1b',
    surface3: '#222326',
    border: 'rgba(255, 255, 255, 0.06)',
    border2: 'rgba(255, 255, 255, 0.1)',
    text: '#f7f8f8',
    text2: '#d0d6e0',
    textSub: '#8a8f98',
    textMute: '#62666d',
    accent: '#5e6ad2',
    must: '#f59e0b',
    want: '#10b981',
    someday: '#60a5fa',
  },
  light: {
    bg: '#f8f9fb',
    surface: '#ffffff',
    surface2: '#f0f2f5',
    surface3: '#e4e7eb',
    border: 'rgba(0, 0, 0, 0.06)',
    border2: 'rgba(0, 0, 0, 0.1)',
    text: '#1a1b1e',
    text2: '#2c2e33',
    textSub: '#686b73',
    textMute: '#909399',
    accent: '#4f5ccc',
    must: '#d97706',
    want: '#059669',
    someday: '#3b82f6',
  }
};

export type ThemeType = 'dark' | 'light';

export const ThemeContext = createContext<{
  theme: ThemeType;
  colors: typeof COLORS.dark;
}>({
  theme: 'dark',
  colors: COLORS.dark,
});

export function useTheme() {
  return useContext(ThemeContext);
}
