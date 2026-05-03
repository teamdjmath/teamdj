'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { LogoutButton } from '@/components/ui/logout-button'

const LS_NOTIFICATIONS = 'teamdj_notifications'
const LS_MARKETING = 'teamdj_marketing'

const FAQ_ITEMS = [
  {
    q: '출결 처리는 어떻게 되나요?',
    a: '수업 시작 시간 기준으로 10분 이내 입실은 출석, 30분 이내는 지각, 그 이후는 결석으로 처리됩니다.',
  },
  {
    q: '과제 완료율은 어디서 입력하나요?',
    a: '과제 완료율은 담당 선생님이 직접 입력합니다. 완료 후 선생님께 확인을 요청해주세요.',
  },
  {
    q: '질문은 어떻게 등록하나요?',
    a: '현재 질문 등록은 선생님을 통해서만 가능합니다. 추후 학생 직접 등록 기능이 추가될 예정입니다.',
  },
  {
    q: '성적표는 어디서 확인하나요?',
    a: '하단 탭의 "리포트" 메뉴에서 최근 테스트 성적 히스토리를 확인하실 수 있습니다.',
  },
  {
    q: '강의 영상은 언제까지 볼 수 있나요?',
    a: '강의 영상은 YouTube로 제공되며, 선생님이 삭제하기 전까지 언제든지 시청 가능합니다.',
  },
]

const TERMS_TEXT = `제1조 (목적)
본 약관은 TeamDJ(이하 "서비스")를 이용함에 있어 회원과 서비스 제공자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (개인정보 수집 및 이용)
서비스는 원활한 운영을 위해 이름, 연락처, 학습 데이터 등 최소한의 정보를 수집합니다. 수집된 정보는 서비스 제공 목적 외에 사용되지 않습니다.

제3조 (서비스 이용)
회원은 본 서비스를 통해 강의 영상 시청, 과제 확인, 성적 조회 등의 기능을 이용할 수 있습니다. 서비스 내 콘텐츠는 저작권법에 의해 보호됩니다.

제4조 (면책 조항)
서비스는 천재지변, 시스템 장애 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.`

export default function MorePage() {
  const [notifications, setNotifications] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // FAQ
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // 1:1 문의
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [inquiryText, setInquiryText] = useState('')
  const [inquiryDone, setInquiryDone] = useState(false)

  // 약관
  const [termsOpen, setTermsOpen] = useState(false)

  useEffect(() => {
    const n = localStorage.getItem(LS_NOTIFICATIONS)
    const m = localStorage.getItem(LS_MARKETING)
    if (n !== null) setNotifications(n === 'true')
    if (m !== null) setMarketing(m === 'true')
    setMounted(true)
  }, [])

  function handleNotifications(v: boolean) {
    setNotifications(v)
    localStorage.setItem(LS_NOTIFICATIONS, String(v))
  }

  function handleMarketing(v: boolean) {
    setMarketing(v)
    localStorage.setItem(LS_MARKETING, String(v))
  }

  function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inquiryText.trim()) return
    setInquiryDone(true)
    setInquiryText('')
    setTimeout(() => {
      setInquiryDone(false)
      setInquiryOpen(false)
    }, 2000)
  }

  if (!mounted) {
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
              className="flex w-full items-center justify-between px-5 py-4 text-sm text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              1:1 문의
              <svg className="h-4 w-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === -1 ? null : -1)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              자주 묻는 질문
              <svg className="h-4 w-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              약관 및 이용동의
              <svg className="h-4 w-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
        </ul>
      </Card>

      {/* FAQ 아코디언 (인라인) */}
      {openFaq === -1 && (
        <Card>
          <CardHeader title="자주 묻는 질문" />
          <ul className="divide-y divide-zinc-100 px-0">
            {FAQ_ITEMS.map((item, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-zinc-800">{item.q}</span>
                  <svg
                    className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-300 transition-transform ${openFaq === idx ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-zinc-500 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 알림 설정 */}
      <Card>
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">알림 설정</p>
        </div>
        <ul className="divide-y divide-zinc-100">
          <ToggleItem
            label="알림 허용"
            description="수업, 과제, 공지 알림"
            value={notifications}
            onChange={handleNotifications}
          />
          <ToggleItem
            label="마케팅 알림"
            description="이벤트 및 혜택 정보"
            value={marketing}
            onChange={handleMarketing}
          />
        </ul>
      </Card>

      {/* 로그아웃 */}
      <Card>
        <div className="px-5 py-4">
          <LogoutButton />
        </div>
      </Card>

      {/* 1:1 문의 모달 */}
      {inquiryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setInquiryOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white px-5 pt-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">1:1 문의</h2>
              <button
                type="button"
                onClick={() => setInquiryOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-700"
              >
                닫기
              </button>
            </div>

            {inquiryDone ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-zinc-800">문의가 접수되었습니다.</p>
                <p className="mt-1 text-xs text-zinc-400">영업일 기준 1~2일 내 답변드립니다.</p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-3">
                <textarea
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  placeholder="문의 내용을 입력해주세요."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inquiryText.trim()}
                  className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
                >
                  문의 보내기
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 약관 모달 */}
      {termsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setTermsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white px-5 pt-5 pb-10 max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">약관 및 이용동의</h2>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-700"
              >
                닫기
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-500 font-sans">
              {TERMS_TEXT}
            </pre>
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
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          value ? 'bg-zinc-900' : 'bg-zinc-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
            value ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </li>
  )
}
