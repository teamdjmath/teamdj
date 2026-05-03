'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { InputField, SelectField } from '@/components/ui/form-field'
import {
  createLecture,
  updateLecture,
  updateLectureOrder,
  deleteLecture,
  syncYouTubePlaylist,
} from '@/lib/actions/lectures'

type ClassOption = { id: string; name: string }
type Lecture = {
  id: string
  title: string
  youtube_video_id: string
  youtube_playlist_id: string
  order_num: number
  synced_at: string | null
  class_id: string
  className: string
}

interface Props {
  classOptions: ClassOption[]
  selectedClassId: string | null
  lectures: Lecture[]
  lastSynced: string | null
}

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; lecture: Lecture }
  | { type: 'sync' }
  | null

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function ytThumb(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

function ytUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function LecturesClient({ classOptions, selectedClassId, lectures, lastSynced }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalState>(null)
  const [err, setErr] = useState('')
  const [syncResult, setSyncResult] = useState('')

  const [form, setForm] = useState({
    classId: selectedClassId ?? classOptions[0]?.id ?? '',
    title: '',
    youtubeVideoId: '',
    orderNum: String(lectures.length + 1),
  })

  const [syncForm, setSyncForm] = useState({
    classId: selectedClassId ?? classOptions[0]?.id ?? '',
    playlistUrl: '',
  })

  function handleClassFilter(classId: string) {
    const p = new URLSearchParams()
    if (classId) p.set('classId', classId)
    router.push(`/admin/lectures?${p.toString()}`)
  }

  function openCreate() {
    setForm({
      classId: selectedClassId ?? classOptions[0]?.id ?? '',
      title: '',
      youtubeVideoId: '',
      orderNum: String(lectures.length + 1),
    })
    setErr('')
    setModal({ type: 'create' })
  }

  function openEdit(l: Lecture) {
    setForm({
      classId: l.class_id,
      title: l.title,
      youtubeVideoId: l.youtube_video_id,
      orderNum: String(l.order_num),
    })
    setErr('')
    setModal({ type: 'edit', lecture: l })
  }

  function openSync() {
    setSyncForm({ classId: selectedClassId ?? classOptions[0]?.id ?? '', playlistUrl: '' })
    setSyncResult('')
    setErr('')
    setModal({ type: 'sync' })
  }

  function handleSubmit() {
    if (!form.title.trim()) { setErr('강의 제목을 입력하세요.'); return }
    if (!form.classId) { setErr('분반을 선택하세요.'); return }
    setErr('')
    startTransition(async () => {
      const data = {
        classId: form.classId,
        title: form.title.trim(),
        youtubeVideoId: form.youtubeVideoId.trim(),
        orderNum: parseInt(form.orderNum) || 0,
      }
      const result =
        modal?.type === 'edit'
          ? await updateLecture(modal.lecture.id, data)
          : await createLecture(data)
      if (result?.error) { setErr(result.error); return }
      setModal(null)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('강의를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteLecture(id)
      router.refresh()
    })
  }

  function handleSwapOrder(idx: number, direction: 'up' | 'down') {
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= lectures.length) return
    const a = lectures[idx]
    const b = lectures[swapIdx]
    startTransition(async () => {
      await updateLectureOrder(a.id, b.order_num)
      await updateLectureOrder(b.id, a.order_num)
      router.refresh()
    })
  }

  function handleSync() {
    if (!syncForm.classId) { setErr('분반을 선택하세요.'); return }
    if (!syncForm.playlistUrl.trim()) { setErr('플레이리스트 URL을 입력하세요.'); return }
    setErr('')
    setSyncResult('')
    startTransition(async () => {
      const result = await syncYouTubePlaylist(syncForm.classId, syncForm.playlistUrl.trim())
      if (result.error) { setErr(result.error); return }
      setSyncResult(`${result.synced}개 영상 동기화 완료`)
      router.refresh()
    })
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">강의 영상</h1>
          {lastSynced && (
            <p className="mt-0.5 text-xs text-zinc-400">마지막 동기화: {formatDatetime(lastSynced)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={openSync}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            플레이리스트 동기화
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            개별 등록
          </button>
        </div>
      </div>

      {/* 분반 필터 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleClassFilter('')}
          className={[
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            !selectedClassId ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          ].join(' ')}
        >
          전체
        </button>
        {classOptions.map((c) => (
          <button
            key={c.id}
            onClick={() => handleClassFilter(c.id)}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              selectedClassId === c.id ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 강의 목록 */}
      {lectures.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
          등록된 강의가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium w-12">순서</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell w-28">썸네일</th>
                <th className="px-4 py-3 font-medium">강의명</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">분반</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Video ID</th>
                <th className="px-4 py-3 font-medium text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {lectures.map((l, idx) => (
                <tr key={l.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleSwapOrder(idx, 'up')}
                        disabled={idx === 0 || pending}
                        className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 disabled:opacity-20 transition-colors"
                        aria-label="위로"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <span className="text-center text-xs font-mono text-zinc-600">{l.order_num}</span>
                      <button
                        onClick={() => handleSwapOrder(idx, 'down')}
                        disabled={idx === lectures.length - 1 || pending}
                        className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 disabled:opacity-20 transition-colors"
                        aria-label="아래로"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {l.youtube_video_id ? (
                      <a href={ytUrl(l.youtube_video_id)} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ytThumb(l.youtube_video_id)}
                          alt={l.title}
                          className="h-14 w-24 rounded-lg object-cover border border-zinc-100 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <div className="h-14 w-24 rounded-lg bg-zinc-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{l.title}</div>
                    {l.synced_at && (
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        동기화 {formatDatetime(l.synced_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">{l.className}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {l.youtube_video_id ? (
                      <a
                        href={ytUrl(l.youtube_video_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-zinc-400 hover:text-zinc-700 underline-offset-2 hover:underline transition-colors"
                      >
                        {l.youtube_video_id}
                      </a>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(l)}
                        className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={pending}
                        className="rounded-md px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 개별 등록 / 수정 모달 */}
      <Modal
        open={modal?.type === 'create' || modal?.type === 'edit'}
        onClose={() => setModal(null)}
        title={modal?.type === 'edit' ? '강의 수정' : '강의 개별 등록'}
        size="md"
      >
        <div className="space-y-4">
          <SelectField
            label="분반"
            required
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
          >
            <option value="">선택하세요</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>

          <InputField
            label="강의 제목"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="예: 1주차 수열 개념 강의"
          />

          <div>
            <InputField
              label="YouTube Video ID"
              value={form.youtubeVideoId}
              onChange={(e) => setForm((f) => ({ ...f, youtubeVideoId: e.target.value }))}
              placeholder="예: dQw4w9WgXcQ"
            />
            <p className="mt-1 text-xs text-zinc-400">
              URL 중 <code className="bg-zinc-100 px-1 rounded">v=</code> 뒤의 값 (예: youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
            </p>
          </div>

          <InputField
            label="순서"
            type="number"
            value={form.orderNum}
            onChange={(e) => setForm((f) => ({ ...f, orderNum: e.target.value }))}
            placeholder="0"
          />

          {/* 미리보기 */}
          {form.youtubeVideoId && (
            <div className="rounded-lg overflow-hidden border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ytThumb(form.youtubeVideoId)} alt="썸네일 미리보기" className="w-full h-auto" />
            </div>
          )}

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

      {/* 플레이리스트 동기화 모달 */}
      <Modal open={modal?.type === 'sync'} onClose={() => setModal(null)} title="YouTube 플레이리스트 동기화" size="md">
        <div className="space-y-4">
          <SelectField
            label="분반"
            required
            value={syncForm.classId}
            onChange={(e) => setSyncForm((f) => ({ ...f, classId: e.target.value }))}
          >
            <option value="">선택하세요</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>

          <InputField
            label="플레이리스트 URL"
            required
            value={syncForm.playlistUrl}
            onChange={(e) => setSyncForm((f) => ({ ...f, playlistUrl: e.target.value }))}
            placeholder="https://www.youtube.com/playlist?list=PLxxxx"
          />

          <div className="rounded-lg bg-zinc-50 px-3 py-3 text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-700">동기화 안내</p>
            <p>· 기존에 이 플레이리스트로 동기화된 영상을 모두 교체합니다.</p>
            <p>· 개별 등록된 영상은 영향 없습니다.</p>
            <p>· YouTube Data API 할당량을 사용합니다.</p>
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}
          {syncResult && <p className="text-sm text-zinc-600 font-medium">{syncResult}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setModal(null)}
              className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              닫기
            </button>
            {!syncResult && (
              <button
                onClick={handleSync}
                disabled={pending}
                className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {pending ? '동기화 중...' : '동기화 시작'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
