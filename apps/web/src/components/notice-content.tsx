/* eslint-disable @next/next/no-img-element */
// 공지 본문 렌더러 — 본문 속 URL을 감지해 미리보기로 바꾼다.
//  - 이미지 URL(.png/.jpg/.jpeg/.gif/.webp) → 인라인 이미지
//  - 유튜브 링크(youtube.com/watch, youtu.be, shorts) → 임베드 플레이어
//  - 그 외 URL → 새 탭 링크
// 첨부 이미지(imageUrls)는 본문 아래에 나열한다.
// 관리자 모달·학생 공지 상세·공개 공지 페이지에서 공용.

const URL_RE = /(https?:\/\/[^\s<>"']+)/g
const IMAGE_RE = /\.(png|jpe?g|gif|webp)(\?.*)?$/i

function youtubeId(url: string): string | null {
  const m =
    url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/) ??
    url.match(/youtu\.be\/([\w-]{11})/) ??
    url.match(/youtube\.com\/shorts\/([\w-]{11})/) ??
    url.match(/youtube\.com\/embed\/([\w-]{11})/)
  return m ? m[1] : null
}

function UrlPreview({ url }: { url: string }) {
  const yt = youtubeId(url)
  if (yt) {
    return (
      <span className="block my-2">
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="동영상 미리보기"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full max-w-xl rounded-xl border border-zinc-200"
        />
      </span>
    )
  }
  if (IMAGE_RE.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block my-2">
        <img src={url} alt="첨부 이미지" className="max-h-96 w-auto max-w-full rounded-xl border border-zinc-200" />
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
      {url}
    </a>
  )
}

export function NoticeContent({ content, imageUrls = [] }: { content: string; imageUrls?: string[] }) {
  const parts = content.split(URL_RE)

  return (
    <div>
      <div className="whitespace-pre-wrap leading-relaxed">
        {/* split의 캡처 그룹 특성상 홀수 인덱스가 URL (전역 정규식 .test()는 lastIndex 상태 문제로 사용 금지) */}
        {parts.map((part, i) =>
          i % 2 === 1
            ? <UrlPreview key={i} url={part} />
            : <span key={i}>{part}</span>,
        )}
      </div>

      {imageUrls.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={`첨부 이미지 ${i + 1}`}
                className="h-40 w-auto max-w-full rounded-xl border border-zinc-200 object-cover hover:opacity-90 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
