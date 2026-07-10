'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { InputField } from '@/components/ui/form-field'
import { StudentFormModal } from './student-form-modal'
import { ExcelImportModal } from './excel-import-modal'
import { EmptyState } from '@/components/ui/empty-state'

type StudentRow = {
  id: string
  name: string
  phone: string
  school: string | null
  grade: string | null
  is_active: boolean
  suspendedUntil: string | null
  classes: { id: string; name: string }[]
  hasParent: boolean
}

type ClassOption = { id: string; label: string }

export function StudentsClient({
  students,
  classOptions,
  totalCount,
  page,
  totalPages,
  q,
  filterClassId,
  filterStatus,
}: {
  students: StudentRow[]
  classOptions: ClassOption[]
  totalCount: number
  page: number
  totalPages: number
  q: string
  filterClassId: string
  filterStatus: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [excelOpen, setExcelOpen]   = useState(false)
  const [inputValue, setInputValue] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushParams(newQ: string, newPage: number, newClassId?: string, newStatus?: string) {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newPage > 1) params.set('page', String(newPage))
    const classId = newClassId ?? filterClassId
    if (classId) params.set('classId', classId)
    const status = newStatus ?? filterStatus
    if (status) params.set('status', status)
    startTransition(() => {
      router.push(`/admin/students${params.size ? `?${params}` : ''}`)
    })
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushParams(val, 1), 350)
  }

  // 초기 비밀번호는 시스템이 자동 설정하므로 샘플에 비밀번호 열을 두지 않는다
  async function handleSampleDownload() {
    const XLSX = await import('xlsx')
    const data = [
      { 이름: '홍길동', 전화번호: '01012345678', 학교명: '세종고', 학년: '1', 분반명: '수학A반', 학부모전화번호: '01011112222' },
      { 이름: '김철수', 전화번호: '01087654321', 학교명: '강남고', 학년: '2', 분반명: '수학A반', 학부모전화번호: '01033334444' },
      { 이름: '이영희', 전화번호: '01055556666', 학교명: '세종중', 학년: '3', 분반명: '영어B반', 학부모전화번호: '' },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학생목록')
    XLSX.writeFile(wb, '학생_일괄등록_샘플.xlsx')
  }

  // 상태 필터 (클라이언트 측)
  const displayedStudents = filterStatus === 'active'
    ? students.filter((s) => s.is_active && !s.suspendedUntil)
    : filterStatus === 'suspended'
    ? students.filter((s) => s.suspendedUntil)
    : students

  return (
    <>
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">학생 관리</h1>
          <p className="mt-0.5 text-sm text-zinc-400">총 {totalCount}명</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSampleDownload}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            등록용 샘플 엑셀
          </button>
          <button
            type="button"
            onClick={() => setExcelOpen(true)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            엑셀 일괄 등록
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            + 학생 등록
          </button>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="w-60">
          <InputField
            type="search"
            placeholder="이름, 전화번호로 검색"
            value={inputValue}
            onChange={handleSearchChange}
          />
        </div>
        <select
          value={filterClassId}
          onChange={(e) => pushParams(q, 1, e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">전체 분반</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => pushParams(q, 1, undefined, e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">전체 상태</option>
          <option value="active">활성</option>
          <option value="suspended">휴원 중</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">이름</th>
              <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">전화번호</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">소속 반</th>
              <th className="hidden md:table-cell px-5 py-3 text-center text-xs font-semibold text-zinc-500">학부모</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">상태</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {displayedStudents.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    message={q ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
                    description={q ? `"${q}" 에 일치하는 학생이 없습니다.` : '학생 등록 버튼으로 추가하세요.'}
                  />
                </td>
              </tr>
            ) : (
              displayedStudents.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-zinc-900">{s.name}</div>
                    <div className="text-[11px] text-zinc-500">
                      {s.school || '학교 미지정'} · {s.grade ? `${s.grade}학년` : '학년 미지정'}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-zinc-700">{s.phone}</td>
                  <td className="px-5 py-3.5">
                    {s.classes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.classes.map((c) => (
                          <Link
                            key={c.id}
                            href={`/admin/classes/${c.id}`}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-200 transition-colors"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-5 py-3.5 text-center">
                    <span className={`inline-block h-2 w-2 rounded-full ${s.hasParent ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {s.suspendedUntil ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        휴원 중
                      </span>
                    ) : s.is_active ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        활성
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      상세 →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>{PAGE_SIZE * (page - 1) + 1}–{Math.min(PAGE_SIZE * page, totalCount)} / 총 {totalCount}명</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => pushParams(q, page - 1)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => pushParams(q, p as number)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-zinc-950 text-white'
                        : 'border border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => pushParams(q, page + 1)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* 개별 등록 모달 */}
      <StudentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        classOptions={classOptions}
      />

      {/* 엑셀 일괄 등록 모달 */}
      <ExcelImportModal
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
      />
    </>
  )
}

const PAGE_SIZE = 50
