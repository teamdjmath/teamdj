'use client'

import { useState } from 'react'

const inputCls = 'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:outline-none transition-all'

export function ConsultationForm() {
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
      if (!data.success) { setError(data.error ?? '오류가 발생했습니다.'); return }
      setSubmitted(true)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-zinc-50 border border-zinc-200 px-8 py-12 text-center">
        <div className="mb-3 flex justify-center">
          <svg className="h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-zinc-900">상담 신청이 완료되었습니다.</p>
        <p className="mt-1.5 text-sm text-zinc-600">빠른 시일 내에 연락드리겠습니다.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700">
          이름<span className="ml-0.5 text-red-500">*</span>
        </label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700">
          연락처<span className="ml-0.5 text-red-500">*</span>
        </label>
        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700">
          상담 내용<span className="ml-0.5 text-red-500">*</span>
        </label>
        <textarea required rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="궁금하신 내용을 자유롭게 남겨주세요." className={inputCls + ' resize-none'} />
      </div>
      <p className="text-xs text-zinc-400">* 제출 후 내용을 수정하거나 다시 조회할 수 없습니다.</p>
      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-zinc-950 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors">
        {isSubmitting ? '제출 중...' : '상담 신청하기'}
      </button>
    </form>
  )
}
