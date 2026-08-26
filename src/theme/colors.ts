export const colors = {
  background: '#FFFCF8',
  surface: '#FFFDFB',
  surfaceWarm: '#FFF9F5',
  textPrimary: '#29272C',
  textSecondary: '#77737D',
  textTertiary: '#AAA5AD',
  border: '#EEE9E5',
  borderSoft: '#F5F0EC',

  coralPrimary: '#FF7D6C',
  coralStrong: '#FF7D6C',
  coralSoft: '#FFB4A7',
  coralWhisper: '#FFF0EC',
  peachPastel: '#FBE8DE',
  peachWhisper: '#FFF3ED',
  blush: '#F5E3E8',
  blushSoft: '#FFF2F5',
  lavender: '#EAE5F2',
  lavenderSoft: '#F7F2FC',
  butter: '#FFF2CB',
  butterSoft: '#FFF8E7',
  sage: '#E5EEE8',
  sageSoft: '#F3F8EE',
  mint: '#DDEEEA',
  mintSoft: '#F1F7F5',
  powder: '#E5EDF0',
  oat: '#F3EEE6',
  cream: '#FFF4DF',

  coral: '#FF7D6C',
  coralLight: '#FF7D6C',
  text: '#29272C',
  muted: '#77737D',
  success: '#4F8669',
  warning: '#A97728',
  danger: '#B94E58',
  onStrong: '#FFFFFF',
  warmShadow: '#715950',
  backdrop: 'rgba(41,39,44,0.34)',
  navSurface: 'rgba(255,253,251,0.97)',
} as const;

export type CategoryColorFamily = {
  surfaceSoft: string;
  surface: string;
  accent: string;
  strong: string;
  onSurface: string;
};

export const categoryColors = {
  work: {
    surfaceSoft: '#E7EDEF',
    surface: '#A9BBC4',
    accent: '#6F8995',
    strong: '#465F69',
    onSurface: '#26363D',
  },
  life: {
    surfaceSoft: '#F4E7EB',
    surface: '#D2A4B3',
    accent: '#AD6F84',
    strong: '#714455',
    onSurface: '#3B2830',
  },
  health: {
    surfaceSoft: '#E7EEE6',
    surface: '#A3BCA5',
    accent: '#6F9272',
    strong: '#49674C',
    onSurface: '#29372B',
  },
  money: {
    surfaceSoft: '#F5E9E0',
    surface: '#DAAC8E',
    accent: '#B87753',
    strong: '#78503A',
    onSurface: '#3D2D24',
  },
  growth: {
    surfaceSoft: '#ECE8F2',
    surface: '#B9A9CF',
    accent: '#8875A7',
    strong: '#5B4B72',
    onSurface: '#332B3B',
  },
  quick: {
    surfaceSoft: '#EBF4F1',
    surface: '#CFE4DF',
    accent: '#68A69A',
    strong: '#3F6C64',
    onSurface: '#263B37',
  },
} as const satisfies Record<string, CategoryColorFamily>;

export const neutralCategoryColors: CategoryColorFamily = {
  surfaceSoft: '#F5F2F0',
  surface: '#E6E1DE',
  accent: '#8B817C',
  strong: '#5A514D',
  onSurface: '#302B29',
};

export const categoryNames = {
  work: 'Work',
  life: 'Life',
  health: 'Health',
  money: 'Money',
  growth: 'Growth',
  quick: 'Quick',
} as const;

export type CategoryColorKey = keyof typeof categoryColors;

const CATEGORY_ALIASES: Record<string, CategoryColorKey> = {
  personal: 'life',
  creative: 'growth',
};

export function getCategoryColors(category?: string | null): CategoryColorFamily {
  if (!category) return neutralCategoryColors;
  const normalized = category.toLowerCase();
  const key = (Object.prototype.hasOwnProperty.call(categoryColors, normalized)
    ? normalized
    : CATEGORY_ALIASES[normalized]) as CategoryColorKey | undefined;
  return key ? categoryColors[key] : neutralCategoryColors;
}

export function getCategoryName(category?: string | null): string {
  if (!category) return 'Other';
  const normalized = category.toLowerCase();
  const key = (Object.prototype.hasOwnProperty.call(categoryNames, normalized)
    ? normalized
    : CATEGORY_ALIASES[normalized]) as CategoryColorKey | undefined;
  return key ? categoryNames[key] : 'Other';
}
