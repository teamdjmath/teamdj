'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InputField } from '@/components/ui/form-field'
import { StudentFormModal } from './student-form-modal'
import { ExcelImportModal } from './excel-import-modal'

type StudentRow = {
  id: string
  name: string
  phone: string
  school: string | null
  grade: string | null
  is_active: boolean
  className: string | null
  classId: string | null
  hasParent: boolean
}

type ClassOption = { id: string; label: string }

export function StudentsClient({
  students,
  classOptions,
}: {
  students: StudentRow[]
  classOptions: ClassOption[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [excelOpen, setExcelOpen]   = useState(false)
  const [query, setQuery]           = useState('')

  async function handleSampleDownload() {
    const XLSX = await import('xlsx')
    const data = [
      { 이름: '홍길동', 전화번호: '01012345678', 초기비밀번호: 'pass1234', 학교명: '세종고', 학년: '1', 분반명: '수학A반', 학부모전화번호: '01011112222' },
      { 이름: '김철수', 전화번호: '01087654321', 초기비밀번호: 'pass1234', 학교명: '강남고', 학년: '2', 분반명: '수학A반', 학부모전화번호: '01033334444' },
      { 이름: '이영희', 전화번호: '01055556666', 초기비밀번호: 'pass5678', 학교명: '세종중', 학년: '3', 분반명: '영어B반', 학부모전화번호: '' },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학생목록')
    XLSX.writeFile(wb, '학생_일괄등록_샘플.xlsx')
  }

  const filtered = students.filter(
    (s) =>
      s.name.includes(query) ||
      s.phone.includes(query) ||
      (s.className ?? '').includes(query),
  )

  return (
    <>
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">학생 관리</h1>
          <p className="mt-0.5 text-sm text-zinc-400">총 {students.length}명</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSampleDownload}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            샘플 다운로드
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

      {/* 검색 */}
      <div className="mb-4 max-w-sm">
        <InputField
          type="search"
          placeholder="이름, 전화번호, 반 이름으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                  {query ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-zinc-900">{s.name}</div>
                    <div className="text-[11px] text-zinc-400">
                      {s.school || '학교 미지정'} · {s.grade ? `${s.grade}학년` : '학년 미지정'}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-zinc-500">{s.phone}</td>
                  <td className="px-5 py-3.5">
                    {s.className ? (
                      <Link href={`/admin/classes/${s.classId}`} className="text-zinc-700 hover:underline">
                        {s.className}
                      </Link>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-5 py-3.5 text-center">
                    <span className={`inline-block h-2 w-2 rounded-full ${s.hasParent ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      s.is_active ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-50 text-zinc-300'
                    }`}>
                      {s.is_active ? '활성' : '비활성'}
                    </span>
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
