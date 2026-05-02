// TeamDJ 디자인 토큰 — 흑백 모노톤
export const colors = {
  white: '#ffffff',
  black: '#0a0a0a',

  zinc: {
    50:  '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // 시맨틱 토큰
  text: {
    primary:   '#0a0a0a',
    secondary: '#52525b',
    muted:     '#a1a1aa',
    inverse:   '#ffffff',
  },

  bg: {
    page:    '#fafafa',
    card:    '#ffffff',
    subtle:  '#f4f4f5',
    overlay: 'rgba(0,0,0,0.04)',
  },

  border: {
    default: '#e4e4e7',
    strong:  '#d4d4d8',
  },

  // 상태 컬러 (최소한)
  error: '#ef4444',
  success: '#22c55e',
} as const
