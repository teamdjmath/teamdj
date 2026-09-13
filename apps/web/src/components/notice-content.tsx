/* eslint-disable @next/next/no-img-element */
// 공지 본문 렌더러 — 줄 단위로 아래 표기를 감지해 스타일을 입힌다.
//  - "#소제목" 로 시작하는 줄 → 굵은 소제목 (위에 구분선)
//  - "[LEVEL n]", "[SPECIAL]" 로 시작하는 줄 → 큰 배지 (교재 묶음 구분용, 한 단계 더 굵고 큼)
//  - "[라벨]본문" 으로 시작하는 줄 → 작은 배지 + 본문 (교재명 등 하위 태그)
//  - "☞ 안내" 로 시작하는 줄 → 강조 CTA 링크 스타일
//  - "▶제목|부제|URL" 로 시작하는 줄 → 카드형 버튼 (제목/부제 + 검은 카드 + 흰 버튼)
//  - "|셀1|셀2|..." 로 시작·끝나는 연속된 줄 → 표 (첫 줄이 헤더, 그 다음부터 내용 행)
//  - 문장 중간의 "==강조할 텍스트==" → 노란 형광펜 강조
//  - 그 외 줄 속 URL → 이미지/유튜브 임베드 또는 새 탭 링크로 자동 변환
// 첨부 이미지(imageUrls)는 본문 아래에 나열한다.
// 관리자 모달·학생 공지 상세·공개 공지 페이지에서 공용.

const URL_RE = /(https?:\/\/[^\s<>"']+)/g
const IMAGE_RE = /\.(png|jpe?g|gif|webp)(\?.*)?$/i
const HEADER_RE = /^#{1,3}\s*(.+)$/
const CTA_RE = /^☞\s*(.+)$/
const LINKCARD_RE = /^▶\s*(.+)$/
const SUBHEADER_RE = /^\[(LEVEL\s*\d+|SPECIAL)\]\s*(.*)$/i
const BRACKET_RE = /^(\[[^\]]+\])(.*)$/
const TABLE_ROW_RE = /^\|(.+)\|\s*$/
const HIGHLIGHT_RE = /==(.+?)==/g

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
          className="aspect-video w-full max-w-xl rounded-xl border border-zinc-200 dark:border-zinc-800"
        />
      </span>
    )
  }
  if (IMAGE_RE.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block my-2">
        <img src={url} alt="첨부 이미지" className="max-h-96 w-auto max-w-full rounded-xl border border-zinc-200 dark:border-zinc-800" />
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline break-all">
      {url}
    </a>
  )
}

// "==강조==" 를 노란 형광펜 강조로 치환 (URL이 아닌 일반 텍스트 구간에서만 동작)
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(HIGHLIGHT_RE)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <mark key={i} className="rounded bg-yellow-200 dark:bg-yellow-900/60 text-inherit px-0.5">{part}</mark>
          : <span key={i}>{part}</span>,
      )}
    </>
  )
}

// 한 줄 안의 URL을 이미지/유튜브/링크로 치환하고 (캡처 그룹 split이라 홀수 인덱스가 URL),
// URL이 아닌 구간은 다시 형광펜 강조(==...==) 처리를 적용한다.
function LineText({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <UrlPreview key={i} url={part} />
          : <HighlightedText key={i} text={part} />,
      )}
    </>
  )
}

function NoticeLine({ line, first }: { line: string; first: boolean }) {
  if (!line.trim()) return <div className="h-3" aria-hidden />

  const header = line.match(HEADER_RE)
  if (header) {
    return (
      <p className={`font-black text-lg text-zinc-950 dark:text-zinc-50 mb-2 ${first ? '' : 'mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-900'}`}>
        <LineText text={header[1]} />
      </p>
    )
  }

  const linkCard = line.match(LINKCARD_RE)
  if (linkCard) {
    const parts = linkCard[1].split('|').map((p) => p.trim())
    const url = parts.find((p) => /^https?:\/\//.test(p)) ?? ''
    const [title, subtitle, label] = parts.filter((p) => p !== url)
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 px-5 py-4 hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
      >
        <div>
          {title && <p className="font-bold text-white text-[15px]">{title}</p>}
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-zinc-900 text-sm font-bold px-4 py-2 whitespace-nowrap">
          {label || '확인하기'} <span aria-hidden>→</span>
        </span>
      </a>
    )
  }

  const cta = line.match(CTA_RE)
  if (cta) {
    return (
      <p className="mt-3">
        <span className="font-bold text-emerald-600 dark:text-emerald-400 underline underline-offset-2 decoration-emerald-300 dark:decoration-emerald-700">
          ☞ <LineText text={cta[1]} />
        </span>
      </p>
    )
  }

  const subheader = line.match(SUBHEADER_RE)
  if (subheader) {
    return (
      <p className="mt-7 mb-1">
        <span className="inline-block rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-black px-3.5 py-1.5 tracking-wide">
          {subheader[1].toUpperCase()}
        </span>
        {subheader[2] && (
          <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-500 font-medium">
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
        <span className="inline-block rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-bold px-1.5 py-0.5 mr-1.5 align-middle">
          {bracket[1].slice(1, -1)}
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400"><LineText text={bracket[2]} /></span>
      </p>
    )
  }

  return <p className="text-zinc-900 dark:text-zinc-100"><LineText text={line} /></p>
}

function NoticeTable({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-900">
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-bold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 whitespace-nowrap"
              >
                <LineText text={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                  <LineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type ContentBlock =
  | { type: 'line'; text: string; first: boolean }
  | { type: 'table'; rows: string[][] }

// 줄 배열을 훑어 연속된 "|셀|셀|" 줄들을 표 하나로 묶는다. 나머지 줄은 그대로 개별 처리한다.
function groupBlocks(lines: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = []
  let i = 0
  while (i < lines.length) {
    const match = lines[i].match(TABLE_ROW_RE)
    if (match) {
      const rows: string[][] = []
      while (i < lines.length) {
        const rowMatch = lines[i].match(TABLE_ROW_RE)
        if (!rowMatch) break
        rows.push(rowMatch[1].split('|').map((cell) => cell.trim()))
        i++
      }
      blocks.push({ type: 'table', rows })
      continue
    }
    blocks.push({ type: 'line', text: lines[i], first: i === 0 })
    i++
  }
  return blocks
}

export function NoticeContent({ content, imageUrls = [] }: { content: string; imageUrls?: string[] }) {
  const blocks = groupBlocks(content.split('\n'))

  return (
    <div>
      <div className="leading-relaxed">
        {blocks.map((block, i) =>
          block.type === 'table'
            ? <NoticeTable key={i} rows={block.rows} />
            : <NoticeLine key={i} line={block.text} first={block.first} />,
        )}
      </div>

      {imageUrls.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={`첨부 이미지 ${i + 1}`}
                className="h-40 w-auto max-w-full rounded-xl border border-zinc-200 dark:border-zinc-800 object-cover hover:opacity-90 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
