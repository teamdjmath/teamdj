'use client'

import { useState } from 'react'

export function ConsultationSection() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, content }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? '오류가 발생했습니다.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:outline-none transition-all'

  return (
    <section className="py-20 bg-white border-t border-zinc-100">
      <div className="container max-w-lg mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-950">상담 신청</h2>
          <p className="mt-2 text-sm text-zinc-500">
            궁금한 점을 남겨주시면 빠른 시일 내에 연락드리겠습니다.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-3xl bg-zinc-50 border border-zinc-200 px-8 py-12 text-center">
            <div className="mb-3 flex justify-center">
              <svg className="h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-800">
              상담 신청이 완료되었습니다.
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              빠른 시일 내에 연락드리겠습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600">
                이름<span className="ml-0.5 text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600">
                연락처<span className="ml-0.5 text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600">
                상담 내용<span className="ml-0.5 text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="궁금하신 내용을 자유롭게 남겨주세요."
                className={inputCls + ' resize-none'}
              />
            </div>

            <p className="text-xs text-zinc-400">
              * 제출 후 내용을 수정하거나 다시 조회할 수 없습니다.
            </p>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-zinc-950 py-4 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '제출 중...' : '상담 신청하기'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
