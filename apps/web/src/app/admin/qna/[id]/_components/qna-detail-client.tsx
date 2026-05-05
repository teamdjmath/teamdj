'use client'

import 'katex/dist/katex.min.css'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useCallback } from 'react'
import { assignQuestion, submitAnswer, generateAiDraft } from '@/lib/actions/qna'

type Question = {
  id: string
  content: string
  image_urls: string[]
  status: 'open' | 'in_progress' | 'answered'
  assigned_ta_id: string | null
  created_at: string
  studentName: string
  className: string | null
  assignedTaName: string | null
}

type Answer = {
  id: string
  content: string
  media_urls: string[]
  is_ai_draft: boolean
  answered_at: string
  taName: string
}

interface Props {
  question: Question
  answers: Answer[]
  currentUserId: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '미답변',
  in_progress: '답변중',
  answered: '답변완료',
}
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-red-50 text-red-600',
  in_progress: 'bg-zinc-900 text-white',
  answered: 'bg-zinc-100 text-zinc-500',
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// KaTeX 미리보기 렌더링
function renderPreview(text: string): string {
  let html = ''
  // Display math: $$...$$
  const displayParts = text.split(/\$\$([^$]+)\$\$/)
  for (let i = 0; i < displayParts.length; i++) {
    if (i % 2 === 1) {
      try {
        // Dynamic import is not possible in sync context - use a data-math attribute approach
        html += `<span class="katex-display-placeholder block text-center my-2 p-2 bg-zinc-50 rounded font-mono text-sm">$$${displayParts[i]}$$</span>`
      } catch {
        html += `$$${displayParts[i]}$$`
      }
    } else {
      // Inline math: $...$
      const inlineParts = displayParts[i].split(/\$([^$\n]+)\$/)
      for (let j = 0; j < inlineParts.length; j++) {
        if (j % 2 === 1) {
          html += `<span class="katex-placeholder font-mono bg-zinc-100 px-1 rounded text-sm">$${inlineParts[j]}$</span>`
        } else {
          html += inlineParts[j]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="bg-zinc-100 px-1 rounded text-xs font-mono">$1</code>')
        }
      }
    }
  }
  return html
}

// KaTeX 실제 렌더링 (클라이언트에서만)
async function renderWithKatex(text: string): Promise<string> {
  const katex = (await import('katex')).default
  let html = ''
  const displayParts = text.split(/\$\$([^$]+)\$\$/)
  for (let i = 0; i < displayParts.length; i++) {
    if (i % 2 === 1) {
      try {
        html += `<div class="overflow-x-auto py-2 text-center">${katex.renderToString(displayParts[i].trim(), { displayMode: true, throwOnError: false })}</div>`
      } catch {
        html += `<code class="text-red-500">$$${displayParts[i]}$$</code>`
      }
    } else {
      const inlineParts = displayParts[i].split(/\$([^$\n]+)\$/)
      for (let j = 0; j < inlineParts.length; j++) {
        if (j % 2 === 1) {
          try {
            html += katex.renderToString(inlineParts[j].trim(), { throwOnError: false })
          } catch {
            html += `<code class="text-red-500">$${inlineParts[j]}$</code>`
          }
        } else {
          html += inlineParts[j]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="bg-zinc-100 px-1 rounded text-xs font-mono">$1</code>')
        }
      }
    }
  }
  return html
}

export function QnaDetailClient({ question, answers, currentUserId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errMsg, setErrMsg] = useState('')

  // Editor state
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [content, setContent] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaInput, setMediaInput] = useState('')
  const [isAiDraft, setIsAiDraft] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiErr, setAiErr] = useState('')

  const isAssigned = question.assigned_ta_id === currentUserId
  const canAnswer = question.status !== 'answered'

  // Preview tab: render with KaTeX
  const handleTabChange = useCallback(
    async (t: 'write' | 'preview') => {
      setTab(t)
      if (t === 'preview') {
        const html = await renderWithKatex(content)
        setPreviewHtml(html)
      }
    },
    [content],
  )

  function addMediaUrl() {
    const url = mediaInput.trim()
    if (!url) return
    setMediaUrls((prev) => [...prev, url])
    setMediaInput('')
  }

  function removeMediaUrl(i: number) {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleAssign() {
    setErrMsg('')
    startTransition(async () => {
      const res = await assignQuestion(question.id)
      if (res.error) setErrMsg(res.error)
      else router.refresh()
    })
  }

  async function handleAiDraft() {
    setAiErr('')
    setAiLoading(true)
    const res = await generateAiDraft(question.content, question.image_urls)
    setAiLoading(false)
    if (res.error) { setAiErr(res.error); return }
    
    if (res.draft) setContent(res.draft)
    if (res.mediaUrls && res.mediaUrls.length > 0) {
      setMediaUrls((prev) => [...new Set([...prev, ...res.mediaUrls!])])
    }
    
    setIsAiDraft(true)
    setTab('write')
  }

  function handleSubmit() {
    if (!content.trim()) { setErrMsg('답변 내용을 입력하세요.'); return }
    setErrMsg('')
    startTransition(async () => {
      const res = await submitAnswer({
        questionId: question.id,
        content: content.trim(),
        mediaUrls,
        isAiDraft,
      })
      if (res.error) { setErrMsg(res.error); return }
      setContent('')
      setMediaUrls([])
      setIsAiDraft(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* 질문 카드 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[question.status]}`}>
              {STATUS_LABEL[question.status]}
            </span>
            <span className="text-xs text-zinc-400">{formatDatetime(question.created_at)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {question.assignedTaName ? (
              <span>담당: <strong className="text-zinc-800">{question.assignedTaName}</strong></span>
            ) : (
              <span className="text-zinc-400">담당 조교 없음</span>
            )}
            {canAnswer && !isAssigned && (
              <button
                onClick={handleAssign}
                disabled={pending}
                className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                내가 담당하기
              </button>
            )}
          </div>
        </div>

        {/* 질문 내용 */}
        <div className="whitespace-pre-wrap text-sm text-zinc-800 leading-relaxed">{question.content}</div>

        {/* 첨부 이미지 */}
        {question.image_urls.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {question.image_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`첨부 이미지 ${i + 1}`}
                  className="h-32 w-auto rounded-lg border border-zinc-200 object-cover hover:opacity-80 transition-opacity"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 기존 답변 로그 */}
      {answers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500">답변 기록 ({answers.length})</h2>
          {answers.map((a) => (
            <div key={a.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-800">{a.taName}</span>
                <span className="text-xs text-zinc-400">{formatDatetime(a.answered_at)}</span>
                {a.is_ai_draft && (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                    AI 초안
                  </span>
                )}
              </div>
              <div
                className="text-sm text-zinc-700 leading-relaxed katex-answer-content"
                dangerouslySetInnerHTML={{ __html: renderPreview(a.content) }}
              />
              {a.media_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.media_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-300 transition-colors"
                    >
                      미디어 {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 답변 작성 에디터 (미답변/답변중 상태에서만) */}
      {canAnswer && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              {answers.length > 0 ? '추가 답변 작성' : '답변 작성'}
            </h2>
            <div className="flex items-center gap-2">
              {isAiDraft && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">AI 초안 적용됨</span>
              )}
              <button
                onClick={handleAiDraft}
                disabled={aiLoading}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    생성 중...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI 초안
                  </>
                )}
              </button>
            </div>
          </div>

          {aiErr && <p className="mb-3 text-xs text-red-500">{aiErr}</p>}

          {/* 탭 */}
          <div className="mb-3 flex border-b border-zinc-100">
            {(['write', 'preview'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={[
                  'px-4 py-2 text-sm transition-colors -mb-px border-b-2',
                  tab === t
                    ? 'border-zinc-950 text-zinc-950 font-medium'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700',
                ].join(' ')}
              >
                {t === 'write' ? '입력' : '미리보기'}
              </button>
            ))}
          </div>

          {/* 에디터 / 미리보기 */}
          {tab === 'write' ? (
            <textarea
              rows={12}
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsAiDraft(false) }}
              placeholder={`답변 내용을 입력하세요.\n\n마크다운: **굵게**, *기울임*, \`코드\`\nLaTeX 수식: $x^2 + y^2 = z^2$ (인라인), $$\\frac{a}{b}$$ (블록)\n미디어 URL: 아래 첨부 입력란 사용`}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-4 font-mono text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all shadow-sm"
            />
          ) : (
            <div
              className="min-h-[280px] rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm leading-relaxed text-zinc-900 shadow-sm"
              dangerouslySetInnerHTML={{ __html: previewHtml || '<span class="text-zinc-400 italic">미리보기가 없습니다.</span>' }}
            />
          )}

          {/* 미디어 URL 첨부 */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">이미지 / 동영상 URL 첨부</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={mediaInput}
                onChange={(e) => setMediaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMediaUrl() } }}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all"
              />
              <button
                onClick={addMediaUrl}
                type="button"
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-all active:scale-95"
              >
                추가
              </button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm">
                    <span className="max-w-[250px] truncate">{url}</span>
                    <button onClick={() => removeMediaUrl(i)} className="text-zinc-400 hover:text-white transition-colors">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 제출 */}
          {errMsg && <p className="mt-3 text-sm text-red-500 font-medium">{errMsg}</p>}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={pending || !content.trim()}
              className="group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-xl bg-zinc-950 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 active:scale-95 shadow-lg shadow-zinc-200"
            >
              {pending ? (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  제출 중...
                </div>
              ) : (
                '답변 제출하기'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 답변 완료 메시지 */}
      {question.status === 'answered' && answers.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-500 text-center">
          답변이 완료된 질문입니다.
        </div>
      )}
    </div>
  )
}
