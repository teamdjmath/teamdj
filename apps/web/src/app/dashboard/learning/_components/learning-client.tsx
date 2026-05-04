'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

type Lecture = { id: string; title: string; videoId: string; orderNum: number }
type Course = { courseName: string; lectures: Lecture[] }

const CATEGORY_STYLE: Record<string, string> = {
  '매월승리': 'bg-zinc-950 text-white',
  'KBS': 'bg-zinc-700 text-white',
  'EB-Schema': 'bg-zinc-400 text-white',
}

function catStyle(cat: string | null) {
  return cat ? (CATEGORY_STYLE[cat] ?? 'bg-zinc-100 text-zinc-500') : 'bg-zinc-100 text-zinc-500'
}

interface Props {
  courses: Course[]
  weekGroups: Record<number, Array<{
    id: unknown; title: unknown; due_date: unknown; category: unknown
  }>>
  sortedWeeks: number[]
  progressMap: Record<string, number>
  today: string
}

export function LearningClient({ courses, weekGroups, sortedWeeks, progressMap, today }: Props) {
  const [openCourse, setOpenCourse] = useState<string | null>(
    courses.length === 1 ? courses[0].courseName : null,
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">학습</h1>

      <Card>
        <CardHeader title="강의 영상" />
        <div className="px-5 pb-5">
          {courses.length === 0 ? (
            <EmptyState message="수강 가능한 강좌가 없습니다." />
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.courseName} className="rounded-xl border border-zinc-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCourse(openCourse === course.courseName ? null : course.courseName)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900">{course.courseName}</span>
                      <span className="text-[11px] text-zinc-400">{course.lectures.length}강</span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-zinc-400 transition-transform ${openCourse === course.courseName ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openCourse === course.courseName && (
                    <div className="p-3">
                      {course.lectures.length === 0 ? (
                        <p className="py-4 text-center text-xs text-zinc-400">등록된 강의가 없습니다.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {course.lectures.map((lec) => (
                            <a
                              key={lec.id}
                              href={`https://www.youtube.com/watch?v=${lec.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group rounded-lg overflow-hidden border border-zinc-100 hover:border-zinc-300 transition-colors"
                            >
                              <div className="relative aspect-video bg-zinc-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`https://img.youtube.com/vi/${lec.videoId}/mqdefault.jpg`}
                                  alt={lec.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                  <svg
                                    className="h-8 w-8 text-white drop-shadow"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                                <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
                                  {lec.orderNum}강
                                </span>
                              </div>
                              <div className="px-2 py-1.5">
                                <p className="text-xs font-medium text-zinc-800 line-clamp-2 leading-tight">
                                  {lec.title}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="과제 목록" />
        <div className="px-5 pb-5 space-y-5">
          {sortedWeeks.length > 0 ? (
            sortedWeeks.map((wk) => (
              <div key={wk}>
                <p className="mb-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {wk > 0 ? `${wk}주차` : '미분류'}
                </p>
                <ul className="space-y-3">
                  {weekGroups[wk]!.map((a) => {
                    const id = a.id as string
                    const title = a.title as string
                    const dueDate = a.due_date as string | null
                    const category = a.category as string | null
                    const pct = progressMap[id] ?? 0
                    const isOverdue = dueDate && dueDate < today && pct < 100
                    return (
                      <li key={id}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${catStyle(category)}`}
                            >
                              {category || '기타'}
                            </span>
                            <span
                              className={`truncate text-sm ${isOverdue ? 'text-red-600' : 'text-zinc-800'}`}
                            >
                              {title}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-zinc-700">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              pct === 100 ? 'bg-zinc-950' : isOverdue ? 'bg-red-400' : 'bg-zinc-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {dueDate && (
                          <p className={`mt-0.5 text-[10px] ${isOverdue ? 'text-red-400' : 'text-zinc-400'}`}>
                            마감{' '}
                            {new Date(dueDate).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {isOverdue && ' · 밀린 과제'}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          ) : (
            <EmptyState message="등록된 과제가 없습니다." />
          )}
        </div>
      </Card>
    </div>
  )
}
