'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { InputField, SelectField, TextareaField } from '@/components/ui/form-field'
import { createNotice, updateNotice, deleteNotice } from '@/lib/actions/notices'

type ClassOption = { id: string; name: string }

type Notice = {
  id: string
  title: string
  content: string
  is_pinned: boolean
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
  })

  function openCreate() {
    setForm({ title: '', content: '', classId: selectedClassId ?? '', isPinned: false })
    setErr('')
    setModal({ type: 'create' })
  }

  function openEdit(n: Notice) {
    setForm({ title: n.title, content: n.content, classId: n.class_id ?? '', isPinned: n.is_pinned })
    setErr('')
    setModal({ type: 'edit', notice: n })
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
        <h1 className="text-xl font-bold text-zinc-950">공지사항</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          공지 작성
        </button>
      </div>

      {/* 분반 필터 */}
      <div className="mb-6 max-w-xs space-y-1.5">
        <label className="block text-xs font-medium text-zinc-600">분반</label>
        <select
          value={selectedClassId ?? ''}
          onChange={(e) => handleClassFilter(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
        >
          <option value="">전체 분반</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {notices.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState message="등록된 공지사항이 없습니다." description="공지사항 추가 버튼으로 새 공지를 작성하세요." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-50">
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
            placeholder="공지 내용을 입력하세요 (마크다운 지원)"
          />

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

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.isPinned}
              onClick={() => setForm((f) => ({ ...f, isPinned: !f.isPinned }))}
              className={[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.isPinned ? 'bg-zinc-950' : 'bg-zinc-200',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  form.isPinned ? 'translate-x-4' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <span className="text-sm text-zinc-700">고정 공지</span>
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setModal(null)}
              className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              {modal.notice.is_pinned && <span className="text-zinc-900">📌 고정</span>}
              <span>{modal.notice.className ?? '전체'}</span>
              <span>·</span>
              <span>{modal.notice.authorName}</span>
              <span>·</span>
              <span>{formatDate(modal.notice.created_at)}</span>
            </div>
            <div className="min-h-[120px] rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {modal.notice.content}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => openEdit(modal.notice)}
                className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
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
    <div className={`flex items-start gap-3 px-4 py-4 hover:bg-zinc-50 transition-colors ${pinned ? 'bg-zinc-50/60' : ''}`}>
      <div className="flex-1 min-w-0">
        <button
          onClick={onView}
          className="flex items-center gap-2 text-left w-full group"
        >
          {pinned && <span className="text-base leading-none shrink-0" aria-label="고정">📌</span>}
          <span className="font-medium text-zinc-900 group-hover:text-zinc-700 truncate">{notice.title}</span>
        </button>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
            {notice.className ?? '전체'}
          </span>
          <span>{notice.authorName}</span>
          <span>·</span>
          <span>{formatDate(notice.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-200 transition-colors"
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
