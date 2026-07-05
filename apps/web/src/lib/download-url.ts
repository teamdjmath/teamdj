// Supabase Storage 공개 URL에 download 파라미터를 붙여
// 저장 경로(UUID.ext) 대신 자료 제목으로 다운로드되게 한다.
// 외부 링크(구글 드라이브 등)는 그대로 반환.
export function materialDownloadUrl(url: string, title: string): string {
  if (!url.includes('/storage/v1/object/public/')) return url
  const base   = url.split('?')[0]
  const stored = base.split('/').pop() ?? ''
  const ext    = stored.includes('.') ? '.' + stored.split('.').pop() : ''
  const safe   = title.replace(/[/\\:*?"<>|]/g, '_').trim() || 'download'
  return `${base}?download=${encodeURIComponent(safe + ext)}`
}
