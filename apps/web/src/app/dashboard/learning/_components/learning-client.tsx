'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { createTodo, toggleTodo, deleteTodo } from '@/lib/actions/todos'

type Lecture = { id: string; title: string; videoId: string; orderNum: number }
type Course = { courseName: string; lectures: Lecture[] }
type Todo = { id: string; content: string; is_completed: boolean }

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
  initialTodos: Todo[]
}

export function LearningClient({ courses, weekGroups, sortedWeeks, progressMap, today, initialTodos }: Props) {
  const [todos, setTodos] = useState(initialTodos)
  const [newTodo, setNewTodo] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!newTodo.trim() || isPending) return
    const content = newTodo.trim()
    setNewTodo('')
    
    // Optimistic UI
    const tempId = Math.random().toString()
    setTodos([{ id: tempId, content, is_completed: false }, ...todos])

    startTransition(async () => {
      const res = await createTodo(content)
      if (!res.success) {
        alert(res.error)
        setTodos(prev => prev.filter(t => t.id !== tempId))
      }
    })
  }

  async function handleToggle(id: string, completed: boolean) {
    setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !completed } : t))
    startTransition(async () => {
      await toggleTodo(id, !completed)
    })
  }

  async function handleDelete(id: string) {
    setTodos(todos.filter(t => t.id !== id))
    startTransition(async () => {
      await deleteTodo(id)
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">학습</h1>

      <Card>
        <CardHeader title="강의 영상" />
        <CardContent>
          {courses.length === 0 ? (
            <EmptyState message="수강 가능한 강좌가 없습니다." />
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.courseName} className="rounded-[20px] bg-zinc-50 overflow-hidden">
                  <Link
                    href={`/dashboard/learning/course/${encodeURIComponent(course.courseName)}`}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900">{course.courseName}</span>
                      <span className="text-[11px] text-zinc-400">{course.lectures.length}강</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-zinc-400 transition-transform -rotate-90"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="나의 할 일" />
        <CardContent>
          <form onSubmit={handleAddTodo} className="mb-6 flex gap-2">
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="오늘 할 일을 계획해보세요"
              className="flex-1 rounded-2xl bg-zinc-50 px-5 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900 transition-all placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={!newTodo.trim() || isPending}
              className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all disabled:bg-zinc-100 disabled:text-zinc-300 active:scale-95"
            >
              추가
            </button>
          </form>

          {todos.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              아직 계획된 할 일이 없습니다.
            </div>
          ) : (
            <ul className="space-y-3">
              {todos.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 group">
                  <button
                    onClick={() => handleToggle(t.id, t.is_completed)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${t.is_completed ? 'bg-zinc-950 border-zinc-950' : 'border-zinc-200 hover:border-zinc-400'}`}>
                      {t.is_completed && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-[15px] font-bold transition-all ${t.is_completed ? 'text-zinc-300 line-through' : 'text-zinc-800'}`}>
                      {t.content}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-zinc-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="과제 목록" />
        <CardContent className="space-y-6">
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
                              className={`truncate text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-zinc-800'}`}
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
        </CardContent>
      </Card>
    </div>
  )
}
