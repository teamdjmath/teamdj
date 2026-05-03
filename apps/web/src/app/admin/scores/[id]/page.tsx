import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TestDetailClient } from './_components/test-detail-client'

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminSupabase = createAdminClient()

  const { data: test } = await adminSupabase
    .from('tests')
    .select('id, title, exam_type, test_date, total_q, obj_q, subj_q, difficulty, max_score, grade_cuts, class_id, class_groups!class_id(name)')
    .eq('id', id)
    .single()

  if (!test) notFound()

  const classId   = test.class_id  as string
  const className = (test.class_groups as unknown as { name: string } | null)?.name ?? ''

  // 해당 분반의 활성 학생 목록
  const { data: members } = await adminSupabase
    .from('class_members')
    .select('student_id, users!student_id(name)')
    .eq('class_id', classId)
    .eq('is_active', true)

  const students = (members ?? [])
    .map((m) => ({
      id:   m.student_id as string,
      name: ((m.users as unknown as { name: string } | null)?.name ?? '') as string,
    }))
    .filter((s) => s.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  // 이 테스트에 기입된 점수
  const { data: scores } = await adminSupabase
    .from('test_scores')
    .select('student_id, score')
    .eq('test_id', id)

  const scoreMap: Record<string, number> = {}
  for (const s of scores ?? []) {
    scoreMap[s.student_id as string] = s.score as number
  }

  const totalQ    = test.total_q   as number | null
  const objQ      = test.obj_q     as number | null
  const subjQ     = test.subj_q    as number | null
  const difficulty= (test.difficulty ?? '') as string
  const maxScore  = test.max_score as number
  const gradeCuts = test.grade_cuts as Record<string, number> | null
  const examType  = test.exam_type  as string

  return (
    <div className="max-w-4xl mx-auto">
      {/* 뒤로가기 */}
      <div className="mb-4">
        <Link
          href="/admin/scores"
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← 테스트 목록
        </Link>
      </div>

      {/* 테스트 정보 헤더 */}
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-950">{test.title as string}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {className} · {test.test_date as string}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              examType === '일반' ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-white'
            }`}
          >
            {examType}
          </span>
        </div>

        {(totalQ || objQ || subjQ || difficulty || maxScore !== 100) && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-600">
            {totalQ     && <span>총문항 <b className="text-zinc-900">{totalQ}</b></span>}
            {objQ       && <span>객관식 <b className="text-zinc-900">{objQ}</b></span>}
            {subjQ      && <span>주관식 <b className="text-zinc-900">{subjQ}</b></span>}
            {difficulty && <span>난이도 <b className="text-zinc-900">{difficulty}</b></span>}
            <span>만점 <b className="text-zinc-900">{maxScore}</b></span>
          </div>
        )}
      </div>

      <TestDetailClient
        testId={id}
        students={students}
        scoreMap={scoreMap}
        gradeCuts={gradeCuts}
        examType={examType}
        maxScore={maxScore}
      />
    </div>
  )
}
