import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const ids = {
  유도현: 'fb8cf458-0916-4b6b-9e37-94671b696ffe',
  김나연: '71541e40-d760-488f-a7d1-91712ed19a84',
}

for (const [name, id] of Object.entries(ids)) {
  const { data: qs } = await supabase
    .from('qna_questions')
    .select('id, title, content, status, subject_id, textbook_id, problem_number, created_at')
    .eq('student_id', id)
    .order('created_at', { ascending: false })
  console.log(`\n=== ${name} (${id}) — ${qs?.length ?? 0}건 ===`)
  for (const q of qs ?? []) {
    console.log(q.id, '|', q.status, '|', q.title, '|', q.created_at)
  }
}
