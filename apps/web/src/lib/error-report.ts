// 서버 전용 — 오류를 error_logs 테이블에 저장하고 Slack으로 개발자에게 알린다.
// 절대 throw하지 않는다: 오류 보고가 원래 동작을 깨뜨리면 안 됨.
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type ErrorCategory = 'auth' | 'permission' | 'validation' | 'db' | 'network' | 'unknown'

export type ErrorReport = {
  source: 'client' | 'server' | 'boundary'
  severity?: 'warn' | 'error'
  message: string
  digest?: string
  url?: string
  userId?: string
  userRole?: string
  userAgent?: string
  context?: Record<string, unknown>
}

// PG 코드·메시지 패턴으로 오류를 분류 — 사용자 안내 문구와 Slack 필터링에 사용
export function categorizeError(message: string, code?: string): ErrorCategory {
  const msg = message.toLowerCase()
  if (code === '42501' || msg.includes('권한') || msg.includes('permission') || msg.includes('rls')) return 'permission'
  if (msg.includes('인증') || msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('session')) return 'auth'
  if (code === '23505' || code === '23503' || code === '23514' || msg.includes('중복') || msg.includes('입력')) return 'validation'
  if (code?.startsWith('PGRST') || code?.startsWith('23') || code?.startsWith('42') || msg.includes('database') || msg.includes('supabase')) return 'db'
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('econnr')) return 'network'
  return 'unknown'
}

// 분류별 사용자 안내 문구 (에러 UI에서 사용)
export const CATEGORY_USER_MESSAGE: Record<ErrorCategory, string> = {
  auth:       '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
  permission: '이 작업을 수행할 권한이 없습니다.',
  validation: '입력한 내용에 문제가 있습니다. 다시 확인해주세요.',
  db:         '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  network:    '네트워크 연결이 불안정합니다. 연결 상태를 확인해주세요.',
  unknown:    '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

// Slack 중복 방지: 같은 오류(메시지 기준)는 인스턴스당 5분에 1번만 발송
const slackSent = new Map<string, number>()
const SLACK_DEDUPE_MS = 5 * 60 * 1000

async function notifySlack(report: ErrorReport, category: ErrorCategory): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return
  if (report.severity === 'warn') return  // warn은 DB에만 저장, Slack 제외

  const key = report.digest || report.message.slice(0, 80)
  const last = slackSent.get(key)
  if (last && Date.now() - last < SLACK_DEDUPE_MS) return
  slackSent.set(key, Date.now())

  const lines = [
    `🚨 *TeamDJ 오류* [${category}] (${report.source})`,
    `> ${report.message.slice(0, 300)}`,
    report.url    ? `경로: \`${report.url}\``     : null,
    report.digest ? `digest: \`${report.digest}\`` : null,
    report.userRole ? `사용자: ${report.userRole}` : null,
  ].filter(Boolean)

  try {
    await fetch(webhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: lines.join('\n') }),
    })
  } catch {}
}

export async function reportError(report: ErrorReport): Promise<void> {
  const category = categorizeError(
    report.message,
    typeof report.context?.supabaseCode === 'string' ? report.context.supabaseCode : undefined,
  )

  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('error_logs').insert({
      source:     report.source,
      severity:   report.severity ?? 'error',
      category,
      message:    report.message.slice(0, 1000),
      digest:     report.digest ?? '',
      url:        (report.url ?? '').slice(0, 500),
      user_id:    report.userId ?? null,
      user_role:  report.userRole ?? '',
      user_agent: (report.userAgent ?? '').slice(0, 300),
      context:    report.context ?? null,
    })
  } catch (e) {
    // DB 저장 실패 시 stdout에라도 남긴다 (Vercel 로그)
    logger.warn('reportError:insert-failed', { action: 'reportError', error: e })
  }

  void notifySlack(report, category)
}
