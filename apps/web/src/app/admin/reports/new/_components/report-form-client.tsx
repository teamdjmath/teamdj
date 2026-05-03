'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, useRef } from 'react'
import { SelectField, InputField } from '@/components/ui/form-field'
import { Modal } from '@/components/ui/modal'
import { ReportCard } from '../../_components/report-card'
import { saveReport } from '@/lib/actions/reports'
import type { ReportContent } from '@/lib/actions/reports'
import type { ReportCardData } from '../../_components/report-card'

type ClassOption = { id: string; name: string }
type Student = { id: string; name: string }

interface Props {
  classOptions: ClassOption[]
  students: Student[]
  selectedClassId: string | null
  selectedStudentId: string | null
  studentName: string
  className: string
  autoData: Pick<ReportContent, 'recentScores' | 'attendanceSummary' | 'avgAssignmentPct'> | null
}

const TODAY = new Date().toISOString().split('T')[0]

export function ReportFormClient({
  classOptions,
  students,
  selectedClassId,
  selectedStudentId,
  studentName,
  className,
  autoData,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errMsg, setErrMsg] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [capturing, setCapturing] = useState(false)

  const [form, setForm] = useState({
    studyContent: '',
    homework: '',
    notes: '',
    announcement: '',
    reportDate: TODAY,
  })

  const cardRef = useRef<HTMLDivElement | null>(null)

  function handleClassChange(classId: string) {
    const p = new URLSearchParams()
    if (classId) p.set('classId', classId)
    router.push(`/admin/reports/new?${p.toString()}`)
  }

  function handleStudentChange(studentId: string) {
    const p = new URLSearchParams()
    if (selectedClassId) p.set('classId', selectedClassId)
    if (studentId) p.set('studentId', studentId)
    router.push(`/admin/reports/new?${p.toString()}`)
  }

  const cardData: ReportCardData | null =
    selectedClassId && selectedStudentId && autoData
      ? {
          studentName,
          className,
          reportDate: form.reportDate,
          content: {
            studyContent: form.studyContent,
            homework: form.homework,
            notes: form.notes,
            announcement: form.announcement,
            recentScores: autoData.recentScores,
            attendanceSummary: autoData.attendanceSummary,
            avgAssignmentPct: autoData.avgAssignmentPct,
          },
        }
      : null

  async function handleSave() {
    if (!cardData || !selectedClassId || !selectedStudentId) {
      setErrMsg('분반과 학생을 선택하세요.')
      return
    }
    if (!form.studyContent.trim()) {
      setErrMsg('이번 시간 학습 내용을 입력하세요.')
      return
    }
    setErrMsg('')
    setCapturing(true)

    try {
      const { toPng } = await import('html-to-image')
      if (!cardRef.current) throw new Error('카드 요소를 찾을 수 없습니다.')

      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      })

      setCapturing(false)

      startTransition(async () => {
        const result = await saveReport({
          classId: selectedClassId,
          studentId: selectedStudentId,
          reportDate: form.reportDate,
          contentJson: cardData.content,
          imageBase64: dataUrl,
        })

        if (result.error) {
          setErrMsg(result.error)
          return
        }

        router.push(`/admin/reports/${result.id}`)
      })
    } catch (e) {
      setCapturing(false)
      setErrMsg(e instanceof Error ? e.message : '이미지 생성에 실패했습니다.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 왼쪽: 입력 폼 */}
      <div className="space-y-5">
        {/* 분반 + 학생 선택 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">기본 정보</h2>

          <SelectField
            label="분반"
            required
            value={selectedClassId ?? ''}
            onChange={(e) => handleClassChange(e.target.value)}
          >
            <option value="">선택하세요</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>

          <SelectField
            label="학생"
            required
            value={selectedStudentId ?? ''}
            onChange={(e) => handleStudentChange(e.target.value)}
            disabled={!selectedClassId || students.length === 0}
          >
            <option value="">{selectedClassId ? '선택하세요' : '분반을 먼저 선택하세요'}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </SelectField>

          <InputField
            label="리포트 날짜"
            type="date"
            required
            value={form.reportDate}
            onChange={(e) => setForm((f) => ({ ...f, reportDate: e.target.value }))}
          />
        </div>

        {/* 자동 수집 데이터 요약 */}
        {autoData && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">자동 수집 데이터</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white border border-zinc-200 py-3">
                <div className="text-xl font-bold text-zinc-950">
                  {autoData.recentScores.length > 0 ? Math.round(autoData.recentScores[0].score) : '-'}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">최근 점수</div>
              </div>
              <div className="rounded-lg bg-white border border-zinc-200 py-3">
                <div className="text-xl font-bold text-zinc-950">
                  {autoData.attendanceSummary.total > 0
                    ? `${Math.round((autoData.attendanceSummary.present / autoData.attendanceSummary.total) * 100)}%`
                    : '-'}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">출석률 (30일)</div>
              </div>
              <div className="rounded-lg bg-white border border-zinc-200 py-3">
                <div className="text-xl font-bold text-zinc-950">{autoData.avgAssignmentPct}%</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">과제 완료율</div>
              </div>
            </div>
          </div>
        )}

        {/* 리포트 내용 입력 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">리포트 내용</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              이번 시간 학습 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.studyContent}
              onChange={(e) => setForm((f) => ({ ...f, studyContent: e.target.value }))}
              placeholder="예: 수열과 급수 1단원 — 등차수열 개념 및 공식 학습"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm resize-none focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">다음 시간 과제</label>
            <textarea
              rows={2}
              value={form.homework}
              onChange={(e) => setForm((f) => ({ ...f, homework: e.target.value }))}
              placeholder="예: 교재 p.52 1~15번"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm resize-none focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">특이사항</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="예: 집중력이 크게 향상되었습니다."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm resize-none focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">공지사항</label>
            <textarea
              rows={2}
              value={form.announcement}
              onChange={(e) => setForm((f) => ({ ...f, announcement: e.target.value }))}
              placeholder="예: 다음 주 금요일 모의고사가 있습니다."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm resize-none focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {errMsg && <p className="text-sm text-red-500">{errMsg}</p>}

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => { if (cardData) setPreviewOpen(true) }}
            disabled={!cardData}
            className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-40"
          >
            미리보기
          </button>
          <button
            onClick={handleSave}
            disabled={!cardData || capturing || pending}
            className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {capturing ? '이미지 생성 중...' : pending ? '저장 중...' : '저장 및 완료'}
          </button>
        </div>
      </div>

      {/* 오른쪽: 실시간 미리보기 */}
      <div className="hidden lg:block">
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">실시간 미리보기</h2>
        {cardData ? (
          <div className="overflow-x-auto">
            <ReportCard data={cardData} cardRef={cardRef} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center h-[400px]">
            <p className="text-sm text-zinc-400">분반과 학생을 선택하면<br />미리보기가 표시됩니다.</p>
          </div>
        )}
      </div>

      {/* 미리보기 모달 (모바일용 + 저장 확인) */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="리포트 미리보기" size="lg">
        {cardData && (
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {/* 모달 내 미리보기 (캡처는 데스크탑 cardRef 사용) */}
              <ReportCard data={cardData} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewOpen(false)}
                className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => { setPreviewOpen(false); handleSave() }}
                disabled={capturing || pending}
                className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                저장 및 완료
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 저장용 숨겨진 카드 (모바일에서도 캡처 가능하게) */}
      {cardData && (
        <div
          className="lg:hidden"
          style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <ReportCard data={cardData} cardRef={cardRef} />
        </div>
      )}
    </div>
  )
}
