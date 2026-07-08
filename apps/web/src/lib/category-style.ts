// 과제 카테고리 배지 색상 — 카테고리명은 학원마다/시기마다 바뀌는 자유 텍스트(assignment_categories)라
// 특정 이름을 하드코딩하지 않고, 문자열을 해시해 고정 팔레트에서 결정적으로 색을 고른다.
const PALETTE = [
  'bg-zinc-950 text-white',
  'bg-zinc-700 text-white',
  'bg-zinc-500 text-white',
  'bg-zinc-300 text-zinc-900',
] as const

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function categoryBadgeStyle(category: string | null | undefined): string {
  if (!category) return 'bg-zinc-100 text-zinc-500'
  return PALETTE[hashString(category) % PALETTE.length]
}
