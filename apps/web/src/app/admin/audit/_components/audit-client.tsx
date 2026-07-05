'use client'

import { useRouter } from 'next/navigation'

export type AuditRow = {
  id: string
  actorName: string
  actorRole: string
  action: string
  targetType: string
  targetLabel: string
  detail: Record<string, unknown> | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  'student.create':          '학생 계정 생성',
  'student.delete':          '학생 계정 삭제',
  'student.password_reset':  '비밀번호 초기화',
  'report.delete_session':   '리포트 세션 삭제',
  'report.kakao_batch_send': '카카오 일괄 발송',
  'message.send':            '쪽지 발송',
}

const ROLE_LABELS: Record<string, string> = {
  teacher:      '선생님',
  ta_desk:      '데스크 조교',
  ta_assistant: '보조 조교',
}

// 파괴적 액션은 빨간 배지로 구분
const DESTRUCTIVE = new Set(['student.delete', 'report.delete_session'])

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AuditClient({ logs, actionFilter }: { logs: AuditRow[]; actionFilter: string | null }) {
  const router = useRouter()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-950">감사 로그</h1>
        <p className="mt-0.5 text-sm text-zinc-400">계정·데이터에 영향을 주는 작업 기록 (최근 200건)</p>
      </div>

      {/* 액션 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push('/admin/audit')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
            !actionFilter ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
          }`}
        >
          전체
        </button>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => router.push(`/admin/audit?action=${encodeURIComponent(key)}`)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              actionFilter === key ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">기록된 로그가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">수행자</th>
                <th className="px-4 py-3 font-medium">작업</th>
                <th className="px-4 py-3 font-medium">대상</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap tabular-nums">
                    {formatDatetime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-zinc-900">{log.actorName || '—'}</span>
                    <span className="ml-1.5 text-xs text-zinc-400">{ROLE_LABELS[log.actorRole] ?? log.actorRole}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      DESTRUCTIVE.has(log.action) ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {log.targetLabel || '—'}
                    {log.detail && 'count' in log.detail && (
                      <span className="ml-1.5 text-xs text-zinc-400">({String(log.detail.count)}건)</span>
                    )}
                    {log.detail && 'sent' in log.detail && (
                      <span className="ml-1.5 text-xs text-zinc-400">
                        (성공 {String(log.detail.sent)}
                        {'failed' in log.detail && Number(log.detail.failed) > 0 ? ` · 실패 ${String(log.detail.failed)}` : ''})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
