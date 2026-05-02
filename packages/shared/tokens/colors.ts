export const colors = {
  primary: '#000000',
  secondary: '#ffffff',
  accent: '#000000',
  background: '#f9f9f9',
  surface: '#ffffff',
  border: '#e5e5e5',
  text: {
    primary: '#111111',
    secondary: '#555555',
    disabled: '#aaaaaa',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const
// TODO: 가독성 개선 필요
// - 테이블 빈 상태 텍스트: 너무 연함
// - 카드 통계 숫자: 더 강조 필요
// - 전반적인 텍스트 대비 높여야 함