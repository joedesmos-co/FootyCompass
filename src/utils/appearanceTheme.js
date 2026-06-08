import {
  DEFAULT_APPEARANCE_THEME,
  VALID_APPEARANCE_THEME_IDS,
} from '../data/appearanceThemes';

const STORAGE_KEY = 'footybrain:preferences';

const THEME_COLOR_META = {
  'dark-pitch': '#07110d',
  'oled-dark': '#020403',
  emerald: '#0a1812',
  'matchday-light': '#e8f0ec',
};

export function resolveAppearanceTheme(themeId) {
  const id = String(themeId ?? '').trim();
  return VALID_APPEARANCE_THEME_IDS.has(id) ? id : DEFAULT_APPEARANCE_THEME;
}

export function applyAppearanceTheme(themeId) {
  if (typeof document === 'undefined') return;
  const theme = resolveAppearanceTheme(themeId);
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', THEME_COLOR_META[theme] ?? THEME_COLOR_META[DEFAULT_APPEARANCE_THEME]);
  }
}

export function readAppearanceThemeFromStorage() {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE_THEME;
    const parsed = JSON.parse(raw);
    return resolveAppearanceTheme(parsed?.appearanceTheme);
  } catch {
    return DEFAULT_APPEARANCE_THEME;
  }
}

export function initAppearanceThemeFromStorage() {
  applyAppearanceTheme(readAppearanceThemeFromStorage());
}
