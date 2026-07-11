'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ReportItem {
  id: string
  createdAt: string
  imageUrl: string | null
  isClinic?: boolean
}

export function ReportList({ reports }: { reports: ReportItem[] }) {
  const [selected, setSelected] = useState<ReportItem | null>(null)

  return (
    <>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => r.imageUrl && setSelected(r)}
              className={[
                'w-full flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 text-left transition-colors',
                r.imageUrl
                  ? 'hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer'
                  : 'cursor-default opacity-60',
              ].join(' ')}
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  {new Date(r.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  리포트{r.isClinic && '(클리닉)'}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {r.imageUrl ? '탭하여 이미지 보기' : '이미지 없음'}
                </p>
              </div>
              {r.imageUrl && (
                <svg
                  className="h-4 w-4 text-zinc-300 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute -top-9 right-0 text-sm text-white/80 hover:text-white"
            >
              닫기 ✕
            </button>
            <div className="relative w-full h-[80vh]">
              <Image
                src={selected.imageUrl!}
                alt="학습 리포트"
                fill
                sizes="(max-width: 640px) 100vw, 384px"
                className="rounded-2xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
