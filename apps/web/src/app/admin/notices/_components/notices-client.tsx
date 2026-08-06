'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { InputField, SelectField, TextareaField } from '@/components/ui/form-field'
import { createNotice, updateNotice, deleteNotice } from '@/lib/actions/notices'
import { NoticeContent } from '@/components/notice-content'
import { createClient } from '@/lib/supabase/client'

type ClassOption = { id: string; name: string }

type Notice = {
  id: string
  title: string
  content: string
  is_pinned: boolean
  is_public: boolean
  image_urls: string[]
  class_id: string | null
  created_at: string
  className: string | null
  authorName: string
}

interface Props {
  classOptions: ClassOption[]
  selectedClassId: string | null
  notices: Notice[]
}

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; notice: Notice }
  | { type: 'view'; notice: Notice }
  | null

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// 작성 가이드용 예시 — %ORIGIN%은 렌더링 시 실제 사이트 주소로 치환된다 (이미지 자동 삽입 데모용)
const GUIDE_EXAMPLES = [
  {
    key: 'textbook',
    label: '교재 안내',
    content: `#2026학년도 1학기 교재 안내

새 학기 교재가 아래와 같이 배정되었습니다. 확인 후 준비해주세요.

[LEVEL 1] 기초를 다지는 단계
[교재명]수학의 정석 기본편
[교재명]개념원리 수학1

[LEVEL 2] 실력 다지기
[교재명]쎈 수학1
[교재명]마플교과서 수학1

[SPECIAL] 심화반 전용
[교재명]일품 수학1

☞ 교재 구매는 학원 데스크에서 일괄 진행합니다. 별도 구매하지 않으셔도 됩니다.`,
  },
  {
    key: 'closure',
    label: '휴원·일정 변경',
    content: `#설 연휴 휴원 안내

2/16(월)~2/18(수)은 설 연휴로 휴원합니다. 2/19(목)부터 정상 운영합니다.

[대상]전체 재원생
[기간]2/16(월) ~ 2/18(수)

☞ 연휴 기간 질문은 Q&A 게시판에 남겨주시면 개강 후 순차적으로 답변드립니다.`,
  },
  {
    key: 'event',
    label: '특강·이벤트',
    content: `#겨울방학 집중 특강 모집

방학 동안 취약 단원을 집중적으로 보완하는 특강을 진행합니다.

[대상]고1~고2
[일시]1/6(화) ~ 1/17(금), 매일 14:00~16:00
[장소]본관 3층 세미나실

%ORIGIN%/teacher.png

☞ 신청은 데스크 또는 문자로 접수해주세요. 선착순 마감되니 서둘러주세요.`,
  },
  {
    key: 'video',
    label: '수업 영상 안내',
    content: `#1/13(월) 결석자 보강 영상

당일 결석한 학생은 아래 영상으로 수업 내용을 확인해주세요.

[분반]고2 수요반
[범위]미적분 p.40~p.52

https://youtu.be/sampleVide1

☞ 영상 시청 후 궁금한 점은 Q&A로 남겨주세요.`,
  },
  {
    key: 'blog',
    label: '블로그 연동',
    content: `#고2 수요반 2학기 안내

이번 학기 타임테이블과 학습 방식을 블로그에 자세히 정리했습니다.

▶타임테이블, 난이도, 과제 안내까지|이 반의 자세한 수업 안내는 아래 블로그 글에서 확인하실 수 있어요.|https://blog.naver.com/example/1234|블로그에서 확인하기`,
  },
] as const

const GUIDE_SYNTAX = [
  { syntax: '#소제목', effect: '굵은 큰 소제목 (구분선 포함)' },
  { syntax: '[LEVEL 1] 설명 / [SPECIAL] 설명', effect: '검은 알약 배지 — 교재 단계·묶음 구분' },
  { syntax: '[라벨]본문', effect: '작은 회색 태그 — 교재명 등 한 줄 항목' },
  { syntax: '☞ 안내문구', effect: '초록색 굵은 강조 문구' },
  { syntax: '▶제목|부제|URL|버튼문구', effect: '검은 카드 + 흰 버튼 (부제·버튼문구는 생략 가능)' },
  { syntax: '사진·유튜브 URL', effect: '자동으로 사진/영상 미리보기 삽입' },
] as const

function NoticeGuide() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'format' | 'preview'>('format')
  const [exampleKey, setExampleKey] = useState<(typeof GUIDE_EXAMPLES)[number]['key']>('textbook')
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''))

  const example = GUIDE_EXAMPLES.find((e) => e.key === exampleKey) ?? GUIDE_EXAMPLES[0]
  const content = example.content.replaceAll('%ORIGIN%', origin)

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">공지 작성 가이드</span>
          <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-600">예시 {GUIDE_EXAMPLES.length}종</span>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 dark:text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-900 p-5 space-y-4">
          {/* 예시 종류 선택 */}
          <div className="flex flex-wrap gap-1.5">
            {GUIDE_EXAMPLES.map((e) => (
              <button
                key={e.key}
                type="button"
                onClick={() => setExampleKey(e.key)}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                  exampleKey === e.key
                    ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800',
                ].join(' ')}
              >
                {e.label}
              </button>
            ))}
          </div>

          {/* 형식 / 미리보기 탭 */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">작성 형식</p>
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTab('format')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'format' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-500'}`}
              >
                형식
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'preview' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-500'}`}
              >
                미리보기
              </button>
            </div>
          </div>

          {tab === 'format' ? (
            <div className="rounded-xl bg-zinc-950 dark:bg-zinc-50 p-4">
              <pre className="text-xs text-zinc-300 dark:text-zinc-700 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                {content}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
              <NoticeContent content={content} />
            </div>
          )}

          {/* 빠른 참조 */}
          <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">빠른 참조</p>
            <ul className="space-y-1.5">
              {GUIDE_SYNTAX.map((s) => (
                <li key={s.syntax} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <code className="rounded bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-700 dark:text-zinc-300">{s.syntax}</code>
                  <span className="text-zinc-500 dark:text-zinc-500">{s.effect}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-600 leading-relaxed">
              <span className="font-bold text-zinc-500 dark:text-zinc-500">팁:</span> 사진은 아래 &ldquo;이미지 첨부&rdquo;로 올리는 편이 가장 안전합니다. 링크를 직접 붙여넣는 방식은 주소가 .jpg 등으로 끝나지 않으면(예: 카카오톡 공유 링크) 사진으로 바뀌지 않고 파란 링크로만 남습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function NoticesClient({ classOptions, selectedClassId, notices }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>(null)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState('')

  const [form, setForm] = useState({
    title: '',
    content: '',
    classId: '',
    isPinned: false,
    isPublic: false,
    imageUrls: [] as string[],
  })
  const [uploading, setUploading] = useState(false)

  function openCreate() {
    setForm({ title: '', content: '', classId: selectedClassId ?? '', isPinned: false, isPublic: false, imageUrls: [] })
    setErr('')
    setModal({ type: 'create' })
  }

  function openEdit(n: Notice) {
    setForm({
      title: n.title, content: n.content, classId: n.class_id ?? '',
      isPinned: n.is_pinned, isPublic: n.is_public, imageUrls: n.image_urls ?? [],
    })
    setErr('')
    setModal({ type: 'edit', notice: n })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    e.target.value = ''
    setUploading(true)
    setErr('')
    try {
      const supabase = createClient()
      const uploaded: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'png'
        const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('notice-images').upload(path, file)
        if (upErr) throw new Error('이미지 업로드에 실패했습니다.')
        const { data: { publicUrl } } = supabase.storage.from('notice-images').getPublicUrl(path)
        uploaded.push(publicUrl)
      }
      setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...uploaded] }))
    } catch (error) {
      setErr(error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(url: string) {
    setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((u) => u !== url) }))
  }

  function handleClassFilter(classId: string) {
    const p = new URLSearchParams()
    if (classId) p.set('classId', classId)
    router.push(`/admin/notices?${p.toString()}`)
  }

  function handleSubmit() {
    if (!form.title.trim()) { setErr('제목을 입력하세요.'); return }
    if (!form.content.trim()) { setErr('내용을 입력하세요.'); return }
    setErr('')
    startTransition(async () => {
      const data = {
        title: form.title.trim(),
        content: form.content.trim(),
        classId: form.classId || undefined,
        isPinned: form.isPinned,
        isPublic: form.isPublic,
        imageUrls: form.imageUrls,
      }
      const result =
        modal?.type === 'edit'
          ? await updateNotice(modal.notice.id, data)
          : await createNotice(data)
      if (!result.success) { setErr(result.error); return }
      setModal(null)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('공지를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteNotice(id)
      router.refresh()
    })
  }

  const pinnedNotices = notices.filter((n) => n.is_pinned)
  const regularNotices = notices.filter((n) => !n.is_pinned)

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">공지사항</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-950 dark:bg-zinc-50 px-3.5 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          공지 작성
        </button>
      </div>

      {/* 공지 작성 가이드 */}
      <NoticeGuide />

      {/* 분반 필터 */}
      <div className="mb-6 max-w-xs space-y-1.5">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">분반</label>
        <select
          value={selectedClassId ?? ''}
          onChange={(e) => handleClassFilter(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
        >
          <option value="">전체 분반</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {notices.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <EmptyState message="등록된 공지사항이 없습니다." description="공지사항 추가 버튼으로 새 공지를 작성하세요." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-50 dark:divide-zinc-950">
          {/* 고정 공지 */}
          {pinnedNotices.map((n) => (
            <NoticeRow
              key={n.id}
              notice={n}
              onView={() => setModal({ type: 'view', notice: n })}
              onEdit={() => openEdit(n)}
              onDelete={() => handleDelete(n.id)}
              pending={pending}
              pinned
            />
          ))}

          {/* 일반 공지 */}
          {regularNotices.map((n) => (
            <NoticeRow
              key={n.id}
              notice={n}
              onView={() => setModal({ type: 'view', notice: n })}
              onEdit={() => openEdit(n)}
              onDelete={() => handleDelete(n.id)}
              pending={pending}
              pinned={false}
            />
          ))}
        </div>
      )}

      {/* 작성/수정 모달 */}
      <Modal
        open={modal?.type === 'create' || modal?.type === 'edit'}
        onClose={() => setModal(null)}
        title={modal?.type === 'edit' ? '공지 수정' : '공지 작성'}
        size="lg"
      >
        <div className="space-y-4">
          <InputField
            label="제목"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="공지 제목을 입력하세요"
          />

          <TextareaField
            label="내용"
            required
            rows={8}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="공지 내용을 입력하세요. 이미지 주소나 유튜브 링크를 붙여넣으면 미리보기로 표시됩니다."
          />

          {/* 이미지 첨부 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">이미지 첨부</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={uploading}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-200 dark:file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-700 dark:file:text-zinc-300 disabled:opacity-50"
            />
            {uploading && <p className="text-xs text-zinc-400 dark:text-zinc-600">업로드 중…</p>}
            {form.imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.imageUrls.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="첨부" className="h-20 w-20 rounded-lg border border-zinc-200 dark:border-zinc-800 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-[10px] text-white dark:text-zinc-900 hover:bg-red-500 transition-colors"
                      aria-label="이미지 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SelectField
            label="대상 분반"
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
          >
            <option value="">전체 (모든 학생)</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>

          {/* 홈페이지 공개 공지 */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-950 dark:accent-zinc-50"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              홈페이지 공개 공지
              <span className="block text-xs text-zinc-400 dark:text-zinc-600">로그인 없이 누구나 볼 수 있는 공개 공지 페이지에 게시됩니다 (학부모 안내·홍보용)</span>
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.isPinned}
              onClick={() => setForm((f) => ({ ...f, isPinned: !f.isPinned }))}
              className={[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.isPinned ? 'bg-zinc-950 dark:bg-zinc-50' : 'bg-zinc-200 dark:bg-zinc-800',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform',
                  form.isPinned ? 'translate-x-4' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">고정 공지</span>
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setModal(null)}
              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 rounded-lg bg-zinc-950 dark:bg-zinc-50 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {pending ? '저장 중...' : modal?.type === 'edit' ? '수정' : '등록'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 공지 내용 보기 모달 */}
      <Modal
        open={modal?.type === 'view'}
        onClose={() => setModal(null)}
        title={modal?.type === 'view' ? modal.notice.title : ''}
        size="lg"
      >
        {modal?.type === 'view' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
              {modal.notice.is_pinned && <span className="text-zinc-900 dark:text-zinc-100">📌 고정</span>}
              {modal.notice.is_public && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-600">홈페이지 공개</span>
              )}
              <span>{modal.notice.className ?? '전체'}</span>
              <span>·</span>
              <span>{modal.notice.authorName}</span>
              <span>·</span>
              <span>{formatDate(modal.notice.created_at)}</span>
            </div>
            <div className="min-h-[120px] rounded-lg bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">
              <NoticeContent content={modal.notice.content} imageUrls={modal.notice.image_urls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => openEdit(modal.notice)}
                className="flex-1 rounded-lg bg-zinc-950 dark:bg-zinc-50 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                수정
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function NoticeRow({
  notice,
  onView,
  onEdit,
  onDelete,
  pending,
  pinned,
}: {
  notice: Notice
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  pending: boolean
  pinned: boolean
}) {
  return (
    <div className={`flex items-start gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors ${pinned ? 'bg-zinc-50/60 dark:bg-zinc-950/60' : ''}`}>
      <div className="flex-1 min-w-0">
        <button
          onClick={onView}
          className="flex items-center gap-2 text-left w-full group"
        >
          {pinned && <span className="text-base leading-none shrink-0" aria-label="고정">📌</span>}
          <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 truncate">{notice.title}</span>
        </button>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400 dark:text-zinc-600">
          <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-zinc-600 dark:text-zinc-400">
            {notice.className ?? '전체'}
          </span>
          {notice.is_public && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-600">홈페이지 공개</span>
          )}
          <span>{notice.authorName}</span>
          <span>·</span>
          <span>{formatDate(notice.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="rounded-md px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          수정
        </button>
        <button
          onClick={onDelete}
          disabled={pending}
          className="rounded-md px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  )
}
