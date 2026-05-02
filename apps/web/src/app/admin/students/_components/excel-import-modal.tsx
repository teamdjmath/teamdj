'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { bulkCreateStudents, type StudentBulkRow } from '@/lib/actions/students'

type ParsedRow = StudentBulkRow & { _idx: number }

type BulkResult = {
  succeeded: number
  failed: Array<{ name: string; phone: string; reason: string }>
}

export function ExcelImportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows]       = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult]   = useState<BulkResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setRows([])
    setParseError(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setRows([])
    setResult(null)

    try {
      // 동적 import (xlsx는 크기가 크므로 필요할 때만 로드)
      const XLSX = await import('xlsx')
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

      const parsed: ParsedRow[] = raw.map((row, i) => ({
        _idx:      i + 2, // 엑셀 행 번호 (헤더=1)
        name:      String(row['이름'] ?? row['name'] ?? '').trim(),
        phone:     String(row['전화번호'] ?? row['phone'] ?? '').trim(),
        password:  String(row['초기비밀번호'] ?? row['password'] ?? '').trim(),
        className: String(row['분반명'] ?? row['class'] ?? '').trim(),
      }))

      // 빈 행 제거 + 기본 유효성 검사
      const valid = parsed.filter((r) => r.name && r.phone && r.password)
      if (valid.length === 0) {
        setParseError('유효한 데이터가 없습니다. 컬럼명을 확인해주세요.')
        return
      }

      setRows(valid)
    } catch {
      setParseError('파일 파싱에 실패했습니다.')
    }
  }

  function handleImport() {
    startTransition(async () => {
      const res = await bulkCreateStudents(rows.map(({ _idx: _, ...r }) => r))
      setResult(res)
      if (res.succeeded > 0) router.refresh()
    })
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="엑셀 일괄 등록" size="lg">
      {/* 완료 화면 */}
      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
            <p className="text-sm font-semibold text-zinc-900">등록 완료</p>
            <p className="mt-1 text-sm text-zinc-600">
              성공 <span className="font-bold text-zinc-900">{result.succeeded}명</span>
              {result.failed.length > 0 && (
                <span> · 실패 <span className="font-bold text-red-500">{result.failed.length}명</span></span>
              )}
            </p>
          </div>

          {result.failed.length > 0 && (
            <div className="rounded-xl border border-red-100 overflow-hidden">
              <div className="bg-red-50 px-4 py-2">
                <p className="text-xs font-semibold text-red-700">실패 목록</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-red-100 bg-red-50/50">
                    <th className="px-4 py-2 text-left text-red-600">이름</th>
                    <th className="px-4 py-2 text-left text-red-600">전화번호</th>
                    <th className="px-4 py-2 text-left text-red-600">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((f, i) => (
                    <tr key={i} className="border-b border-red-50">
                      <td className="px-4 py-2 text-zinc-700">{f.name}</td>
                      <td className="px-4 py-2 text-zinc-500">{f.phone}</td>
                      <td className="px-4 py-2 text-red-500">{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              다시 업로드
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              닫기
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 파일 업로드 */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              엑셀 파일 선택 (.xlsx)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-700"
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">
              필수 컬럼: <span className="font-mono">이름, 전화번호, 초기비밀번호</span> &nbsp;|&nbsp;
              선택: <span className="font-mono">분반명</span>
            </p>
            {parseError && (
              <p className="mt-1.5 text-xs text-red-500">{parseError}</p>
            )}
          </div>

          {/* 미리보기 테이블 */}
          {rows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-600">
                미리보기 — {rows.length}명
              </p>
              <div className="overflow-auto max-h-64 rounded-xl border border-zinc-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">행</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">이름</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">전화번호</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">분반명</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map((r) => (
                      <tr key={r._idx}>
                        <td className="px-4 py-2 text-zinc-400">{r._idx}</td>
                        <td className="px-4 py-2 text-zinc-800">{r.name}</td>
                        <td className="px-4 py-2 text-zinc-600">{r.phone}</td>
                        <td className="px-4 py-2 text-zinc-500">{r.className || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={rows.length === 0 || isPending}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? `등록 중… (0/${rows.length})` : `${rows.length}명 등록`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
