/* eslint-disable @next/next/no-img-element */
// 공지 본문 렌더러 — 줄 단위로 아래 표기를 감지해 스타일을 입힌다.
//  - "#소제목" 로 시작하는 줄 → 굵은 소제목 (위에 구분선)
//  - "[LEVEL n]", "[SPECIAL]" 로 시작하는 줄 → 큰 배지 (교재 묶음 구분용, 한 단계 더 굵고 큼)
//  - "[라벨]본문" 으로 시작하는 줄 → 작은 배지 + 본문 (교재명 등 하위 태그)
//  - "☞ 안내" 로 시작하는 줄 → 강조 CTA 링크 스타일
//  - 그 외 줄 속 URL → 이미지/유튜브 임베드 또는 새 탭 링크로 자동 변환
// 첨부 이미지(imageUrls)는 본문 아래에 나열한다.
// 관리자 모달·학생 공지 상세·공개 공지 페이지에서 공용.

const URL_RE = /(https?:\/\/[^\s<>"']+)/g
const IMAGE_RE = /\.(png|jpe?g|gif|webp)(\?.*)?$/i
const HEADER_RE = /^#{1,3}\s*(.+)$/
const CTA_RE = /^☞\s*(.+)$/
const SUBHEADER_RE = /^\[(LEVEL\s*\d+|SPECIAL)\]\s*(.*)$/i
const BRACKET_RE = /^(\[[^\]]+\])(.*)$/

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

// 한 줄 안의 URL을 이미지/유튜브/링크로 치환 (캡처 그룹 split이라 홀수 인덱스가 URL)
function LineText({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <UrlPreview key={i} url={part} />
          : <span key={i}>{part}</span>,
      )}
    </>
  )
}

function NoticeLine({ line, first }: { line: string; first: boolean }) {
  if (!line.trim()) return <div className="h-3" aria-hidden />

  const header = line.match(HEADER_RE)
  if (header) {
    return (
      <p className={`font-black text-lg text-zinc-950 mb-2 ${first ? '' : 'mt-8 pt-6 border-t border-zinc-100'}`}>
        <LineText text={header[1]} />
      </p>
    )
  }

  const cta = line.match(CTA_RE)
  if (cta) {
    return (
      <p className="mt-3">
        <span className="font-bold text-emerald-600 underline underline-offset-2 decoration-emerald-300">
          ☞ <LineText text={cta[1]} />
        </span>
      </p>
    )
  }

  const subheader = line.match(SUBHEADER_RE)
  if (subheader) {
    return (
      <p className="mt-7 mb-1">
        <span className="inline-block rounded-full bg-zinc-900 text-white text-sm font-black px-3.5 py-1.5 tracking-wide">
          {subheader[1].toUpperCase()}
        </span>
        {subheader[2] && (
          <span className="ml-2 text-sm text-zinc-500 font-medium">
            <LineText text={subheader[2]} />
          </span>
        )}
      </p>
    )
  }

  const bracket = line.match(BRACKET_RE)
  if (bracket) {
    return (
      <p className="mt-2">
        <span className="inline-block rounded bg-zinc-100 text-zinc-900 text-xs font-bold px-1.5 py-0.5 mr-1.5 align-middle">
          {bracket[1].slice(1, -1)}
        </span>
        <span className="text-sm text-zinc-600"><LineText text={bracket[2]} /></span>
      </p>
    )
  }

  return <p><LineText text={line} /></p>
}

export function NoticeContent({ content, imageUrls = [] }: { content: string; imageUrls?: string[] }) {
  const lines = content.split('\n')

  return (
    <div>
      <div className="leading-relaxed">
        {lines.map((line, i) => (
          <NoticeLine key={i} line={line} first={i === 0} />
        ))}
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
