import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { estimateCostKrw } from '@/lib/ai-pricing'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { MonitoringClient, type BehaviorStats, type AiUsageStats, type AiFeedbackStats } from './_components/monitoring-client'
import { QNA_FEEDBACK_CATEGORY_LABEL as FEEDBACK_CATEGORY_LABEL } from '@/lib/qna-status'

// "AI 답변이 부족했다"는 학생 피드백을 문항/카테고리별로 집계 — 어떤 문항에서 AI가
// 자주 틀리는지, 어떤 유형의 부족함이 많은지 파악하기 위함 (최근 90일)
async function getAiFeedbackStats(admin: ReturnType<typeof createAdminClient>): Promise<AiFeedbackStats | null> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('qna_ai_feedback')
    .select('category, question:qna_questions!question_id(title, problem_number, textbook:textbooks!textbook_id(name))')
    .gte('created_at', since)

  if (error) return null

  const byCategory = new Map<string, number>()
  const byProblem = new Map<string, number>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1)
    const q = row.question as { title?: string; problem_number?: string; textbook?: { name?: string } } | null
    const label = q?.textbook?.name && q?.problem_number
      ? `${q.textbook.name} · ${q.problem_number}`
      : (q?.title || '제목 없음')
    byProblem.set(label, (byProblem.get(label) ?? 0) + 1)
  }

  return {
    total: (data ?? []).length,
    byCategory: [...byCategory.entries()]
      .map(([category, count]) => ({ category, label: FEEDBACK_CATEGORY_LABEL[category] ?? category, count }))
      .sort((a, b) => b.count - a.count),
    byProblem: [...byProblem.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  }
}

export const dynamic = 'force-dynamic'

// 최근 7일 로그인 성공/실패 — auth.audit_log_entries는 이 Supabase 버전에서 항상 비어있어
// (인증 이벤트를 DB에 기록하지 않음), signIn 액션이 직접 남기는 audit_logs를 센다.
async function getLogin7d(admin: ReturnType<typeof createAdminClient>): Promise<{ success: number; failed: number }> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const [successRes, failedRes] = await Promise.all([
    db.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'auth.login').gte('created_at', weekAgo),
    db.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'auth.login_failed').gte('created_at', weekAgo),
  ])
  return { success: successRes.count ?? 0, failed: failedRes.count ?? 0 }
}

// 이번 달 AI 호출량·토큰·예상 요금 집계
async function getAiUsageStats(admin: ReturnType<typeof createAdminClient>): Promise<AiUsageStats | null> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data, error } = await admin
    .from('ai_usage_logs')
    .select('mode, model, prompt_tokens, thoughts_tokens, output_tokens')
    .gte('created_at', monthStart)

  if (error) return null

  let hintCalls = 0, fullCalls = 0, totalTokens = 0, costKrw = 0
  let hintCostKrw = 0, fullCostKrw = 0

  for (const row of data ?? []) {
    const cost = estimateCostKrw(row.prompt_tokens, row.thoughts_tokens, row.output_tokens, row.model)
    totalTokens += row.prompt_tokens + row.thoughts_tokens + row.output_tokens
    costKrw += cost
    if (row.mode === 'full') { fullCalls++; fullCostKrw += cost }
    else { hintCalls++; hintCostKrw += cost }
  }

  return {
    calls: hintCalls + fullCalls,
    hintCalls,
    fullCalls,
    totalTokens,
    costKrw,
    avgHintKrw: hintCalls > 0 ? hintCostKrw / hintCalls : null,
    avgFullKrw: fullCalls > 0 ? fullCostKrw / fullCalls : null,
  }
}

// 집계 쿼리 5분 캐시 — 실시간성이 필요 없는 지표라 매 진입마다 재집계하지 않음
const getBehaviorStats = unstable_cache(
  async (): Promise<{ stats: BehaviorStats | null; aiUsage: AiUsageStats | null; aiFeedback: AiFeedbackStats | null; checkedAt: string }> => {
    const admin = createAdminClient()
    const [rpcRes, aiUsage, aiFeedback, login7d] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).rpc('monitoring_behavior_stats') as Promise<{ data: unknown; error: unknown }>,
      getAiUsageStats(admin),
      getAiFeedbackStats(admin),
      getLogin7d(admin),
    ])
    const stats = rpcRes.error ? null : (rpcRes.data as BehaviorStats)
    // RPC의 login_7d(auth.audit_log_entries 기반, 항상 0)를 자체 기록으로 교체
    if (stats) stats.login_7d = login7d
    return {
      stats,
      aiUsage,
      aiFeedback,
      checkedAt: new Date().toISOString(),
    }
  },
  ['monitoring-behavior-stats'],
  { revalidate: 300 },
)

export default async function MonitoringPage() {
  const user = await getVerifiedUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_desk'].includes(role ?? '')) redirect('/admin/dashboard')

  const { stats, aiUsage, aiFeedback, checkedAt } = await getBehaviorStats()

  return <MonitoringClient stats={stats} aiUsage={aiUsage} aiFeedback={aiFeedback} checkedAt={checkedAt} />
}
