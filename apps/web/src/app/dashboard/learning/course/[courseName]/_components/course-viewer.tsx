'use client'

import { useState } from 'react'
import Link from 'next/link'
import { materialDownloadUrl } from '@/lib/download-url'

type Lecture = {
  id: string
  title: string
  videoId: string
  orderNum: number
}

type CourseMaterial = {
  id: string
  title: string
  url: string
}

interface Props {
  courseName: string
  lectures: Lecture[]
  materials: CourseMaterial[]
}

export function CourseViewer({ courseName, lectures, materials }: Props) {
  // 인앱 플레이어 — 유튜브로 이동하지 않고 앱 안에서 재생 (링크 비노출)
  const [playing, setPlaying] = useState<Lecture | null>(null)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 영역 */}
      <div className="p-6 border-b border-zinc-100 shrink-0">
        <Link 
          href="/dashboard/learning" 
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors flex items-center gap-1 mb-3"
        >
          &larr; 목록으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-zinc-950 leading-tight">
          {courseName}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">총 {lectures.length}개의 강의가 있습니다.</p>
      </div>

      {/* 강의 자료 영역 (상단 고정) */}
      <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 shrink-0">
        <h2 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          강의 자료
        </h2>
        {materials.length === 0 ? (
          <div className="bg-white rounded-lg p-4 text-center border border-zinc-200 border-dashed">
            <p className="text-xs text-zinc-400">등록된 강의 자료가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {materials.map((m) => {
              const downloadUrl = materialDownloadUrl(m.url, m.title)
              return (
                <a
                  key={m.id}
                  href={downloadUrl}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg bg-white border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-950 transition-all group"
                >
                  <svg className="w-4 h-4 text-zinc-400 shrink-0 group-hover:text-zinc-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="flex-1 truncate">{m.title}</span>
                  <svg className="w-3.5 h-3.5 text-zinc-300 shrink-0 group-hover:text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* 강의 목록 영역 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
        <h2 className="text-sm font-bold text-zinc-900 mb-4 px-1">강의 목록</h2>
        <div className="space-y-2">
          {lectures.map((lec) => {
            const isPlaying = playing?.id === lec.id
            return (
              <div key={lec.id}>
                <button
                  type="button"
                  onClick={() => setPlaying(isPlaying ? null : lec)}
                  className={[
                    'w-full flex items-center gap-4 p-4 rounded-xl border bg-white transition-all group text-left',
                    isPlaying
                      ? 'border-zinc-950 shadow-sm'
                      : 'border-zinc-100 hover:border-zinc-300 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className={[
                    'w-10 h-10 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-colors',
                    isPlaying
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white group-hover:border-zinc-950',
                  ].join(' ')}>
                    {lec.orderNum}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {lec.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isPlaying ? '재생 중 — 다시 누르면 닫힙니다' : '눌러서 시청하기'}
                    </p>
                  </div>
                  <div className="shrink-0 text-zinc-300 group-hover:text-zinc-500">
                    {isPlaying ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* 인앱 플레이어 — 앱 안에서만 재생, 유튜브 링크 비노출 */}
                {isPlaying && lec.videoId && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-zinc-200 bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${lec.videoId}?rel=0&modestbranding=1`}
                      title={lec.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full"
                    />
                  </div>
                )}
                {isPlaying && !lec.videoId && (
                  <p className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-400">
                    영상이 아직 등록되지 않았습니다.
                  </p>
                )}
              </div>
            )
          })}
          {lectures.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm text-zinc-400">등록된 강의가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
