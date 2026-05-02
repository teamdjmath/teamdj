import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClassDetailClient } from './_components/class-detail-client'

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const supabase = await createClient()

  const { data: cls } = await supabase
    .from('class_groups')
    .select('id, name, subject, grade, schedule, is_active')
    .eq('id', classId)
    .single()

  if (!cls) notFound()

  const { data: members } = await supabase
    .from('class_members')
    .select(`
      id,
      is_active,
      enrolled_at,
      users!student_id(id, name, phone)
    `)
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('enrolled_at', { ascending: false })

  type MemberUser = { id: string; name: string; phone: string }
  const students = (members ?? []).map((m) => ({
    memberId:   m.id,
    enrolledAt: m.enrolled_at,
    ...(m.users as unknown as MemberUser),
  }))

  return (
    <div>
      {/* 브레드크럼 */}
      <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/admin/classes" className="hover:text-zinc-700">분반 관리</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{cls.name}</span>
      </div>

      {/* 분반 정보 */}
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-950">{cls.name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                cls.is_active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
              }`}>
                {cls.is_active ? '활성' : '비활성'}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {cls.subject} · {cls.grade}
              {cls.schedule && ` · ${cls.schedule}`}
            </p>
          </div>
          <Link
            href="/admin/classes"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
          >
            목록으로
          </Link>
        </div>
      </div>

      {/* 소속 학생 */}
      <ClassDetailClient classId={cls.id} students={students} />
    </div>
  )
}
