import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const qids = [
  '1af7d3e4-b569-45e1-a6eb-857bc6adc3ec',
  '3c6ce698-b7b4-446b-a048-a45f4c6bd297',
  'e78ffc5b-9975-48be-9c9d-40bcc9d0cbb4',
]

for (const qid of qids) {
  const { data: q } = await supabase.from('qna_questions').select('*').eq('id', qid).single()
  let subjectName = null
  if (q.subject_id) {
    const { data: s } = await supabase.from('subjects').select('name').eq('id', q.subject_id).maybeSingle()
    subjectName = s?.name ?? null
  }
  const { data: answers } = await supabase
    .from('qna_answers')
    .select('id, content, student_rating, is_ai_draft, ta_id, answered_at')
    .eq('question_id', qid)
    .order('answered_at', { ascending: true })
  console.log('='.repeat(90))
  console.log('question:', qid, '| subject:', subjectName, '| title:', q.title)
  console.log('content:', q.content)
  console.log('image_urls:', q.image_urls)
  for (const a of answers ?? []) {
    console.log('--- answer', a.id, '| rating:', a.student_rating, '| ai_draft:', a.is_ai_draft, '| ta_id:', a.ta_id, '---')
    console.log(a.content)
  }
}
