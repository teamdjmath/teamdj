'use client'

import { useState } from 'react'

const TEACHER_PHONE = '010-9205-6541'
const CLINIC_TEAM_PHONE = '053-214-4365'

export function ConsultationSection() {
  const [revealed, setRevealed] = useState(false)

  return (
    <section className="py-20 bg-white border-t border-zinc-100">
      <div className="container max-w-lg mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-950">상담 신청</h2>
        <p className="mt-2 text-sm text-zinc-500 break-keep">
          궁금한 점이 있으시면 아래 번호로 바로 연락해 주세요.
        </p>

        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-8 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
          >
            연락처 확인하기
          </button>
        ) : (
          <div className="mt-8 space-y-3 text-left">
            <a
              href={`tel:${TEACHER_PHONE.replace(/-/g, '')}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/50 px-6 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-zinc-400">이동재T</p>
                <p className="text-lg font-bold text-zinc-950">{TEACHER_PHONE}</p>
              </div>
              <span className="text-xs font-bold text-emerald-600">전화 걸기 →</span>
            </a>
            <a
              href={`tel:${CLINIC_TEAM_PHONE.replace(/-/g, '')}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/50 px-6 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-zinc-400">클리닉팀</p>
                <p className="text-lg font-bold text-zinc-950">{CLINIC_TEAM_PHONE}</p>
              </div>
              <span className="text-xs font-bold text-emerald-600">전화 걸기 →</span>
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
