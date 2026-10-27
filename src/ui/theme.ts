export const colors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F6',
  border: '#DCE3EA',
  text: '#0F1C2E',
  textMuted: '#5B6B7F',
  primary: '#0B5FFF',
  primaryText: '#FFFFFF',
  primaryMuted: '#E5EEFF',
  success: '#0E7C4A',
  successMuted: '#E3F5EC',
  warning: '#9A5B00',
  warningMuted: '#FFF3DC',
  danger: '#C2261D',
  dangerMuted: '#FDE8E7',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const type = {
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
  figure: { fontSize: 32, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
} as const;
