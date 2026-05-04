'use client'

import Link from 'next/link'

type Lecture = {
  id: string
  title: string
  videoId: string
  orderNum: number
}

interface Props {
  courseName: string
  lectures: Lecture[]
}

export function CourseViewer({ courseName, lectures }: Props) {
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
        <div className="bg-white rounded-lg p-4 text-center border border-zinc-200 border-dashed">
          <p className="text-xs text-zinc-400">등록된 강의 자료가 없습니다.</p>
        </div>
      </div>

      {/* 강의 목록 영역 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
        <h2 className="text-sm font-bold text-zinc-900 mb-4 px-1">강의 목록</h2>
        <div className="space-y-2">
          {lectures.map((lec) => (
            <a
              key={lec.id}
              href={`https://www.youtube.com/watch?v=${lec.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl border border-zinc-100 bg-white hover:border-zinc-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 shrink-0 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white group-hover:border-zinc-950 transition-colors">
                {lec.orderNum}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-zinc-950">
                  {lec.title}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">YouTube에서 시청하기 &rarr;</p>
              </div>
              <div className="shrink-0 text-zinc-300 group-hover:text-zinc-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          ))}
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
