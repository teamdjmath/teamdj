'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/card'
import { LogoutButton } from '@/components/ui/logout-button'
import { submitInquiry } from '@/lib/actions/consultations'

const LS_NOTIFICATIONS = 'teamdj_notifications'
const LS_MARKETING = 'teamdj_marketing'

type FaqItem = { q: string; a: string }

export function MoreClient({
  faqItems,
}: {
  faqItems: FaqItem[]
}) {
  const [settings, setSettings] = useState({
    notifications: true,
    marketing: false,
    mounted: false,
  })

  const [faqOpen, setFaqOpen] = useState(false)
  const [openFaqItem, setOpenFaqItem] = useState<number | null>(null)

  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [inquiryText, setInquiryText] = useState('')
  const [inquiryDone, setInquiryDone] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  const [isSubmitting, startSubmit] = useTransition()

  useEffect(() => {
    const n = localStorage.getItem(LS_NOTIFICATIONS)
    const m = localStorage.getItem(LS_MARKETING)
    requestAnimationFrame(() => {
      setSettings({
        notifications: n !== null ? n === 'true' : true,
        marketing: m !== null ? m === 'true' : false,
        mounted: true,
      })
    })
  }, [])

  function handleNotifications(v: boolean) {
    setSettings(s => ({ ...s, notifications: v }))
    localStorage.setItem(LS_NOTIFICATIONS, String(v))
  }

  function handleMarketing(v: boolean) {
    setSettings(s => ({ ...s, marketing: v }))
    localStorage.setItem(LS_MARKETING, String(v))
  }

  function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inquiryText.trim()) return
    setInquiryError('')
    startSubmit(async () => {
      const result = await submitInquiry(inquiryText)
      if (result.error) {
        setInquiryError(result.error)
        return
      }
      setInquiryDone(true)
      setInquiryText('')
      setTimeout(() => {
        setInquiryDone(false)
        setInquiryOpen(false)
      }, 2500)
    })
  }

  if (!settings.mounted) {
    return <div className="h-screen animate-pulse" />
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">더보기</h1>

      {/* 지원 메뉴 */}
      <Card>
        <ul className="divide-y divide-zinc-100">
          <li>
            <button
              type="button"
              onClick={() => setInquiryOpen(true)}
              className="flex w-full items-center justify-between px-6 py-5 text-[15px] font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              1:1 문의
              <svg className="h-5 w-5 text-zinc-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => { setFaqOpen(!faqOpen); setOpenFaqItem(null) }}
              className="flex w-full items-center justify-between px-6 py-5 text-[15px] font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              자주 묻는 질문
              <svg className="h-5 w-5 text-zinc-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
          <li>
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between px-6 py-5 text-[15px] font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              이용약관
              <svg className="h-5 w-5 text-zinc-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between px-6 py-5 text-[15px] font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              개인정보처리방침
              <svg className="h-5 w-5 text-zinc-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </li>
        </ul>
      </Card>

      {/* FAQ 아코디언 */}
      {faqOpen && (
        <Card>
          <CardHeader title="자주 묻는 질문" />
          <ul className="divide-y divide-zinc-50 px-0">
            {faqItems.map((item, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => setOpenFaqItem(openFaqItem === idx ? null : idx)}
                  className="flex w-full items-start justify-between gap-3 px-6 py-5 text-left"
                >
                  <span className="text-[15px] font-bold text-zinc-800">{item.q}</span>
                  <svg
                    className={`mt-0.5 h-5 w-5 shrink-0 text-zinc-200 transition-transform ${openFaqItem === idx ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </button>
                {openFaqItem === idx && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium">{item.a}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 알림 설정 */}
      <Card>
        <div className="px-6 py-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">알림 설정</p>
        </div>
        <ul className="divide-y divide-zinc-50">
          <ToggleItem
            label="알림 허용"
            description="수업, 과제, 공지 알림"
            value={settings.notifications}
            onChange={handleNotifications}
          />
          <ToggleItem
            label="마케팅 알림"
            description="이벤트 및 혜택 정보"
            value={settings.marketing}
            onChange={handleMarketing}
          />
        </ul>
      </Card>

      {/* 로그아웃 */}
      <Card>
        <div className="px-6 py-5">
          <LogoutButton />
        </div>
      </Card>

      {/* 1:1 문의 모달 */}
      {inquiryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setInquiryOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-[40px] bg-white px-6 pt-8 pb-12 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-zinc-900">1:1 문의</h2>
              <button
                type="button"
                onClick={() => setInquiryOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {inquiryDone ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-zinc-900">문의가 접수되었습니다.</p>
                <p className="mt-2 text-sm text-zinc-400">영업일 기준 1~2일 내 답변드립니다.</p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <textarea
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  placeholder="문의 내용을 입력해주세요."
                  rows={5}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-2xl border-none bg-zinc-50 px-5 py-4 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 transition-all outline-none disabled:opacity-50"
                />
                {inquiryError && (
                  <p className="text-sm text-red-500 text-center">{inquiryError}</p>
                )}
                <button
                  type="submit"
                  disabled={!inquiryText.trim() || isSubmitting}
                  className="w-full rounded-2xl bg-zinc-950 py-4 text-[15px] font-bold text-white transition-all hover:bg-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  {isSubmitting ? '전송 중…' : '문의 보내기'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function ToggleItem({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <li className="flex items-center justify-between px-6 py-5">
      <div>
        <p className="text-[15px] font-bold text-zinc-800">{label}</p>
        <p className="text-xs font-medium text-zinc-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 shadow-inner',
          value ? 'bg-zinc-950' : 'bg-zinc-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200',
            value ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </li>
  )
}
