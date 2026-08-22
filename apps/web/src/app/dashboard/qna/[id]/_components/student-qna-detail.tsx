'use client'

import 'katex/dist/katex.min.css'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { deleteQuestion, rateAnswer, requestAdditionalAnswer, confirmAiDraft, type AiFeedbackCategory } from '@/lib/actions/qna'
import { buildStudentContent } from '@/lib/qna-format'
import { QNA_STATUS_LABEL } from '@/lib/qna-status'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'

type Question = {
  id: string
  title: string
  content: string
  image_urls: string[]
  status: 'open' | 'in_progress' | 'answered'
  assigned_ta_id: string | null
  created_at: string
  assignedTaName: string | null
  additional_requested_at?: string | null
}

type AiDraft = {
  content: string
  mediaUrls: string[]
  isAiDraft: boolean
}

type Answer = {
  id: string
  content: string
  media_urls: string[]
  answered_at: string
  taName: string
  taRole?: string
  taIsSuperAdmin?: boolean
  studentRating: number | null
  isAiDraft: boolean
  isTaReviewed: boolean
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
  aiDraft?: AiDraft | null
  studentName: string
  relatedAnswer?: RelatedAnswer | null
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

const FEEDBACK_OPTIONS: { value: AiFeedbackCategory; label: string }[] = [
  { value: 'wrong_answer', label: '정답을 출력하지 못함' },
  { value: 'unclear_explanation', label: '풀이과정 설명이 부족함' },
  { value: 'mismatched_problem', label: '유사 문항이 실제 문항과 다름' },
]

export function StudentQnaDetail({ question, answers, aiDraft, studentName, relatedAnswer }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errMsg, setErrMsg] = useState('')
  const [requestPending, startRequestTransition] = useTransition()
  const [requested, setRequested] = useState(!!question.additional_requested_at)
  const [confirmPending, startConfirmTransition] = useTransition()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackDetail, setFeedbackDetail] = useState('')
  const [showDetailInput, setShowDetailInput] = useState(false)

  function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까?')) return
    setErrMsg('')
    startTransition(async () => {
      const res = await deleteQuestion(question.id)
      if (res.error) setErrMsg(res.error)
    })
  }

  function submitFeedback(category: AiFeedbackCategory, detail?: string) {
    setErrMsg('')
    startRequestTransition(async () => {
      const res = await requestAdditionalAnswer(question.id, { category, detail })
      if (res.error) { setErrMsg(res.error); return }
      setRequested(true)
      setFeedbackOpen(false)
      setShowDetailInput(false)
      setFeedbackDetail('')
    })
  }

  function handleConfirmAiDraft() {
    setErrMsg('')
    startConfirmTransition(async () => {
      const res = await confirmAiDraft(question.id)
      if (res.error) setErrMsg(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-6">
      {/* 질문 카드 (왼쪽 / 모바일 상단) */}
      <Card className="lg:sticky lg:top-[60px]">
        <CardHeader
          title={question.title || '제목 없음'}
          action={
            question.status === 'open' && !aiDraft && (
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
              {QNA_STATUS_LABEL[question.status]}
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
            <div className="space-y-3">
              {question.image_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-[20px] border border-zinc-100 hover:opacity-90 transition-all shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`첨부 이미지 ${i + 1}`}
                    className="w-full max-h-[480px] object-contain bg-zinc-50"
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

        {/* AI 1차 답변 — 조교가 아직 검토하지 않은 초안. 완료된 답변과 섞이면 안 되므로
            별도 카드 + 명확한 미검토 고지로 보여주고, 부족하면 조교에게 직접 요청할 수 있게 한다. */}
        {answers.length === 0 && aiDraft && (
          <Card>
            <CardHeader
              title="AI 1차 답변"
              subtitle="AI가 자동으로 작성한 답변으로, 아직 조교의 검토를 받지 않았습니다."
            />
            <CardContent>
              <div className="prose prose-zinc prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                <ReactMarkdown remarkPlugins={mdPlugins.remark} rehypePlugins={mdPlugins.rehype}>
                  {aiDraft.content}
                </ReactMarkdown>
              </div>
              {aiDraft.mediaUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiDraft.mediaUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`AI 답변 이미지 ${i + 1}`} className="h-40 w-auto rounded-xl border border-zinc-100 object-contain" />
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t border-zinc-100 pt-4">
                <p className="mb-3 text-xs font-semibold text-zinc-400">
                  {requested
                    ? '조교님께 요청을 보냈어요. 답변을 기다려주세요.'
                    : '이 답변이면 충분한가요? 확정하거나, 부족하면 조교님께 직접 요청할 수 있어요.'}
                </p>
                {!requested && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmAiDraft}
                      disabled={confirmPending || requestPending}
                      className="flex-1 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:pointer-events-none disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors"
                    >
                      {confirmPending ? '확정 중...' : '이 답변으로 확정할게요'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      disabled={requestPending || confirmPending}
                      className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 transition-colors"
                    >
                      조교님께 추가 답변 요청하기
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="prose prose-zinc prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 max-h-72 overflow-y-auto">
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
                  {a.media_urls.length > 0 && (
                    <div className="mb-6 space-y-3">
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
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none text-[15px] font-medium leading-relaxed">
                    <ReactMarkdown remarkPlugins={mdPlugins.remark} rehypePlugins={mdPlugins.rehype}>
                      {buildStudentContent({
                        content: a.content,
                        studentName,
                        taName: a.taName,
                        taRole: a.taRole,
                        taIsSuperAdmin: a.taIsSuperAdmin,
                        isAiDraft: a.isAiDraft,
                        isTaReviewed: a.isTaReviewed,
                      })}
                    </ReactMarkdown>
                  </div>
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
        ) : !aiDraft ? (
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
        ) : null}
      </div>

      <Modal
        open={feedbackOpen}
        onClose={() => { setFeedbackOpen(false); setShowDetailInput(false); setFeedbackDetail('') }}
        title="AI 답변의 어떤 부분이 부족했나요?"
      >
        {!showDetailInput ? (
          <div className="space-y-2">
            {FEEDBACK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => submitFeedback(opt.value)}
                disabled={requestPending}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 transition-colors"
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowDetailInput(true)}
              disabled={requestPending}
              className="w-full rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-left text-sm font-semibold text-zinc-500 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 transition-colors"
            >
              직접 답변하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={feedbackDetail}
              onChange={(e) => setFeedbackDetail(e.target.value)}
              placeholder="어떤 부분이 부족했는지 자유롭게 적어주세요."
              className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDetailInput(false)}
                disabled={requestPending}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 transition-colors"
              >
                뒤로
              </button>
              <button
                type="button"
                onClick={() => submitFeedback('other', feedbackDetail)}
                disabled={requestPending || !feedbackDetail.trim()}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:pointer-events-none disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors"
              >
                {requestPending ? '요청 중...' : '요청 보내기'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
