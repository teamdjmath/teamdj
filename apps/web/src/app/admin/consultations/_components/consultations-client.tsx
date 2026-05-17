'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markConsultationRead } from '@/lib/actions/consultations'

interface Consultation {
  id: string
  name: string
  phone: string
  content: string
  is_read: boolean
  created_at: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ConsultationsClient({ consultations }: { consultations: Consultation[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [isPending, startTransition] = useTransition()

  const unreadCount = consultations.filter((c) => !c.is_read).length

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markConsultationRead(id)
      router.refresh()
      setSelected((prev) => prev?.id === id ? { ...prev, is_read: true } : prev)
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">상담 신청 목록</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-zinc-400">읽지 않은 상담 {unreadCount}건</p>
          )}
        </div>
      </div>

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
                  onClick={() => setSelected(c)}
                  className={[
                    'cursor-pointer transition-colors hover:bg-zinc-50',
                    !c.is_read ? 'bg-zinc-50/50' : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {!c.is_read && (
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-zinc-900 align-middle" />
                    )}
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{c.phone}</td>
                  <td className="px-4 py-3 text-zinc-600 max-w-xs">
                    <span className="line-clamp-1">{c.content.slice(0, 30)}{c.content.length > 30 ? '…' : ''}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.is_read ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-900 text-white'}`}>
                      {c.is_read ? '읽음' : '미확인'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950">상담 내용</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-sm text-zinc-400 hover:text-zinc-700"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">이름</span>
                <span className="font-medium text-zinc-900">{selected.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">연락처</span>
                <span className="font-medium text-zinc-900">{selected.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">접수일</span>
                <span className="text-zinc-600">{formatDate(selected.created_at)}</span>
              </div>
              <div className="pt-2">
                <p className="mb-1.5 text-xs font-medium text-zinc-400">상담 내용</p>
                <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {selected.content}
                </p>
              </div>
            </div>

            {!selected.is_read && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleMarkRead(selected.id)}
                className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {isPending ? '처리 중…' : '읽음 처리'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
