import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

const TODAY = new Date().toISOString().split('T')[0]

const CATEGORY_STYLE: Record<string, string> = {
  '매월승리': 'bg-zinc-950 text-white',
  'KBS': 'bg-zinc-700 text-white',
  'EB-Schema': 'bg-zinc-400 text-white',
}

function catStyle(cat: string | null) {
  return cat ? (CATEGORY_STYLE[cat] ?? 'bg-zinc-100 text-zinc-500') : 'bg-zinc-100 text-zinc-500'
}

export default async function LearningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', userId)
    .eq('is_active', true)

  const classIds = (memberships ?? []).map((m) => m.class_id as string)

  const [lecturesResult, assignmentsResult] = await Promise.all([
    classIds.length
      ? supabase
          .from('lectures')
          .select('id, title, youtube_video_id, order_num')
          .in('class_id', classIds)
          .order('order_num', { ascending: true })
          .limit(30)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    classIds.length
      ? supabase
          .from('assignments')
          .select('id, title, due_date, category, week_num')
          .in('class_id', classIds)
          .order('week_num', { ascending: false })
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  const lectures = lecturesResult.data ?? []
  const assignments = assignmentsResult.data ?? []

  const assignmentIds = assignments.map((a) => a.id as string)
  const { data: progressRows } = assignmentIds.length
    ? await supabase
        .from('assignment_progress')
        .select('assignment_id, completion_pct')
        .eq('student_id', userId)
        .in('assignment_id', assignmentIds)
    : { data: [] as { assignment_id: string; completion_pct: number }[] }

  const progressMap: Record<string, number> = {}
  for (const p of progressRows ?? []) {
    progressMap[p.assignment_id as string] = (p.completion_pct ?? 0) as number
  }

  // 주차별 그룹핑
  type Assignment = (typeof assignments)[number]
  const weekGroups: Record<number, Assignment[]> = {}
  for (const a of assignments) {
    const wk = (a.week_num as number) ?? 0
    if (!weekGroups[wk]) weekGroups[wk] = []
    weekGroups[wk]!.push(a)
  }
  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => b - a)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">학습</h1>

      {/* 강의 영상 */}
      <Card>
        <CardHeader title="강의 영상" />
        <div className="px-5 pb-5">
          {lectures.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {lectures.map((lec) => (
                <a
                  key={lec.id as string}
                  href={`https://www.youtube.com/watch?v=${lec.youtube_video_id as string}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl overflow-hidden border border-zinc-100 hover:border-zinc-300 transition-colors"
                >
                  <div className="relative aspect-video bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${lec.youtube_video_id as string}/mqdefault.jpg`}
                      alt={lec.title as string}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <svg className="h-10 w-10 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
                      {lec.order_num as number}강
                    </span>
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-zinc-800 line-clamp-2 leading-tight">
                      {lec.title as string}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState message="등록된 강의 영상이 없습니다." />
          )}
        </div>
      </Card>

      {/* 주간 과제 */}
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
                    const pct = progressMap[a.id as string] ?? 0
                    const isOverdue = a.due_date && (a.due_date as string) < TODAY && pct < 100
                    return (
                      <li key={a.id as string}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${catStyle(a.category as string | null)}`}
                            >
                              {(a.category as string) || '기타'}
                            </span>
                            <span
                              className={`truncate text-sm ${isOverdue ? 'text-red-600' : 'text-zinc-800'}`}
                            >
                              {a.title as string}
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
                        {a.due_date && (
                          <p className={`mt-0.5 text-[10px] ${isOverdue ? 'text-red-400' : 'text-zinc-400'}`}>
                            마감 {new Date(a.due_date as string).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
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
