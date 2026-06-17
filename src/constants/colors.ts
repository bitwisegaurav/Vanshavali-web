export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',

  light: {
    background: '#F8F9FB',
    card: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
  },

  dark: {
    background: '#0B0B0D',
    card: '#16181D',
    border: '#2A2D35',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
  },

  alive: '#10B981',
  deceased: '#6B7280',

  violet: '#8B5CF6',
  indigo: '#6366F1',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  emerald: '#10B981',
  teal: '#14B8A6',
  amber: '#F59E0B',
  orange: '#F97316',
  pink: '#EC4899',
  rose: '#F43F5E',
  red: '#EF4444',

  memberColors: [
    '#6366F1',
    '#7C3AED',
    '#8B5CF6',
    '#4F46E5',
    '#06B6D4',
    '#EC4899',
    '#10B981',
    '#F59E0B',
    '#14B8A6',
    '#3B82F6',
  ],
} as const;

export function getMemberColor(id: string): string {
  const hash = id
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS.memberColors[hash % COLORS.memberColors.length];
}

export function getTheme(isDark: boolean) {
  return isDark ? COLORS.dark : COLORS.light;
}
