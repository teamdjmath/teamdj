import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const { data: students } = await supabase.from('users').select('id, name').or('name.ilike.%유도현%,name.ilike.%김나연%')
console.log('students:', students)

for (const s of students ?? []) {
  const { data: qs } = await supabase
    .from('qna_questions')
    .select('id, title, content, status, subject_id, textbook_id, problem_number, created_at')
    .eq('student_id', s.id)
    .order('created_at', { ascending: false })
  console.log(`\n--- ${s.name} (${s.id}) questions ---`)
  for (const q of qs ?? []) {
    const { data: answers } = await supabase
      .from('qna_answers')
      .select('id, student_rating, is_ai_draft, ta_id, content')
      .eq('question_id', q.id)
    const rated = (answers ?? []).filter(a => a.student_rating != null)
    if (rated.length) {
      console.log(q.id, '|', q.title, '| ratings:', rated.map(a => a.student_rating))
    }
  }
}
