export const APPEARANCE_THEMES = [
  {
    id: 'dark-pitch',
    label: 'Dark Pitch',
    hint: 'Default look — balanced greens and contrast.',
  },
  {
    id: 'oled-dark',
    label: 'OLED Dark',
    hint: 'Deeper blacks for OLED and low-glare nights.',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    hint: 'Brighter pitch greens with a livelier feel.',
  },
];

export const DEFAULT_APPEARANCE_THEME = 'dark-pitch';

export const VALID_APPEARANCE_THEME_IDS = new Set(APPEARANCE_THEMES.map((t) => t.id));
