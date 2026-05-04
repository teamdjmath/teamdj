'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/form-field'
import {
  createCourse,
  updateCourseClasses,
  deleteCourse,
  createLecture,
  updateLecture,
  updateLectureOrder,
  deleteLecture,
  syncYouTubePlaylistToCourse,
} from '@/lib/actions/lectures'

type ClassOption = { id: string; name: string }
type LectureItem = {
  id: string; title: string; videoId: string; orderNum: number; syncedAt: string | null; materialUrl?: string | null
}
type Course = {
  courseName: string; allowedClassIds: string[]; lectures: LectureItem[]
}

interface Props {
  classOptions: ClassOption[]
  courses: Course[]
}

function ytThumb(vid: string) { return `https://img.youtube.com/vi/${vid}/mqdefault.jpg` }
function ytUrl(vid: string)   { return `https://www.youtube.com/watch?v=${vid}` }

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

type ModalType =
  | { kind: 'createCourse' }
  | { kind: 'editAccess'; courseName: string; currentClassIds: string[] }
  | { kind: 'sync'; courseName: string }
  | { kind: 'addLecture'; courseName: string; nextOrder: number }
  | { kind: 'editLecture'; lecture: LectureItem }
  | null

export function LecturesClient({ classOptions, courses }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalType>(null)
  const [err, setErr] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    courses.forEach(c => { init[c.courseName] = true })
    return init
  })

  // 강좌 생성 폼
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseClasses, setNewCourseClasses] = useState<string[]>([])

  // 접근 분반 수정 폼
  const [editAccessClasses, setEditAccessClasses] = useState<string[]>([])

  // 동기화 폼
  const [syncUrl, setSyncUrl] = useState('')
  const [syncResult, setSyncResult] = useState('')

  // 강의 폼
  const [lectureForm, setLectureForm] = useState({ title: '', videoId: '', orderNum: '1', materialUrl: '' })

  function toggleCollapse(cn: string) {
    setCollapsed((prev) => ({ ...prev, [cn]: !prev[cn] }))
  }

  function toggleClass(classId: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(classId) ? list.filter((x) => x !== classId) : [...list, classId])
  }

  // ─ 강좌 생성
  function openCreateCourse() {
    setNewCourseName(''); setNewCourseClasses([]); setErr('')
    setModal({ kind: 'createCourse' })
  }
  function handleCreateCourse() {
    if (!newCourseName.trim()) { setErr('강좌명을 입력하세요.'); return }
    setErr('')
    startTransition(async () => {
      const res = await createCourse(newCourseName.trim(), newCourseClasses)
      if (!res.success) { setErr(res.error); return }
      setModal(null)
      router.refresh()
    })
  }

  // ─ 접근 분반 수정
  function openEditAccess(course: Course) {
    setEditAccessClasses([...course.allowedClassIds]); setErr('')
    setModal({ kind: 'editAccess', courseName: course.courseName, currentClassIds: course.allowedClassIds })
  }
  function handleEditAccess() {
    if (modal?.kind !== 'editAccess') return
    startTransition(async () => {
      const res = await updateCourseClasses(modal.courseName, editAccessClasses)
      if (!res.success) { setErr(res.error); return }
      setModal(null)
      router.refresh()
    })
  }

  // ─ 강좌 삭제
  function handleDeleteCourse(courseName: string, count: number) {
    if (!confirm(`"${courseName}" 강좌와 강의 ${count}개를 모두 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const res = await deleteCourse(courseName)
      if (!res.success) alert(res.error)
      else router.refresh()
    })
  }

  // ─ 플레이리스트 동기화
  function openSync(courseName: string) {
    setSyncUrl(''); setSyncResult(''); setErr('')
    setModal({ kind: 'sync', courseName })
  }
  function handleSync() {
    if (modal?.kind !== 'sync') return
    if (!syncUrl.trim()) { setErr('URL을 입력하세요.'); return }
    setErr(''); setSyncResult('')
    startTransition(async () => {
      const res = await syncYouTubePlaylistToCourse(modal.courseName, syncUrl.trim())
      if (!res.success) { setErr(res.error); return }
      setSyncResult(`${res.synced}개 영상 동기화 완료`)
      router.refresh()
    })
  }

  // ─ 강의 추가
  function openAddLecture(course: Course) {
    setLectureForm({ title: '', videoId: '', orderNum: String(course.lectures.length + 1), materialUrl: '' })
    setErr('')
    setModal({ kind: 'addLecture', courseName: course.courseName, nextOrder: course.lectures.length + 1 })
  }

  // ─ 강의 수정
  function openEditLecture(lec: LectureItem) {
    setLectureForm({
      title: lec.title,
      videoId: lec.videoId,
      orderNum: String(lec.orderNum),
      materialUrl: lec.materialUrl || '',
    })
    setErr('')
    setModal({ kind: 'editLecture', lecture: lec })
  }

  function handleSaveLecture() {
    if (!lectureForm.title.trim()) {
      setErr('강의 제목을 입력하세요.')
      return
    }
    setErr('')
    startTransition(async () => {
      let res
      if (modal?.kind === 'editLecture') {
        res = await updateLecture(modal.lecture.id, {
          title: lectureForm.title.trim(),
          youtubeVideoId: lectureForm.videoId.trim(),
          orderNum: parseInt(lectureForm.orderNum) || 0,
          materialUrl: lectureForm.materialUrl.trim(),
        })
      } else if (modal?.kind === 'addLecture') {
        res = await createLecture({
          courseName: modal.courseName,
          title: lectureForm.title.trim(),
          youtubeVideoId: lectureForm.videoId.trim(),
          orderNum: parseInt(lectureForm.orderNum) || 0,
          materialUrl: lectureForm.materialUrl.trim(),
        })
      } else return

      if (!res.success) {
        setErr(res.error)
        return
      }
      setModal(null)
      router.refresh()
    })
  }

  function handleDeleteLecture(id: string, title: string) {
    if (!confirm(`"${title}" 강의를 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const res = await deleteLecture(id)
      if (!res.success) alert(res.error)
      else router.refresh()
    })
  }

  function handleSwapOrder(course: Course, idx: number, dir: 'up' | 'down') {
    const sibling = dir === 'up' ? idx - 1 : idx + 1
    if (sibling < 0 || sibling >= course.lectures.length) return
    const a = course.lectures[idx]
    const b = course.lectures[sibling]
    startTransition(async () => {
      await updateLectureOrder(a.id, b.orderNum)
      await updateLectureOrder(b.id, a.orderNum)
      router.refresh()
    })
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-950">강의 영상</h1>
        <button
          type="button"
          onClick={openCreateCourse}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          강좌 생성
        </button>
      </div>

      {/* 강좌 목록 */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-20 text-center text-sm text-zinc-400">
          등록된 강좌가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const isOpen = !collapsed[course.courseName]
            const lastSync = course.lectures
              .filter((l) => l.syncedAt)
              .sort((a, b) => (b.syncedAt! > a.syncedAt! ? 1 : -1))[0]?.syncedAt ?? null

            return (
              <div key={course.courseName} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                {/* 강좌 헤더 */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(course.courseName)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <svg
                      className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-zinc-900 text-sm">{course.courseName}</span>
                    <span className="text-xs text-zinc-400">{course.lectures.length}개 영상</span>
                    {lastSync && (
                      <span className="hidden sm:block text-[11px] text-zinc-300">동기화 {fmtDate(lastSync)}</span>
                    )}
                  </button>

                  {/* 접근 분반 배지 */}
                  <div className="hidden md:flex items-center gap-1 flex-wrap">
                    {course.allowedClassIds.length === 0 ? (
                      <span className="text-[11px] text-zinc-300">분반 미설정</span>
                    ) : (
                      course.allowedClassIds.map((cid) => {
                        const cls = classOptions.find((c) => c.id === cid)
                        return cls ? (
                          <span key={cid} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                            {cls.name}
                          </span>
                        ) : null
                      })
                    )}
                  </div>

                  {/* 강좌 액션 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditAccess(course)}
                      className="rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
                    >
                      분반 설정
                    </button>
                    <button
                      type="button"
                      onClick={() => openSync(course.courseName)}
                      className="rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
                    >
                      동기화
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddLecture(course)}
                      className="rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
                    >
                      + 강의
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course.courseName, course.lectures.length)}
                      disabled={pending}
                      className="rounded-md px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 강의 목록 */}
                {isOpen && (
                  course.lectures.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400">
                      강의가 없습니다. 동기화하거나 직접 추가하세요.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-zinc-50">
                        {course.lectures.map((lec, idx) => (
                          <tr key={lec.id} className="hover:bg-zinc-50 transition-colors">
                            {/* 순서 */}
                            <td className="w-10 px-3 py-3">
                              <div className="flex flex-col gap-0.5 items-center">
                                <button
                                  type="button"
                                  onClick={() => handleSwapOrder(course, idx, 'up')}
                                  disabled={idx === 0 || pending}
                                  className="rounded p-0.5 text-zinc-300 hover:bg-zinc-200 disabled:opacity-20"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                  </svg>
                                </button>
                                <span className="text-[11px] font-mono text-zinc-400">{lec.orderNum}</span>
                                <button
                                  type="button"
                                  onClick={() => handleSwapOrder(course, idx, 'down')}
                                  disabled={idx === course.lectures.length - 1 || pending}
                                  className="rounded p-0.5 text-zinc-300 hover:bg-zinc-200 disabled:opacity-20"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            {/* 썸네일 */}
                            <td className="hidden sm:table-cell w-24 px-3 py-3">
                              {lec.videoId ? (
                                <a href={ytUrl(lec.videoId)} target="_blank" rel="noopener noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ytThumb(lec.videoId)}
                                    alt={lec.title}
                                    className="h-12 w-20 rounded object-cover border border-zinc-100 hover:opacity-80"
                                  />
                                </a>
                              ) : (
                                <div className="h-12 w-20 rounded bg-zinc-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                  </svg>
                                </div>
                              )}
                            </td>
                            {/* 제목 */}
                            <td className="px-3 py-3">
                              <p className="font-medium text-zinc-900 text-sm">{lec.title}</p>
                              {lec.videoId && (
                                <a
                                  href={ytUrl(lec.videoId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 font-mono text-[11px] text-zinc-400 hover:text-zinc-700 hover:underline"
                                >
                                  {lec.videoId}
                                </a>
                              )}
                              {lec.materialUrl && (
                                <div className="mt-1 flex items-center gap-2">
                                  <a
                                    href={lec.materialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    강의 자료
                                  </a>
                                </div>
                              )}
                            </td>
                            {/* 액션 */}
                            <td className="px-3 py-3 text-right w-24">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditLecture(lec)}
                                  className="rounded px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLecture(lec.id, lec.title)}
                                  disabled={pending}
                                  className="rounded px-2.5 py-1 text-xs text-red-400 hover:bg-red-50"
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─ 강좌 생성 모달 */}
      <Modal open={modal?.kind === 'createCourse'} onClose={() => setModal(null)} title="강좌 생성" size="md">
        <div className="space-y-4">
          <InputField
            label="강좌명"
            required
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="예: 수학 기초 강좌"
          />
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">접근 허용 분반</p>
            <div className="grid grid-cols-2 gap-2">
              {classOptions.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={newCourseClasses.includes(c.id)}
                    onChange={() => toggleClass(c.id, newCourseClasses, setNewCourseClasses)}
                    className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900"
                  />
                  <span className="text-sm text-zinc-700">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50">취소</button>
            <button type="button" onClick={handleCreateCourse} disabled={pending} className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">{pending ? '생성 중…' : '생성'}</button>
          </div>
        </div>
      </Modal>

      {/* ─ 접근 분반 수정 모달 */}
      <Modal open={modal?.kind === 'editAccess'} onClose={() => setModal(null)} title="접근 허용 분반 수정" size="md">
        <div className="space-y-4">
          {modal?.kind === 'editAccess' && (
            <p className="text-sm font-medium text-zinc-700">{modal.courseName}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {classOptions.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 cursor-pointer hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={editAccessClasses.includes(c.id)}
                  onChange={() => toggleClass(c.id, editAccessClasses, setEditAccessClasses)}
                  className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">{c.name}</span>
              </label>
            ))}
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50">취소</button>
            <button type="button" onClick={handleEditAccess} disabled={pending} className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">{pending ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      </Modal>

      {/* ─ 동기화 모달 */}
      <Modal open={modal?.kind === 'sync'} onClose={() => setModal(null)} title="YouTube 플레이리스트 동기화" size="md">
        <div className="space-y-4">
          {modal?.kind === 'sync' && (
            <p className="text-xs text-zinc-500">강좌: <span className="font-medium text-zinc-800">{modal.courseName}</span></p>
          )}
          <InputField
            label="플레이리스트 URL"
            required
            value={syncUrl}
            onChange={(e) => setSyncUrl(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=PLxxxx"
          />
          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 space-y-1">
            <p>· 이 강좌에 이 플레이리스트로 동기화된 기존 영상을 교체합니다.</p>
            <p>· 개별 추가된 영상은 영향 없습니다.</p>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          {syncResult && <p className="text-sm font-medium text-zinc-700">{syncResult}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50">닫기</button>
            {!syncResult && (
              <button type="button" onClick={handleSync} disabled={pending} className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">{pending ? '동기화 중…' : '동기화'}</button>
            )}
          </div>
        </div>
      </Modal>

      {/* ─ 강의 추가/수정 모달 */}
      <Modal
        open={modal?.kind === 'addLecture' || modal?.kind === 'editLecture'}
        onClose={() => setModal(null)}
        title={modal?.kind === 'editLecture' ? '강의 수정' : '강의 추가'}
        size="md"
      >
        <div className="space-y-4">
          <InputField label="강의 제목" required value={lectureForm.title} onChange={(e) => setLectureForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 1주차 등차수열 개념" />
          <div>
            <InputField
              label="YouTube Video ID"
              value={lectureForm.videoId}
              onChange={(e) => setLectureForm((f) => ({ ...f, videoId: e.target.value }))}
              placeholder="예: dQw4w9WgXcQ"
            />
            <p className="mt-1 text-xs text-zinc-400">URL의 <code className="bg-zinc-100 px-1 rounded">v=</code> 뒤 값</p>
          </div>
          <InputField
            label="강의 자료 링크"
            value={lectureForm.materialUrl}
            onChange={(e) => setLectureForm((f) => ({ ...f, materialUrl: e.target.value }))}
            placeholder="PDF, Google Drive 등 자료 링크"
          />
          <InputField label="순서" type="number" value={lectureForm.orderNum} onChange={(e) => setLectureForm((f) => ({ ...f, orderNum: e.target.value }))} />
          {lectureForm.videoId && (
            <div className="rounded-lg overflow-hidden border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ytThumb(lectureForm.videoId)} alt="썸네일" className="w-full h-auto" />
            </div>
          )}
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50">취소</button>
            <button type="button" onClick={handleSaveLecture} disabled={pending} className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">{pending ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
