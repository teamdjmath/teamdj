import { createClient } from '@/lib/supabase/server'
import { MessagesClient } from './_components/messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [classesResult, membersResult, messagesResult] = await Promise.all([
    supabase
      .from('class_groups')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
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
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const classes = (classesResult.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }))

  // 분반별 학생 목록 (name 포함)
  const classNameMap: Record<string, string> = {}
  for (const c of classes) classNameMap[c.id] = c.name

  const students: { id: string; name: string; classId: string }[] = []
  const seen = new Set<string>()
  for (const m of membersResult.data ?? []) {
    const sid = m.student_id as string
    if (seen.has(sid)) continue
    seen.add(sid)
    const u = m.users as unknown as { name: string } | null
    if (u?.name) {
      students.push({ id: sid, name: u.name, classId: m.class_id as string })
    }
  }
  students.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const messages = (messagesResult.data ?? []).map((m) => {
    const cg = m.class_groups as unknown as { name: string } | null
    const u = m.users as unknown as { name: string } | null
    const targetLabel = cg?.name
      ? `분반: ${cg.name}`
      : u?.name
        ? `학생: ${u.name}`
        : '대상 없음'
    return {
      id: m.id as string,
      content: m.content as string,
      createdAt: m.created_at as string,
      targetLabel,
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-950">쪽지 발송</h1>
        <p className="mt-0.5 text-sm text-zinc-400">학생 또는 분반 전체에 쪽지를 보내세요.</p>
      </div>
      <MessagesClient
        classes={classes}
        students={students}
        messages={messages}
      />
    </div>
  )
}
