'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// "리포트 작성" 버튼 — 클릭 시 리포트 유형(학습/클리닉) 선택 모달을 띄운다.
export function NewReportButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        리포트 작성
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950">어떤 리포트를 만들까요?</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-400 hover:text-zinc-700">닫기</button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.push('/admin/reports/new')}
                className="w-full rounded-2xl border border-zinc-200 p-5 text-left hover:border-zinc-400 hover:bg-zinc-50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shrink-0">
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">학습 리포트</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  분반·날짜를 선택하면 출석·테스트·과제 데이터로 자동 생성됩니다. 카카오톡 발송 가능.
                </p>
              </button>

              <button
                type="button"
                onClick={() => router.push('/admin/reports/clinic')}
                className="w-full rounded-2xl border border-zinc-200 p-5 text-left hover:border-zinc-400 hover:bg-zinc-50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">클리닉 리포트</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  구글 스프레드시트(엑셀) 파일을 업로드하면 학생별 클리닉 리포트 이미지를 만듭니다.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
