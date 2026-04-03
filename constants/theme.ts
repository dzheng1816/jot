export const theme = {
  colors: {
    background: '#FFF0E8',
    card: '#FFFFFF',
    textPrimary: '#1A1A2E',
    textSecondary: '#999999',
    accent: '#7C6BF0',
    accentLight: '#F0EEFF',
    priorityHigh: '#EF4444',
    priorityMed: '#F59E0B',
    priorityLow: '#22C55E',
    danger: '#EF4444',
    border: '#F0F0F0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
  },
  radius: {
    card: 12,
    composer: 16,
    pill: 20,
    chip: 20,
  },
  typography: {
    title: { fontSize: 28, fontWeight: '700' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    bodySmall: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 11, fontWeight: '400' as const },
    captionBold: { fontSize: 11, fontWeight: '600' as const },
    label: { fontSize: 12, fontWeight: '500' as const },
  },
} as const;

export const priorityColor = (priority: string): string | null => {
  switch (priority) {
    case 'high':
      return theme.colors.priorityHigh;
    case 'medium':
      return theme.colors.priorityMed;
    case 'low':
      return theme.colors.priorityLow;
    default:
      return null;
  }
};
