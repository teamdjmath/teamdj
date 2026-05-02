'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { removeStudentFromClass } from '@/lib/actions/classes'

type Student = {
  id: string
  name: string
  phone: string
  memberId: string
  enrolledAt: string
}

export function ClassDetailClient({
  classId,
  students,
}: {
  classId: string
  students: Student[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')

  const filtered = students.filter(
    (s) =>
      s.name.includes(query) || s.phone.includes(query),
  )

  function handleRemove(studentId: string, name: string) {
    if (!confirm(`"${name}" 학생을 이 반에서 제거하시겠습니까?`)) return
    startTransition(async () => {
      const res = await removeStudentFromClass(classId, studentId)
      if (res.error) alert(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      {/* 테이블 헤더 */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <span className="text-sm font-semibold text-zinc-900">
          소속 학생 <span className="ml-1 text-zinc-400 font-normal">{students.length}명</span>
        </span>
        <input
          type="search"
          placeholder="이름 / 전화번호 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none w-44"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">이름</th>
            <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">전화번호</th>
            <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">등록일</th>
            <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-10 text-center text-sm text-zinc-400">
                {query ? '검색 결과가 없습니다.' : '소속 학생이 없습니다.'}
              </td>
            </tr>
          ) : (
            filtered.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-5 py-3.5">
                  <Link href={`/admin/students/${s.id}`} className="font-medium text-zinc-900 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="hidden sm:table-cell px-5 py-3.5 text-zinc-500">{s.phone}</td>
                <td className="hidden md:table-cell px-5 py-3.5 text-zinc-400 text-xs">
                  {new Date(s.enrolledAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemove(s.id, s.name)}
                    disabled={isPending}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    제거
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
