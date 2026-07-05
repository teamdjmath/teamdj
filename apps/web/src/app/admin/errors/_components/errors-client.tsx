'use client'

import { useRouter } from 'next/navigation'

export type ErrorRow = {
  id: string
  source: string
  severity: string
  category: string
  message: string
  digest: string
  url: string
  userRole: string
  createdAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
  auth:       '인증',
  permission: '권한',
  validation: '입력값',
  db:         'DB',
  network:    '네트워크',
  unknown:    '기타',
}

const CATEGORY_BADGE: Record<string, string> = {
  auth:       'bg-amber-50 text-amber-700',
  permission: 'bg-red-50 text-red-600',
  validation: 'bg-blue-50 text-blue-600',
  db:         'bg-purple-50 text-purple-600',
  network:    'bg-cyan-50 text-cyan-700',
  unknown:    'bg-zinc-100 text-zinc-600',
}

const SOURCE_LABELS: Record<string, string> = {
  client:   '브라우저',
  boundary: '화면 오류',
  server:   '서버',
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ErrorsClient({ errors, categoryFilter }: { errors: ErrorRow[]; categoryFilter: string | null }) {
  const router = useRouter()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-950">오류 로그</h1>
        <p className="mt-0.5 text-sm text-zinc-400">웹 전반의 오류 수집 (최근 200건 · 1개월 보관 · Slack 실시간 알림)</p>
      </div>

      {/* 분류 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push('/admin/errors')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
            !categoryFilter ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
          }`}
        >
          전체
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => router.push(`/admin/errors?category=${key}`)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              categoryFilter === key ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        {errors.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">기록된 오류가 없습니다. 🎉</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium whitespace-nowrap">시각</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">분류</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">출처</th>
                <th className="px-4 py-3 font-medium">메시지</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap hidden lg:table-cell">경로</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {errors.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50 transition-colors align-top">
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap tabular-nums">
                    {formatDatetime(e.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGE[e.category] ?? CATEGORY_BADGE.unknown}`}>
                      {CATEGORY_LABELS[e.category] ?? e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {SOURCE_LABELS[e.source] ?? e.source}
                    {e.userRole && <span className="block text-zinc-400">{e.userRole}</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    <p className="line-clamp-2 break-all max-w-md">{e.message}</p>
                    {e.digest && (
                      <span className="mt-0.5 inline-block font-mono text-[11px] text-zinc-400">{e.digest.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400 hidden lg:table-cell">
                    <span className="line-clamp-1 break-all max-w-[200px]">
                      {e.url ? e.url.replace(/^https?:\/\/[^/]+/, '') : '—'}
                    </span>
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
