'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { markConsultationRead, markInquiryRead } from '@/lib/actions/consultations'

interface Consultation {
  id: string
  name: string
  phone: string
  content: string
  is_read: boolean
  created_at: string
}

interface Inquiry {
  id: string
  user_id: string
  student_name: string
  school: string
  grade: string
  content: string
  is_read: boolean
  created_at: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function UnreadDot() {
  return <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-zinc-900 align-middle" />
}

function ReadBadge({ is_read }: { is_read: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${is_read ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-900 text-white'}`}>
      {is_read ? '읽음' : '미확인'}
    </span>
  )
}

export function ConsultationsClient({
  consultations,
  inquiries,
}: {
  consultations: Consultation[]
  inquiries: Inquiry[]
}) {
  const router = useRouter()
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [isPending, startTransition] = useTransition()

  const unreadConsultations = consultations.filter((c) => !c.is_read).length
  const unreadInquiries     = inquiries.filter((i) => !i.is_read).length

  function handleMarkConsultationRead(id: string) {
    startTransition(async () => {
      await markConsultationRead(id)
      router.refresh()
      setSelectedConsultation((prev) => prev?.id === id ? { ...prev, is_read: true } : prev)
    })
  }

  function handleMarkInquiryRead(id: string) {
    startTransition(async () => {
      await markInquiryRead(id)
      router.refresh()
      setSelectedInquiry((prev) => prev?.id === id ? { ...prev, is_read: true } : prev)
    })
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold text-zinc-950">상담 & 문의</h1>
        {(unreadConsultations + unreadInquiries) > 0 && (
          <p className="mt-0.5 text-sm text-zinc-400">
            미확인 {unreadConsultations + unreadInquiries}건
            {unreadConsultations > 0 && ` (상담 ${unreadConsultations}건`}
            {unreadConsultations > 0 && unreadInquiries > 0 && ` · 문의 ${unreadInquiries}건`}
            {unreadConsultations === 0 && unreadInquiries > 0 && ` (문의 ${unreadInquiries}건`}
            {(unreadConsultations + unreadInquiries) > 0 && ')'}
          </p>
        )}
      </div>

      {/* ── 상담 신청 목록 ───────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3 uppercase tracking-wide">상담 신청</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          {consultations.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">접수된 상담이 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">연락처</th>
                  <th className="px-4 py-3 font-medium">내용</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">접수일</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {consultations.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedConsultation(c)}
                    className={['cursor-pointer transition-colors hover:bg-zinc-50', !c.is_read ? 'bg-zinc-50/50' : ''].join(' ')}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {!c.is_read && <UnreadDot />}
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 hidden sm:table-cell">{c.phone}</td>
                    <td className="px-4 py-3 text-zinc-700 max-w-xs">
                      <span className="line-clamp-1">{c.content.slice(0, 30)}{c.content.length > 30 ? '…' : ''}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3"><ReadBadge is_read={c.is_read} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── 1:1 문의 목록 ────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">1:1 문의</h2>
          <p className="text-xs text-zinc-400">답변은 쪽지 기능을 이용해주세요</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          {inquiries.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">접수된 문의가 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                  <th className="px-4 py-3 font-medium">학생</th>
                  <th className="px-4 py-3 font-medium">내용</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">접수일</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {inquiries.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setSelectedInquiry(i)}
                    className={['cursor-pointer transition-colors hover:bg-zinc-50', !i.is_read ? 'bg-zinc-50/50' : ''].join(' ')}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {!i.is_read && <UnreadDot />}
                      <span>{i.student_name}</span>
                      {i.school && <span className="ml-1.5 text-xs text-zinc-400 font-normal">{i.school}</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 max-w-xs">
                      <span className="line-clamp-1">{i.content.slice(0, 40)}{i.content.length > 40 ? '…' : ''}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{formatDate(i.created_at)}</td>
                    <td className="px-4 py-3"><ReadBadge is_read={i.is_read} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── 상담 상세 모달 ───────────────────────────── */}
      {selectedConsultation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setSelectedConsultation(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950">상담 내용</h2>
              <button type="button" onClick={() => setSelectedConsultation(null)} className="text-sm text-zinc-400 hover:text-zinc-700">닫기</button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">이름</span>
                <span className="font-medium text-zinc-900">{selectedConsultation.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">연락처</span>
                <span className="font-medium text-zinc-900">{selectedConsultation.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">접수일</span>
                <span className="text-zinc-600">{formatDate(selectedConsultation.created_at)}</span>
              </div>
              <div className="pt-2">
                <p className="mb-1.5 text-xs font-medium text-zinc-400">상담 내용</p>
                <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {selectedConsultation.content}
                </p>
              </div>
            </div>
            {!selectedConsultation.is_read && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleMarkConsultationRead(selectedConsultation.id)}
                className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {isPending ? '처리 중…' : '읽음 처리'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 문의 상세 모달 ───────────────────────────── */}
      {selectedInquiry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950">1:1 문의</h2>
              <button type="button" onClick={() => setSelectedInquiry(null)} className="text-sm text-zinc-400 hover:text-zinc-700">닫기</button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">학생</span>
                <span className="font-medium text-zinc-900">
                  {selectedInquiry.student_name}
                  {selectedInquiry.grade && <span className="ml-1 text-zinc-500">{selectedInquiry.grade}</span>}
                </span>
              </div>
              {selectedInquiry.school && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">학교</span>
                  <span className="text-zinc-700">{selectedInquiry.school}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">접수일</span>
                <span className="text-zinc-600">{formatDate(selectedInquiry.created_at)}</span>
              </div>
              <div className="pt-2">
                <p className="mb-1.5 text-xs font-medium text-zinc-400">문의 내용</p>
                <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.content}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/messages"
                className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors text-center"
              >
                쪽지 보내기
              </Link>
              {!selectedInquiry.is_read && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleMarkInquiryRead(selectedInquiry.id)}
                  className="flex-1 rounded-xl bg-zinc-950 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '처리 중…' : '읽음 처리'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
