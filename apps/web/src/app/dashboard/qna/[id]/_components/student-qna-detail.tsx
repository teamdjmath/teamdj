'use client'

import 'katex/dist/katex.min.css'
import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { deleteQuestion, rateAnswer } from '@/lib/actions/qna'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

type Question = {
  id: string
  title: string
  content: string
  image_urls: string[]
  status: 'open' | 'in_progress' | 'answered'
  assigned_ta_id: string | null
  created_at: string
  assignedTaName: string | null
}

type Answer = {
  id: string
  content: string
  media_urls: string[]
  answered_at: string
  taName: string
  studentRating: number | null
  isAiDraft: boolean
}

function StarRating({
  answerId,
  initial,
  disabled,
}: {
  answerId: string
  initial: number | null
  disabled: boolean
}) {
  const [rating, setRating] = useState<number | null>(initial)
  const [hover, setHover] = useState(0)
  const [saving, startSave] = useTransition()

  // 이미 평가했어도 다시 눌러서 수정 가능
  function handleRate(star: number) {
    if (saving || disabled) return
    startSave(async () => {
      const res = await rateAnswer(answerId, star)
      if (!res.error) setRating(star)
    })
  }

  const display = hover || rating || 0

  return (
    <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-zinc-100">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        {rating ? '내 평가' : '이 답변이 도움이 되셨나요?'}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={saving || disabled}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-2xl leading-none transition-transform cursor-pointer hover:scale-110 active:scale-95 ${saving ? 'opacity-50' : ''}`}
            aria-label={`${star}점`}
          >
            <span className={star <= display ? 'text-yellow-400' : 'text-zinc-200'}>★</span>
          </button>
        ))}
        {rating && (
          <span className="ml-1 text-sm font-bold text-zinc-500">{rating}점</span>
        )}
        {rating && !saving && (
          <span className="ml-1 text-[11px] text-zinc-300">별을 눌러 수정할 수 있어요</span>
        )}
      </div>
    </div>
  )
}

type RelatedAnswer = {
  questionId: string
  questionTitle: string
  content: string
  mediaUrls: string[]
  taName: string
  difficulty: number | null
  answeredAt: string
  matchType: 'same_problem' | 'similar'
}

interface Props {
  question: Question
  answers: Answer[]
  studentName: string
  relatedAnswer?: RelatedAnswer | null
}

const STATUS_LABEL: Record<string, string> = {
  open: '미답변',
  in_progress: '답변중',
  answered: '답변완료',
}
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-zinc-100 text-zinc-500',
  in_progress: 'bg-zinc-900 text-white',
  answered: 'bg-zinc-200 text-zinc-700',
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const mdPlugins = { remark: [remarkMath], rehype: [rehypeKatex] }

function buildStudentContent(content: string, studentName: string, taName: string, isAiDraft: boolean): string {
  const praiseMatch = content.match(/### 칭찬\n([\s\S]*?)(?=\n### |$)/)
  const keyMatch = content.match(/### 핵심 포인트\n([\s\S]*?)(?=\n### |$)/)
  const solutionMatch = content.match(/### 풀이\n([\s\S]*?)(?=\n### |$)/)

  const body = (praiseMatch || keyMatch || solutionMatch)
    ? [praiseMatch?.[1]?.trim(), keyMatch?.[1]?.trim(), solutionMatch?.[1]?.trim()]
        .filter(Boolean)
        .join('\n\n')
    : content.trim()

  const name = studentName ? `**${studentName}**` : '학생'
  // AI 초안 고지는 실제로 AI 초안을 사용한 답변에만 표시 (인공지능기본법 제31조 — 생성형 AI 결과물 표시 의무).
  // AI를 쓰지 않은 답변에 붙이면 사실과 다른 표시가 되므로 붙이지 않는다.
  const aiNotice = isAiDraft
    ? `\n\n*본 답변은 AI가 작성한 초안을 조교가 검수·수정한 것입니다. (인공지능기본법 제31조에 따른 고지)*`
    : ''
  return `안녕하세요 ${name} 학생, **${taName}** 조교입니다.\n\n${body}\n\n---\n감사합니다. 더 궁금하신 내용이 있다면 언제든 질문해주시기 바랍니다.${aiNotice}`
}

export function StudentQnaDetail({ question, answers, studentName, relatedAnswer }: Props) {
  const [pending, startTransition] = useTransition()
  const [errMsg, setErrMsg] = useState('')

  function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까?')) return
    setErrMsg('')
    startTransition(async () => {
      const res = await deleteQuestion(question.id)
      if (res.error) setErrMsg(res.error)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-6">
      {/* 질문 카드 (왼쪽 / 모바일 상단) */}
      <Card className="lg:sticky lg:top-[60px]">
        <CardHeader
          title={question.title || '제목 없음'}
          action={
            question.status === 'open' && (
              <button
                onClick={handleDelete}
                disabled={pending}
                className="text-xs font-bold text-red-400 hover:text-red-500 disabled:opacity-50 transition-colors"
              >
                질문 삭제
              </button>
            )
          }
        />
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_BADGE[question.status]}`}>
              {STATUS_LABEL[question.status]}
            </span>
            <span className="text-xs font-bold text-zinc-300">{formatDatetime(question.created_at)}</span>
            <div className="h-1 w-1 rounded-full bg-zinc-200" />
            <span className="text-xs font-semibold text-zinc-400">
              {question.assignedTaName
                ? `담당: ${question.assignedTaName}`
                : answers.length > 0
                  ? `담당: ${answers[0].taName}`
                  : '조교 배정 중'}
            </span>
          </div>

          {errMsg && <p className="text-sm font-bold text-red-500">{errMsg}</p>}

          <div className="whitespace-pre-wrap text-[15px] font-medium text-zinc-800 leading-relaxed bg-zinc-50 p-6 rounded-[24px]">
            {question.content}
          </div>

          {question.image_urls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {question.image_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-square overflow-hidden rounded-[20px] border border-zinc-100 hover:opacity-90 transition-all shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`첨부 이미지 ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 답변 섹션 (오른쪽 / 모바일 하단) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">답변</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{answers.length}</span>
        </div>

        {/* 유사 문항 자동 연결 — 아직 내 질문에 답변이 없을 때만 참고용으로 보여준다.
            답변이 이미 있으면(채택 포함) 그 답변이 곧 이 내용이므로 중복 표시하지 않는다. */}
        {answers.length === 0 && relatedAnswer && (
          <Card>
            <CardHeader
              title={relatedAnswer.matchType === 'same_problem' ? '같은 문항의 이전 답변' : '비슷한 질문의 이전 답변'}
              subtitle={`${relatedAnswer.taName} · ${formatDatetime(relatedAnswer.answeredAt)} · ${
                relatedAnswer.matchType === 'same_problem'
                  ? '같은 교재·문항에 대해 자동으로 연결된 답변입니다'
                  : '제목·내용이 비슷해 자동으로 연결된 답변입니다 (다른 문항일 수 있어요)'
              }`}
            />
            <CardContent>
              <div className="prose prose-zinc prose-sm max-w-none text-zinc-700 max-h-72 overflow-y-auto">
                <ReactMarkdown remarkPlugins={mdPlugins.remark} rehypePlugins={mdPlugins.rehype}>
                  {relatedAnswer.content}
                </ReactMarkdown>
              </div>
              {relatedAnswer.mediaUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {relatedAnswer.mediaUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`첨부 ${i + 1}`} className="h-24 w-auto rounded-xl border border-zinc-100 object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {answers.length > 0 ? (
          <div className="space-y-4">
            {answers.map((a) => (
              <Card key={a.id}>
                <CardHeader title={a.taName} subtitle={formatDatetime(a.answered_at)} />
                <CardContent>
                  <div className="prose prose-sm prose-zinc max-w-none text-[15px] font-medium leading-relaxed">
                    <ReactMarkdown remarkPlugins={mdPlugins.remark} rehypePlugins={mdPlugins.rehype}>
                      {buildStudentContent(a.content, studentName, a.taName, a.isAiDraft)}
                    </ReactMarkdown>
                  </div>
                  {a.media_urls.length > 0 && (
                    <div className="mt-6 space-y-3">
                      {a.media_urls.map((url, i) => {
                        const raw = url.split('/').pop()?.split('?')[0] ?? ''
                        const ext = raw.split('.').pop()?.toLowerCase() ?? ''
                        const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
                        const displayName = raw.replace(/^[a-z0-9]+_\d+\./, '') || `파일 ${i + 1}`
                        return (
                          <div key={i} className="space-y-1.5">
                            {isImage ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={displayName}
                                  className="w-full rounded-2xl border border-zinc-100 object-contain max-h-[480px]"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <a
                                  href={url}
                                  download={displayName}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  {displayName} 다운로드
                                </a>
                              </>
                            ) : isVideo ? (
                              <>
                                <video
                                  src={url}
                                  controls
                                  className="w-full rounded-2xl border border-zinc-100 max-h-[480px] bg-zinc-950"
                                />
                                <a
                                  href={url}
                                  download={displayName}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  {displayName} 다운로드
                                </a>
                              </>
                            ) : (
                              <a
                                href={url}
                                download={displayName}
                                className="rounded-2xl bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-all flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate flex-1">{displayName}</span>
                                <svg className="w-3.5 h-3.5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {question.status === 'answered' && (
                    <StarRating
                      answerId={a.id}
                      initial={a.studentRating}
                      disabled={question.status !== 'answered'}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-200 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-zinc-400">조교님이 답변을 작성 중입니다.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
