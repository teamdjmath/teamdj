'use client'

import 'katex/dist/katex.min.css'
import { useState, useTransition, useEffect } from 'react'
import { deleteQuestion } from '@/lib/actions/qna'

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
}

interface Props {
  question: Question
  answers: Answer[]
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

import { Card, CardHeader, CardContent } from '@/components/ui/card'

export function StudentQnaDetail({ question, answers }: Props) {
  const [pending, startTransition] = useTransition()
  const [errMsg, setErrMsg] = useState('')
  const [renderedAnswers, setRenderedAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    async function renderAll() {
      const newRendered: Record<string, string> = {}
      for (const a of answers) {
        newRendered[a.id] = await renderWithKatex(a.content)
      }
      setRenderedAnswers(newRendered)
    }
    renderAll()
  }, [answers])

  function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까?')) return
    setErrMsg('')
    startTransition(async () => {
      const res = await deleteQuestion(question.id)
      if (res.error) setErrMsg(res.error)
    })
  }

  return (
    <div className="space-y-8">
      {/* 질문 카드 */}
      <Card>
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
              {question.assignedTaName ? `담당: ${question.assignedTaName}` : (answers.length > 0 ? `담당: ${answers[0].taName}` : '조교 배정 중')}
            </span>
          </div>

          {errMsg && <p className="text-sm font-bold text-red-500">{errMsg}</p>}

          <div className="whitespace-pre-wrap text-[15px] font-medium text-zinc-800 leading-relaxed bg-zinc-50 p-6 rounded-[24px]">
            {question.content}
          </div>

          {question.image_urls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {question.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square overflow-hidden rounded-[20px] border border-zinc-100 hover:opacity-90 transition-all shadow-sm">
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

      {/* 답변 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">답변</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{answers.length}</span>
        </div>
        
        {answers.length > 0 ? (
          <div className="space-y-4">
            {answers.map((a) => (
              <Card key={a.id}>
                <CardHeader 
                  title={a.taName}
                  subtitle={formatDatetime(a.answered_at)}
                />
                <CardContent>
                  <div
                    className="text-[15px] font-medium text-zinc-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderedAnswers[a.id] || '렌더링 중...' }}
                  />
                  {a.media_urls.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {a.media_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-2xl bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-all flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          첨부 파일 {i + 1}
                        </a>
                      ))}
                    </div>
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
