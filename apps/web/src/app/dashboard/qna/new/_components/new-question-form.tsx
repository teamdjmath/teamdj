'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createQuestion, getQnaLessonOptions } from '@/lib/actions/qna'
import { QNA_STATUS_LABEL } from '@/lib/qna-status'
import { InputField, TextareaField } from '@/components/ui/form-field'
import { ComboSelect } from '@/components/ui/combo-select'

interface ClassGroup {
  id: string
  name: string
  subject: string
  grade: string
}

const EXTERNAL_TEXTBOOK_NAME = '외부교재'

interface Textbook {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
}

interface SimilarQuestion {
  id: string
  title: string
  status: string
  studentName: string
}

const STATUS_CLS: Record<string, string> = {
  open: 'bg-zinc-100 text-zinc-400',
  in_progress: 'bg-zinc-950 text-white',
  answered: 'bg-zinc-100 text-zinc-900 font-bold',
}

export function NewQuestionForm({
  classes,
  textbooks,
  subjects,
}: {
  classes: ClassGroup[]
  textbooks: Textbook[]
  subjects: Subject[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [content, setContent] = useState('')
  const [classId, setClassId] = useState(classes.length === 1 ? classes[0].id : '')
  const [textbookId, setTextbookId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [unitType, setUnitType] = useState<'volume' | 'lesson' | ''>('')
  const [unitNumber, setUnitNumber] = useState('')
  const [problemNumber, setProblemNumber] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [lessonOptions, setLessonOptions] = useState<{ orderNum: number; title: string }[]>([])
  const [lessonOptionsLoading, setLessonOptionsLoading] = useState(false)

  // "강" 선택 시 학생에게 실제로 보이는 강의 목록만 가져온다 (분반+과목이 정해져야 조회 가능,
  // 교재는 무관 — 강좌는 과목명 기준으로 운영된다)
  useEffect(() => {
    if (unitType !== 'lesson' || !subjectId || !classId) {
      setLessonOptions([])
      return
    }
    let cancelled = false
    setLessonOptionsLoading(true)
    getQnaLessonOptions(subjectId, classId).then((res) => {
      if (cancelled) return
      setLessonOptions(res.options ?? [])
      setLessonOptionsLoading(false)
    })
    return () => { cancelled = true }
  }, [unitType, subjectId, classId])

  // 고3 분반은 학원 자체 교재 대신 수능특강 등 외부 교재로 질문하는 경우가 많아 "외부교재"
  // 선택지를 추가로 보여준다 — 다른 학년에는 안 보이게 목록에서 제외.
  const isGrade3 = classes.find((c) => c.id === classId)?.grade?.replace(/\s/g, '') === '고3'
  const visibleTextbooks = isGrade3 ? textbooks : textbooks.filter((t) => t.name !== EXTERNAL_TEXTBOOK_NAME)

  // 제목은 따로 입력받지 않고 교재·과목·권(강)·문항번호로 자동 구성한다 —
  // 자유 입력 제목이 매칭에 쓰이지 않는 식별 정보 네 가지와 일관되게 유지되도록.
  const title = useMemo(() => {
    const textbookName = textbooks.find((t) => t.id === textbookId)?.name
    const subjectName = subjects.find((s) => s.id === subjectId)?.name
    const unitLabel = unitType && unitNumber.trim() ? `${unitNumber.trim()}${unitType === 'volume' ? '권' : '강'}` : null
    return [textbookName, subjectName, unitLabel, problemNumber.trim() || null].filter(Boolean).join(' ')
  }, [textbooks, textbookId, subjects, subjectId, unitType, unitNumber, problemNumber])

  // 같은 분반 내 유사 질문 조회 — 교재+과목+권(강)+번호가 전부 일치해야 "같은 문제"로 본다
  // (교재 이름이 여러 과목에서 공용으로 쓰이고, 같은 번호라도 권/강이 다르면 다른 문제이기 때문)
  useEffect(() => {
    if (!textbookId || !subjectId || !unitType || !unitNumber.trim() || !problemNumber.trim()) {
      setSimilarQuestions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      let query = supabase
        .from('qna_questions')
        .select('id, title, status, student:users!student_id(name)')
        .eq('textbook_id', textbookId)
        .eq('subject_id', subjectId)
        .eq('unit_type', unitType)
        .eq('unit_number', Number(unitNumber))
        .eq('problem_number', problemNumber.trim())
        .order('created_at', { ascending: false })
        .limit(10)

      if (classId) {
        query = query.eq('class_id', classId) as typeof query
      }

      const { data } = await query

      setSimilarQuestions(
        (data ?? []).map((q) => {
          const r = q as Record<string, unknown>
          return {
            id: r.id as string,
            title: r.title as string,
            status: r.status as string,
            studentName: ((r.student as { name?: string } | null)?.name ?? '') as string,
          }
        }),
      )
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [textbookId, subjectId, unitType, unitNumber, problemNumber, classId, supabase])

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB — 일반 폰 사진 화질은 넉넉히 넘고, AI 입력 비용 폭탄용 대용량 업로드만 막는다

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files)
      if (files.length + selected.length > 3) {
        alert('최대 3장까지만 첨부할 수 있습니다.')
        return
      }
      const tooBig = selected.find((f) => f.size > MAX_FILE_SIZE)
      if (tooBig) {
        alert(`${tooBig.name} 파일이 너무 큽니다. 50MB 이하 이미지만 첨부할 수 있습니다.`)
        return
      }
      setFiles((prev) => [...prev, ...selected].slice(0, 3))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('내용을 입력해주세요.')
      return
    }
    if (!classId) {
      setError('분반을 선택해주세요.')
      return
    }
    if (!textbookId) {
      setError('교재를 선택해주세요.')
      return
    }
    if (!subjectId) {
      setError('과목을 선택해주세요.')
      return
    }
    if (!unitType || !unitNumber.trim()) {
      setError('몇 권(강)인지 선택해주세요.')
      return
    }
    if (!problemNumber.trim()) {
      setError('문항 번호를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const imageUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`

        const { error: uploadError, data } = await supabase.storage
          .from('qna-images')
          .upload(fileName, file)

        if (uploadError) throw new Error('이미지 업로드에 실패했습니다.')

        const { data: { publicUrl } } = supabase.storage
          .from('qna-images')
          .getPublicUrl(data.path)

        imageUrls.push(publicUrl)
      }

      const { error: actionError } = await createQuestion({
        title,
        content,
        classId: classId || null,
        imageUrls,
        textbookId: textbookId || null,
        subjectId: subjectId || null,
        problemNumber: problemNumber.trim() || null,
        unitType: unitType || null,
        unitNumber: unitNumber.trim() ? Number(unitNumber) : null,
      })

      if (actionError) throw new Error(actionError)
      router.push('/dashboard/qna')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '질문 등록 중 오류가 발생했습니다.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-2xl">{error}</div>
      )}

      <ComboSelect
        label="분반"
        required
        placeholder="분반을 선택해주세요"
        value={classId}
        onChange={(nextClassId) => {
          setClassId(nextClassId)
          // 고3이 아닌 분반으로 바뀌면 이미 골라둔 "외부교재" 선택이 무효가 되니 초기화
          const nextIsGrade3 = classes.find((c) => c.id === nextClassId)?.grade?.replace(/\s/g, '') === '고3'
          const selectedTextbook = textbooks.find((t) => t.id === textbookId)
          if (!nextIsGrade3 && selectedTextbook?.name === EXTERNAL_TEXTBOOK_NAME) setTextbookId('')
          setUnitNumber('')
        }}
        options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.subject})` }))}
      />

      {/* 교재 선택 */}
      <ComboSelect
        label="교재"
        required
        placeholder="교재를 선택해주세요"
        value={textbookId}
        onChange={(v) => { setTextbookId(v); setProblemNumber('') }}
        options={visibleTextbooks.map((t) => ({ value: t.id, label: t.name }))}
      />

      {/* 과목 선택 */}
      <ComboSelect
        label="과목"
        required
        placeholder="과목을 선택해주세요"
        value={subjectId}
        onChange={(v) => { setSubjectId(v); setUnitNumber('') }}
        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
      />

      {/* 몇 권(강) */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          몇 권(강) <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-zinc-300 overflow-hidden">
            {(['volume', 'lesson'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setUnitType(type)}
                className={`px-3 py-2 text-sm font-medium transition ${
                  unitType === type
                    ? 'bg-zinc-800 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {type === 'volume' ? '권' : '강'}
              </button>
            ))}
          </div>
          {unitType === 'lesson' ? (
            <ComboSelect
              value={unitNumber}
              onChange={setUnitNumber}
              placeholder={
                !subjectId || !classId
                  ? '분반·과목을 먼저 선택하세요'
                  : lessonOptionsLoading
                    ? '불러오는 중...'
                    : '강 선택'
              }
              disabled={!subjectId || !classId || lessonOptionsLoading}
              className="flex-1"
              triggerClassName="w-full flex items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50"
              options={lessonOptions.map((l) => ({
                value: String(l.orderNum),
                label: l.title ? `${l.orderNum}강 - ${l.title}` : `${l.orderNum}강`,
              }))}
            />
          ) : (
            <input
              type="number"
              min={1}
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="숫자만 입력"
              required
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          )}
        </div>
      </div>

      {/* 문항 번호 */}
      <InputField
        label="문항 번호"
        value={problemNumber}
        onChange={(e) => setProblemNumber(e.target.value)}
        placeholder="예: 30번, 3-2번"
        required
      />

      {/* 같은 문제 질문 목록 */}
      {similarQuestions.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <p className="text-xs font-bold text-zinc-500">같은 문제 질문 목록 (참고용)</p>
          <div className="space-y-2">
            {similarQuestions.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white border border-zinc-100 px-4 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{q.title}</p>
                  <p className="text-[11px] text-zinc-400">{q.studentName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[q.status] ?? 'bg-zinc-100 text-zinc-400'}`}>
                    {QNA_STATUS_LABEL[q.status] ?? q.status}
                  </span>
                  <Link
                    href={`/dashboard/qna/${q.id}`}
                    className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
                  >
                    해당 답변 보기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-600">제목 (자동 생성)</label>
        <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-sm font-medium text-zinc-700">
          {title || '교재·과목·권(강)·문항번호를 선택하면 제목이 자동으로 채워집니다'}
        </div>
      </div>

      <TextareaField
        label="내용"
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="질문 내용을 자세히 적어주세요. (문제 사진을 찍어서 이미지 첨부를 활용하면 편리합니다!)"
        rows={6}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800">이미지 첨부 (최대 3장)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
          disabled={files.length >= 3}
        />
        {files.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {files.map((file, i) => (
              <div key={i} className="relative w-20 h-20 rounded-md border border-zinc-200 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="preview" className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-md border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
          disabled={isSubmitting}
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 rounded-md bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? '등록 중...' : '질문 등록'}
        </button>
      </div>
    </form>
  )
}
