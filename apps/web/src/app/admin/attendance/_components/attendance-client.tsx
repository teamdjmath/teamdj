'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveAttendance, type AttendanceStatus } from '@/lib/actions/attendance'
import { EmptyState } from '@/components/ui/empty-state'

type Student = { id: string; name: string; phone: string }
type ClassOption = { id: string; label: string }
type LogMap = Record<string, { status: string; absenceReason: string | null }>

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; activeClass: string; inactiveClass: string }
> = {
  present: {
    label:        '출석',
    activeClass:  'bg-zinc-950 text-white',
    inactiveClass:'border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700',
  },
  late: {
    label:        '지각',
    activeClass:  'bg-zinc-600 text-white',
    inactiveClass:'border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700',
  },
  absent: {
    label:        '결석(차감)',
    activeClass:  'bg-zinc-200 text-zinc-700',
    inactiveClass:'border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700',
  },
  absent_video: {
    label:        '결석(영상)',
    activeClass:  'bg-blue-100 text-blue-800',
    inactiveClass:'border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700',
  },
}

const ALL_STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'absent_video']

interface Props {
  classOptions:     ClassOption[]
  selectedClassId:  string | null
  selectedDate:     string
  students:         Student[]
  existingLogs:     LogMap
}

export function AttendanceClient({
  classOptions,
  selectedClassId,
  selectedDate,
  students,
  existingLogs,
}: Props) {
  const router     = useRouter()
  const [isPending, startTransition] = useTransition()

  // 출결 상태: studentId → AttendanceStatus | null (null = 미체크)
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus | null>>(
    () =>
      Object.fromEntries(
        students.map((s) => [
          s.id,
          (existingLogs[s.id]?.status as AttendanceStatus) ?? null,
        ]),
      ),
  )

  // 결석 사유: studentId → string
  const [reasonMap, setReasonMap] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        students.map((s) => [s.id, existingLogs[s.id]?.absenceReason ?? '']),
      ),
  )

  const [saveResult, setSaveResult] = useState<string | null>(null)

  // 상단 컨트롤 변경 시 URL 업데이트 (서버에서 재fetch)
  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams()
    if (e.target.value) params.set('classId', e.target.value)
    params.set('date', selectedDate)
    router.push(`/admin/attendance?${params}`)
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams()
    if (selectedClassId) params.set('classId', selectedClassId)
    params.set('date', e.target.value)
    router.push(`/admin/attendance?${params}`)
  }

  // 토글: 같은 버튼 다시 누르면 null(미체크)로
  const toggle = useCallback((studentId: string, status: AttendanceStatus) => {
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }))
    setSaveResult(null)
  }, [])

  // 전체 일괄 설정
  function setAll(status: AttendanceStatus) {
    setStatusMap(Object.fromEntries(students.map((s) => [s.id, status])))
    setSaveResult(null)
  }

  // 저장
  function handleSave() {
    if (!selectedClassId) return
    setSaveResult(null)

    const entries = students
      .filter((s) => statusMap[s.id] !== null)
      .map((s) => ({
        studentId:      s.id,
        status:         statusMap[s.id]!,
        absenceReason:  reasonMap[s.id] || undefined,
      }))

    if (entries.length === 0) {
      setSaveResult('체크된 항목이 없습니다.')
      return
    }

    startTransition(async () => {
      const res = await saveAttendance(selectedClassId, selectedDate, entries)
      if (!res.success) {
        setSaveResult(`오류: ${res.error}`)
      } else {
        setSaveResult(`✓ ${res.data?.savedCount ?? 0}명 저장 완료`)
        router.refresh()
      }
    })
  }

  // 요약 집계
  const summary = {
    present:      students.filter((s) => statusMap[s.id] === 'present').length,
    late:         students.filter((s) => statusMap[s.id] === 'late').length,
    absent:       students.filter((s) => statusMap[s.id] === 'absent').length,
    absent_video: students.filter((s) => statusMap[s.id] === 'absent_video').length,
    unchecked:    students.filter((s) => statusMap[s.id] === null).length,
  }

  const isExisting = Object.keys(existingLogs).length > 0

  return (
    <div className="space-y-5">

      {/* 페이지 제목 */}
      <div>
        <h1 className="text-xl font-bold text-zinc-950">출석 체크</h1>
        <p className="mt-0.5 text-sm text-zinc-400">반과 날짜를 선택하고 출결을 기록하세요.</p>
      </div>

      {/* 상단 컨트롤 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* 분반 선택 */}
        <div className="flex-1 space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600">분반</label>
          <select
            value={selectedClassId ?? ''}
            onChange={handleClassChange}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          >
            <option value="">반을 선택하세요</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 날짜 선택 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600">날짜</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 반 미선택 */}
      {!selectedClassId && (
        <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center">
          <p className="text-sm text-zinc-400">위에서 분반을 선택하세요.</p>
        </div>
      )}

      {/* 학생 목록 */}
      {selectedClassId && (
        <>
          {/* 기존 데이터 배너 */}
          {isExisting && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <p className="text-xs text-zinc-500">
                {selectedDate} 출결이 이미 기록되어 있습니다. 수정 후 저장하면 덮어씁니다.
              </p>
            </div>
          )}

          {students.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <EmptyState message="소속 학생이 없습니다." description="분반을 먼저 선택하거나 학생을 등록하세요." />
            </div>
          ) : (
            <>
              {/* 일괄 버튼 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 mr-1">일괄:</span>
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAll(s)}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
                  >
                    전원 {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>

              {/* 학생 카드 목록 */}
              <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 w-8">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">이름</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">전화번호</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">출결 상태</th>
                      <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">결석 사유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {students.map((student, idx) => {
                      const current = statusMap[student.id]
                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors ${
                            current === 'absent'       ? 'bg-zinc-50/60' :
                            current === 'late'         ? 'bg-zinc-50/30' :
                            current === 'absent_video' ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          {/* 번호 */}
                          <td className="px-5 py-3.5 text-xs text-zinc-300 tabular-nums">
                            {idx + 1}
                          </td>

                          {/* 이름 */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {/* 상태 인디케이터 */}
                              <span className={`h-2 w-2 shrink-0 rounded-full ${
                                current === 'present'      ? 'bg-zinc-900' :
                                current === 'late'         ? 'bg-zinc-400' :
                                current === 'absent'       ? 'bg-zinc-200' :
                                current === 'absent_video' ? 'bg-blue-300' :
                                'bg-zinc-100'
                              }`} />
                              <span className="text-sm font-medium text-zinc-900">
                                {student.name}
                              </span>
                            </div>
                          </td>

                          {/* 전화번호 */}
                          <td className="hidden sm:table-cell px-5 py-3.5 text-xs text-zinc-400">
                            {student.phone}
                          </td>

                          {/* 출결 토글 버튼 */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {ALL_STATUSES.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => toggle(student.id, status)}
                                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                    current === status
                                      ? STATUS_CONFIG[status].activeClass
                                      : STATUS_CONFIG[status].inactiveClass
                                  }`}
                                >
                                  {STATUS_CONFIG[status].label}
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* 결석 사유 (결석/지각 시 표시) */}
                          <td className="hidden md:table-cell px-5 py-3.5">
                            {(current === 'absent' || current === 'late' || current === 'absent_video') ? (
                              <input
                                type="text"
                                value={reasonMap[student.id] ?? ''}
                                onChange={(e) =>
                                  setReasonMap((prev) => ({
                                    ...prev,
                                    [student.id]: e.target.value,
                                  }))
                                }
                                placeholder="사유 입력 (선택)"
                                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all shadow-sm"
                              />
                            ) : (
                              <span className="text-xs text-zinc-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 하단 요약 + 저장 */}
              <div className="sticky bottom-0 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-lg shadow-zinc-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* 요약 */}
                  <div className="flex items-center gap-5 text-sm">
                    <SummaryItem
                      label="출석"
                      count={summary.present}
                      total={students.length}
                      dotClass="bg-zinc-900"
                    />
                    <SummaryItem
                      label="지각"
                      count={summary.late}
                      total={students.length}
                      dotClass="bg-zinc-400"
                    />
                    <SummaryItem
                      label="결석(차감)"
                      count={summary.absent}
                      total={students.length}
                      dotClass="bg-zinc-200 border border-zinc-300"
                    />
                    <SummaryItem
                      label="결석(영상)"
                      count={summary.absent_video}
                      total={students.length}
                      dotClass="bg-blue-300"
                    />
                    {summary.unchecked > 0 && (
                      <span className="text-xs text-zinc-300">
                        미체크 {summary.unchecked}명
                      </span>
                    )}
                  </div>

                  {/* 저장 버튼 + 결과 메시지 */}
                  <div className="flex items-center gap-3">
                    {saveResult && (
                      <span className={`text-xs ${saveResult.startsWith('오류') ? 'text-red-500' : 'text-zinc-500'}`}>
                        {saveResult}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isPending || summary.unchecked === students.length}
                      className="rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                    >
                      {isPending ? '저장 중…' : '저장'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function SummaryItem({
  label,
  count,
  total,
  dotClass,
}: {
  label: string
  count: number
  total: number
  dotClass: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
      <span className="font-medium text-zinc-800">{label}</span>
      <span className="text-zinc-500">
        {count}명
        <span className="ml-1 text-zinc-300 text-xs">({pct}%)</span>
      </span>
    </div>
  )
}
