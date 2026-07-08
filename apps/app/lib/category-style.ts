// 과제 카테고리 배지 색상 — 카테고리명은 학원마다/시기마다 바뀌는 자유 텍스트라
// 특정 이름을 하드코딩하지 않고, 문자열을 해시해 고정 팔레트에서 결정적으로 색을 고른다.
// (웹 apps/web/src/lib/category-style.ts와 동일한 팔레트/로직)
const PALETTE: { bg: string; text: string }[] = [
  { bg: '#09090b', text: '#fff' },
  { bg: '#3f3f46', text: '#fff' },
  { bg: '#71717a', text: '#fff' },
  { bg: '#d4d4d8', text: '#18181b' },
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function categoryBadgeColor(category: string | null | undefined): { bg: string; text: string } {
  if (!category) return { bg: '#f4f4f5', text: '#71717a' }
  return PALETTE[hashString(category) % PALETTE.length]
}
