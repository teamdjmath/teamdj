import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { getVisibleClassOptions } from '@/lib/data/class-options'
import { MessagesClient } from './_components/messages-client'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; tab?: string }>
}) {
  const { studentId: preselectedStudentId, tab } = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()
  const user = await getVerifiedUser()
  const userId = user!.id
  const role = user!.user_metadata?.role as string | undefined
  const isTeacher = role === 'teacher'
  const canSendKakao = role === 'teacher' || role === 'ta_desk'

  const [classOptions, membersResult, messagesResult, kakaoResult, inquiriesResult] = await Promise.all([
    getVisibleClassOptions(),
    supabase
      .from('class_members')
      .select('class_id, student_id, users!student_id(name)')
      .eq('is_active', true),
    supabase
      .from('push_messages')
      .select(
        'id, content, created_at, class_id, student_id, class_groups!class_id(name), users!student_id(name)',
      )
      .eq('sender_id', userId)
      .eq('is_system', false)
      .order('created_at', { ascending: false })
      .limit(30),
    // kakao_broadcasts는 생성 타입에 아직 없는 테이블(084 추가)이라 캐스팅으로 접근
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('kakao_broadcasts')
      .select('id, audience, scope, title, content, sent_count, created_at, class_groups:class_id(name), users:student_id(name)')
      .order('created_at', { ascending: false })
      .limit(30),
    // 문의는 teacher만 — 다른 스태프는 조회 자체를 안 해 데이터가 새지 않게 한다
    isTeacher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (admin as any)
          .from('student_inquiries')
          .select('id, user_id, student_name, content, is_read, created_at, users!user_id(school, grade)')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const classes = classOptions.map((c) => ({ id: c.id, name: c.name }))

  const students: { id: string; name: string; classId: string }[] = []
  const seen = new Set<string>()
  for (const m of membersResult.data ?? []) {
    const sid = m.student_id as string
    if (seen.has(sid)) continue
    seen.add(sid)
    const u = m.users as { name: string } | null
    if (u?.name) students.push({ id: sid, name: u.name, classId: m.class_id as string })
  }
  students.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const messages = (messagesResult.data ?? []).map((m) => {
    const cg = m.class_groups as { name: string } | null
    const u = m.users as { name: string } | null
    const targetLabel = cg?.name ? `분반: ${cg.name}` : u?.name ? `학생: ${u.name}` : '전체 학생'
    return {
      id: m.id as string,
      content: m.content as string,
      createdAt: m.created_at as string,
      targetLabel,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kakaoBroadcasts = ((kakaoResult.data ?? []) as any[]).map((k) => {
    const cg = k.class_groups as { name: string } | null
    const u = k.users as { name: string } | null
    const scopeLabel = k.scope === 'class' ? `분반: ${cg?.name ?? ''}` : k.scope === 'individual' ? `학생: ${u?.name ?? ''}` : '전체'
    return {
      id: k.id as string,
      audience: k.audience as 'student' | 'parent',
      title: k.title as string,
      content: k.content as string,
      sentCount: k.sent_count as number,
      createdAt: k.created_at as string,
      targetLabel: `${k.audience === 'parent' ? '학부모' : '학생'} · ${scopeLabel}`,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inquiries = ((inquiriesResult.data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    student_name: r.student_name as string,
    school: (r.users as { school?: string; grade?: string } | null)?.school ?? '',
    grade: (r.users as { school?: string; grade?: string } | null)?.grade ?? '',
    content: r.content as string,
    is_read: r.is_read as boolean,
    created_at: r.created_at as string,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">문의 & 발송</h1>
        <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-600">학생 문의 확인, 쪽지·카카오톡 발송을 한 곳에서 관리하세요.</p>
      </div>
      <MessagesClient
        classes={classes}
        students={students}
        messages={messages}
        kakaoBroadcasts={kakaoBroadcasts}
        inquiries={inquiries}
        isTeacher={isTeacher}
        canSendKakao={canSendKakao}
        initialStudentId={preselectedStudentId ?? null}
        initialTab={tab === 'inquiries' ? 'inquiries' : tab === 'send' ? 'send' : null}
      />
    </div>
  )
}
