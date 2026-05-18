'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createQuestion } from '@/lib/actions/qna'
import { InputField, SelectField, TextareaField } from '@/components/ui/form-field'

interface ClassGroup {
  id: string
  name: string
  subject: string
}

interface Textbook {
  id: string
  name: string
}

interface SimilarQuestion {
  id: string
  title: string
  status: string
  studentName: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '미답변',
  in_progress: '답변중',
  answered: '답변완료',
}

const STATUS_CLS: Record<string, string> = {
  open: 'bg-zinc-100 text-zinc-400',
  in_progress: 'bg-zinc-950 text-white',
  answered: 'bg-zinc-100 text-zinc-900 font-bold',
}

export function NewQuestionForm({
  classes,
  textbooks,
}: {
  classes: ClassGroup[]
  textbooks: Textbook[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [classId, setClassId] = useState(classes.length === 1 ? classes[0].id : '')
  const [textbookId, setTextbookId] = useState('')
  const [problemNumber, setProblemNumber] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 같은 분반 내 유사 질문 조회
  useEffect(() => {
    if (!textbookId || !problemNumber.trim()) {
      setSimilarQuestions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      let query = supabase
        .from('qna_questions')
        .select('id, title, status, student:users!student_id(name)')
        .eq('textbook_id', textbookId)
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
  }, [textbookId, problemNumber, classId, supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files)
      if (files.length + selected.length > 3) {
        alert('최대 3장까지만 첨부할 수 있습니다.')
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
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.')
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
        problemNumber: problemNumber.trim() || null,
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

      <SelectField
        label="분반"
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
      >
        <option value="">분반을 선택해주세요 (선택사항)</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.subject})
          </option>
        ))}
      </SelectField>

      {/* 교재 선택 */}
      <SelectField
        label="교재"
        value={textbookId}
        onChange={(e) => { setTextbookId(e.target.value); setProblemNumber('') }}
      >
        <option value="">교재 선택 (선택사항)</option>
        {textbooks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </SelectField>

      {/* 문항 번호 */}
      <InputField
        label="문항 번호"
        value={problemNumber}
        onChange={(e) => setProblemNumber(e.target.value)}
        placeholder="예: 30번, 3-2번"
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
                    {STATUS_LABEL[q.status] ?? q.status}
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

      <InputField
        label="제목"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="질문 제목을 입력하세요"
      />

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
