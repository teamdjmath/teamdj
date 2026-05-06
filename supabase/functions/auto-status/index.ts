// 매 5분마다 외부 cron(또는 pg_cron)으로 호출
// 수업 5분 전 → 선생님/조교 online
// 수업 종료 후 진행 중인 수업 없음 → offline
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function getKorNow() {
  const seoulOffsetMs = 9 * 60 * 60 * 1000
  return new Date(Date.now() + seoulOffsetMs)
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

Deno.serve(async (req) => {
  // 간단한 인증 (Supabase Edge Function 자동 처리 또는 Authorization 헤더)
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabase    = createClient(supabaseUrl, serviceKey)

  const now      = getKorNow()
  const today    = now.toISOString().slice(0, 10)           // YYYY-MM-DD
  const dow      = now.getDay()                              // 0=일 … 6=토
  const nowMin   = now.getUTCHours() * 60 + now.getUTCMinutes() + 9 * 60  // KST 분
  const wrapMin  = nowMin % (24 * 60)
  const soon     = wrapMin + 5                               // 5분 후

  // ── 1. 활성 분반 전체 조회 ──────────────────────────────────────
  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, teacher_id, start_time, end_time, day_of_week')
    .eq('is_active', true)
    .not('start_time', 'is', null)
    .not('end_time',   'is', null)
    .not('day_of_week', 'is', null)

  // ── 2. TA 접근 권한 조회 ─────────────────────────────────────────
  const { data: taAccess } = await supabase
    .from('ta_class_access')
    .select('ta_id, class_id, is_all_classes')

  // ── 3. 모든 staff 조회 ───────────────────────────────────────────
  const { data: staffRows } = await supabase
    .from('users')
    .select('id')
    .in('role', ['teacher', 'ta'])

  const staffIds = (staffRows ?? []).map((s: { id: string }) => s.id)

  // ── 4. 각 staff별 현재 수업 상태 계산 ───────────────────────────
  const toOnline  = new Set<string>()
  const hasActive = new Set<string>()

  for (const cls of classes ?? []) {
    if (!(cls.day_of_week as number[]).includes(dow)) continue

    const startMin = timeToMin(cls.start_time as string)
    const endMin   = timeToMin(cls.end_time   as string)

    const aboutToStart = soon >= startMin && wrapMin < startMin
    const inProgress   = wrapMin >= startMin && wrapMin < endMin

    // 이 수업 관련 선생님/TA
    const staffForClass = new Set<string>()
    staffForClass.add(cls.teacher_id as string)

    for (const ta of taAccess ?? []) {
      if (
        (ta.is_all_classes as boolean) ||
        (ta.class_id as string) === (cls.id as string)
      ) {
        staffForClass.add(ta.ta_id as string)
      }
    }

    if (aboutToStart || inProgress) {
      staffForClass.forEach((id) => toOnline.add(id))
    }
    if (inProgress) {
      staffForClass.forEach((id) => hasActive.add(id))
    }
  }

  // ── 5. extra_schedules 처리 ──────────────────────────────────────
  const { data: extras } = await supabase
    .from('extra_schedules')
    .select('user_id, start_time, end_time')
    .eq('scheduled_date', today)

  for (const ex of extras ?? []) {
    const startMin = timeToMin(ex.start_time as string)
    const endMin   = timeToMin(ex.end_time   as string)

    const aboutToStart = soon >= startMin && wrapMin < startMin
    const inProgress   = wrapMin >= startMin && wrapMin < endMin

    if (aboutToStart || inProgress) toOnline.add(ex.user_id as string)
    if (inProgress)                 hasActive.add(ex.user_id as string)
  }

  // ── 6. Upsert staff_status ───────────────────────────────────────
  const upserts: { user_id: string; status: string; updated_at: string }[] = []
  const ts = new Date().toISOString()

  for (const uid of toOnline) {
    upserts.push({ user_id: uid, status: 'online', updated_at: ts })
  }

  // 수업 없는 staff 중 현재 online인 경우 → offline
  const { data: currentOnline } = await supabase
    .from('staff_status')
    .select('user_id')
    .eq('status', 'online')

  for (const row of currentOnline ?? []) {
    const uid = row.user_id as string
    if (!toOnline.has(uid) && !hasActive.has(uid)) {
      upserts.push({ user_id: uid, status: 'offline', updated_at: ts })
    }
  }

  if (upserts.length > 0) {
    await supabase
      .from('staff_status')
      .upsert(upserts, { onConflict: 'user_id' })
  }

  return new Response(
    JSON.stringify({ ok: true, online: [...toOnline], processed: upserts.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
