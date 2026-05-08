'use client'

import 'katex/dist/katex.min.css'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { assignQuestion, submitAnswer, generateAiDraft, updateAnswer, cancelAnswer } from '@/lib/actions/qna'

type Question = {
  id: string
  title: string
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
  answered_at: string
  taId: string
  taName: string
}

interface Props {
  question: Question
  answers: Answer[]
  currentUserId: string
  currentUserName: string
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

const mdPlugins = { remark: [remarkMath], rehype: [rehypeKatex] }

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function AnswerEditor({
  content, onContentChange,
  mediaUrls, mediaInput, onMediaInputChange, onAddMedia, onRemoveMedia,
  tab, onTabChange,
  aiLoading, aiErr, onAiDraft,
  errMsg, onSubmit, submitLabel, isPending, onCancel,
}: {
  content: string
  onContentChange: (v: string) => void
  mediaUrls: string[]
  mediaInput: string
  onMediaInputChange: (v: string) => void
  onAddMedia: () => void
  onRemoveMedia: (i: number) => void
  tab: 'write' | 'preview'
  onTabChange: (t: 'write' | 'preview') => void
  aiLoading?: boolean
  aiErr?: string
  onAiDraft?: () => void
  errMsg: string
  onSubmit: () => void
  submitLabel: string
  isPending: boolean
  onCancel?: () => void
}) {
  return (
    <div className="space-y-3">
      {/* 탭 + AI 버튼 */}
      <div className="flex items-center justify-between border-b border-zinc-100">
        <div className="flex">
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              className={[
                'px-4 py-2 text-sm transition-colors border-b-2 -mb-px',
                tab === t
                  ? 'border-zinc-950 text-zinc-950 font-medium'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700',
              ].join(' ')}
            >
              {t === 'write' ? '입력' : '미리보기'}
            </button>
          ))}
        </div>
        {onAiDraft && (
          <button
            type="button"
            onClick={onAiDraft}
            disabled={aiLoading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 mb-1"
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
        )}
      </div>

      {aiErr && <p className="text-xs text-red-500">{aiErr}</p>}

      {tab === 'write' ? (
        <textarea
          rows={12}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={`답변 내용을 입력하세요.\n\n마크다운: **굵게**, *기울임*, \`코드\`, - 목록\nLaTeX 수식: $x^2$ (인라인), $$\\frac{a}{b}$$ (블록)`}
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all"
        />
      ) : (
        <div className="min-h-[280px] rounded-xl border border-zinc-200 bg-white px-5 py-4">
          {content.trim() ? (
            <div className="prose prose-sm prose-zinc max-w-none text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={mdPlugins.remark} rehypePlugins={mdPlugins.rehype}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm italic text-zinc-400">미리보기가 없습니다.</p>
          )}
        </div>
      )}

      {/* 미디어 URL */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-400">이미지 / 동영상 URL 첨부</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={mediaInput}
            onChange={(e) => onMediaInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddMedia() } }}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all"
          />
          <button type="button" onClick={onAddMedia}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-all">
            추가
          </button>
        </div>
        {mediaUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {mediaUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white">
                <span className="max-w-[200px] truncate">{url}</span>
                <button type="button" onClick={() => onRemoveMedia(i)} className="text-zinc-400 hover:text-white transition-colors">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {errMsg && <p className="text-sm text-red-500 font-medium">{errMsg}</p>}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isPending}
            className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50">
            취소
          </button>
        )}
        <button type="button" onClick={onSubmit} disabled={isPending || !content.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors">
          {isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              처리 중...
            </>
          ) : submitLabel}
        </button>
      </div>
    </div>
  )
}

export function QnaDetailClient({ question, answers, currentUserId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errMsg, setErrMsg] = useState('')

  const [content, setContent] = useState('')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaInput, setMediaInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiErr, setAiErr] = useState('')

  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTab, setEditTab] = useState<'write' | 'preview'>('write')
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>([])
  const [editMediaInput, setEditMediaInput] = useState('')
  const [editErr, setEditErr] = useState('')

  const isAssigned = question.assigned_ta_id === currentUserId
  const canAnswer = question.status !== 'answered'

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
    if (res.mediaUrls?.length) setMediaUrls((prev) => [...new Set([...prev, ...res.mediaUrls!])])
  }

  function handleSubmit() {
    if (!content.trim()) { setErrMsg('답변 내용을 입력하세요.'); return }
    setErrMsg('')
    startTransition(async () => {
      const res = await submitAnswer({ questionId: question.id, content: content.trim(), mediaUrls, isAiDraft: false })
      if (res.error) { setErrMsg(res.error); return }
      setContent('')
      setMediaUrls([])
      router.refresh()
    })
  }

  function startEdit(a: Answer) {
    setEditingAnswerId(a.id)
    setEditContent(a.content)
    setEditMediaUrls([...a.media_urls])
    setEditMediaInput('')
    setEditTab('write')
    setEditErr('')
  }

  function handleUpdateAnswer() {
    if (!editingAnswerId) return
    if (!editContent.trim()) { setEditErr('답변 내용을 입력하세요.'); return }
    setEditErr('')
    startTransition(async () => {
      const res = await updateAnswer({ answerId: editingAnswerId, questionId: question.id, content: editContent.trim(), mediaUrls: editMediaUrls })
      if (res.error) { setEditErr(res.error); return }
      setEditingAnswerId(null)
      router.refresh()
    })
  }

  function handleCancelAnswer(answerId: string) {
    if (!confirm('답변을 취소하시겠습니까? 질문이 미답변 상태로 되돌아갑니다.')) return
    startTransition(async () => {
      const res = await cancelAnswer({ questionId: question.id, answerId })
      if (res.error) setErrMsg(res.error)
      else router.refresh()
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
              <button type="button" onClick={handleAssign} disabled={pending}
                className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50">
                내가 담당하기
              </button>
            )}
          </div>
        </div>
        <div className="whitespace-pre-wrap text-sm text-zinc-800 leading-relaxed">{question.content}</div>
        {question.image_urls.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {question.image_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`첨부 이미지 ${i + 1}`}
                  className="h-32 w-auto rounded-lg border border-zinc-200 object-cover hover:opacity-80 transition-opacity"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 답변 목록 */}
      {answers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500">답변 기록 ({answers.length})</h2>
          {answers.map((a) =>
            editingAnswerId === a.id ? (
              <div key={a.id} className="rounded-xl border border-zinc-300 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">답변 수정</h3>
                  <span className="text-xs text-zinc-400">{a.taName}</span>
                </div>
                <AnswerEditor
                  content={editContent} onContentChange={setEditContent}
                  mediaUrls={editMediaUrls} mediaInput={editMediaInput}
                  onMediaInputChange={setEditMediaInput}
                  onAddMedia={() => { const u = editMediaInput.trim(); if (!u) return; setEditMediaUrls(p => [...p, u]); setEditMediaInput('') }}
                  onRemoveMedia={(i) => setEditMediaUrls(p => p.filter((_, idx) => idx !== i))}
                  tab={editTab} onTabChange={setEditTab}
                  errMsg={editErr} onSubmit={handleUpdateAnswer}
                  submitLabel="수정 완료" isPending={pending}
                  onCancel={() => setEditingAnswerId(null)}
                />
              </div>
            ) : (
              <div key={a.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800">{a.taName}</span>
                    <span className="text-xs text-zinc-400">{formatDatetime(a.answered_at)}</span>
                  </div>
                  {a.taId === currentUserId && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startEdit(a)} disabled={pending}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50">수정</button>
                      <span className="text-zinc-300">|</span>
                      <button type="button" onClick={() => handleCancelAnswer(a.id)} disabled={pending}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">답변 취소</button>
                    </div>
                  )}
                </div>
                <div className="prose prose-sm prose-zinc max-w-none text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={mdPlugins.remark} rehypePlugins={mdPlugins.rehype}>
                    {a.content}
                  </ReactMarkdown>
                </div>
                {a.media_urls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.media_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="rounded-md bg-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-300 transition-colors">
                        미디어 {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {errMsg && <p className="text-sm text-red-500 font-medium">{errMsg}</p>}

      {/* 답변 작성 */}
      {canAnswer && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            {answers.length > 0 ? '추가 답변 작성' : '답변 작성'}
          </h2>
          <AnswerEditor
            content={content} onContentChange={setContent}
            mediaUrls={mediaUrls} mediaInput={mediaInput}
            onMediaInputChange={setMediaInput}
            onAddMedia={() => { const u = mediaInput.trim(); if (!u) return; setMediaUrls(p => [...p, u]); setMediaInput('') }}
            onRemoveMedia={(i) => setMediaUrls(p => p.filter((_, idx) => idx !== i))}
            tab={tab} onTabChange={setTab}
            aiLoading={aiLoading} aiErr={aiErr} onAiDraft={handleAiDraft}
            errMsg={errMsg} onSubmit={handleSubmit}
            submitLabel="답변 제출하기" isPending={pending}
          />
        </div>
      )}

      {question.status === 'answered' && answers.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-500 text-center">
          답변이 완료된 질문입니다.
        </div>
      )}
    </div>
  )
}
