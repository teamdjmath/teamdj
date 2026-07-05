'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { agreeTerms } from '@/lib/actions/consent'

export function ConsentClient() {
  const [allChecked, setAllChecked] = useState(false)
  const [checks, setChecks] = useState({ terms: false, privacy: false, overseas: false })
  const [isPending, startTransition] = useTransition()

  function toggle(key: keyof typeof checks) {
    const next = { ...checks, [key]: !checks[key] }
    setChecks(next)
    setAllChecked(next.terms && next.privacy && next.overseas)
  }

  function toggleAll() {
    const next = !allChecked
    setAllChecked(next)
    setChecks({ terms: next, privacy: next, overseas: next })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allChecked) return
    startTransition(() => agreeTerms())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 전체 동의 */}
      <button
        type="button"
        onClick={toggleAll}
        className={[
          'w-full flex items-center gap-3 px-5 py-4 rounded-2xl border-2 text-left transition-colors',
          allChecked
            ? 'border-zinc-950 bg-zinc-950 text-white'
            : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400',
        ].join(' ')}
      >
        <CheckIcon checked={allChecked} inverted={allChecked} />
        <span className="text-[15px] font-bold">전체 동의</span>
      </button>

      <div className="rounded-2xl bg-white border border-zinc-100 divide-y divide-zinc-50 overflow-hidden">
        {/* 이용약관 */}
        <ConsentRow
          checked={checks.terms}
          onToggle={() => toggle('terms')}
          label="이용약관 동의 (필수)"
          href="/terms"
        />
        {/* 개인정보처리방침 */}
        <ConsentRow
          checked={checks.privacy}
          onToggle={() => toggle('privacy')}
          label="개인정보처리방침 동의 (필수)"
          href="/privacy"
        />
        {/* 국외 이전 */}
        <ConsentRow
          checked={checks.overseas}
          onToggle={() => toggle('overseas')}
          label="개인정보 국외 이전 동의 (필수)"
          description="학습 데이터가 미국 소재 서버(Supabase, Vercel)에 저장됩니다."
          href="/privacy"
        />
      </div>

      <button
        type="submit"
        disabled={!allChecked || isPending}
        className="w-full rounded-2xl bg-zinc-950 py-4 text-[15px] font-bold text-white transition-all hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 mt-2"
      >
        {isPending ? '처리 중…' : '동의하고 시작하기'}
      </button>

      <p className="text-center text-xs text-zinc-400 pt-1">
        동의하지 않으시면 서비스 이용이 불가합니다.
      </p>
    </form>
  )
}

function ConsentRow({
  checked,
  onToggle,
  label,
  description,
  href,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  description?: string
  href: string
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <button
        type="button"
        onClick={onToggle}
        className="mt-0.5 flex-shrink-0"
        aria-checked={checked}
        role="checkbox"
      >
        <CheckIcon checked={checked} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-zinc-800">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{description}</p>
        )}
      </div>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 text-xs text-zinc-400 hover:text-zinc-700 transition-colors underline underline-offset-2 whitespace-nowrap"
      >
        보기
      </Link>
    </div>
  )
}

function CheckIcon({ checked, inverted }: { checked: boolean; inverted?: boolean }) {
  return (
    <span
      className={[
        'flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors',
        checked
          ? inverted
            ? 'border-white bg-white'
            : 'border-zinc-950 bg-zinc-950'
          : 'border-zinc-300 bg-transparent',
      ].join(' ')}
    >
      {checked && (
        <svg
          className={inverted ? 'text-zinc-950' : 'text-white'}
          width="10"
          height="10"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 10 10"
        >
          <polyline points="1.5,5 4,7.5 8.5,2.5" />
        </svg>
      )}
    </span>
  )
}
