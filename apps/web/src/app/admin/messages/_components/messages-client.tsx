'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendMessage } from '@/lib/actions/messages'
import { sendKakaoBroadcast } from '@/lib/actions/kakao-broadcast'
import { markInquiryRead } from '@/lib/actions/consultations'

interface ClassOption {
  id: string
  name: string
}

interface StudentOption {
  id: string
  name: string
  classId: string
}

interface MessageRecord {
  id: string
  content: string
  createdAt: string
  targetLabel: string
}

interface KakaoBroadcastRecord {
  id: string
  audience: 'student' | 'parent'
  title: string
  content: string
  sentCount: number
  createdAt: string
  targetLabel: string
}

interface Inquiry {
  id: string
  user_id: string
  student_name: string
  school: string
  grade: string
  content: string
  is_read: boolean
  created_at: string
}

type Channel = 'push' | 'kakao'
type Audience = 'student' | 'parent'
type Scope = 'all' | 'class' | 'individual'
type Tab = 'inquiries' | 'send'

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function SegmentedControl<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; disabled?: boolean }[]
}) {
  return (
    <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={[
            'flex-1 py-2 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
            value === o.value
              ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
              : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-950',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function UnreadDot() {
  return <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 align-middle" />
}

function ReadBadge({ is_read }: { is_read: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${is_read ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600' : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'}`}>
      {is_read ? '읽음' : '미확인'}
    </span>
  )
}

export function MessagesClient({
  classes,
  students,
  messages,
  kakaoBroadcasts,
  inquiries,
  isTeacher,
  initialStudentId = null,
  initialTab = null,
  canSendKakao,
}: {
  classes: ClassOption[]
  students: StudentOption[]
  messages: MessageRecord[]
  kakaoBroadcasts: KakaoBroadcastRecord[]
  inquiries: Inquiry[]
  isTeacher: boolean
  initialStudentId?: string | null
  initialTab?: Tab | null
  canSendKakao: boolean
}) {
  const router = useRouter()
  const preselected = initialStudentId ? students.find((s) => s.id === initialStudentId) : undefined
  const [tab, setTab] = useState<Tab>(initialTab ?? (preselected ? 'send' : isTeacher ? 'inquiries' : 'send'))

  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [inquiryPending, startInquiryTransition] = useTransition()
  const unreadInquiries = inquiries.filter((i) => !i.is_read).length

  const [channel, setChannel] = useState<Channel>('push')
  const [audience, setAudience] = useState<Audience>('student')
  const [scope, setScope] = useState<Scope>(preselected ? 'individual' : 'all')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState(preselected?.id ?? students[0]?.id ?? '')
  const [filterClassId, setFilterClassId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredStudents = filterClassId ? students.filter((s) => s.classId === filterClassId) : students

  function handleChannelChange(c: Channel) {
    setChannel(c)
    if (c === 'push') setAudience('student') // 쪽지는 인앱 수신함이 있는 학생에게만 가능 (학부모 수신함 없음)
  }

  function handleMarkInquiryRead(id: string) {
    startInquiryTransition(async () => {
      await markInquiryRead(id)
      router.refresh()
      setSelectedInquiry((prev) => (prev?.id === id ? { ...prev, is_read: true } : prev))
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = channel === 'push'
        ? await sendMessage({
            scope,
            classId: scope === 'class' ? classId : null,
            studentId: scope === 'individual' ? studentId : null,
            content,
          })
        : await sendKakaoBroadcast({
            audience,
            scope,
            classId: scope === 'class' ? classId : null,
            studentId: scope === 'individual' ? studentId : null,
            title,
            content,
          })
      if (!res.success) { setError(res.error); return }
      setContent('')
      setTitle('')
      setSuccess(channel === 'push' ? '쪽지가 발송되었습니다.' : `카카오톡이 발송되었습니다. (${res.data?.sentCount ?? 0}건)`)
      setTimeout(() => setSuccess(null), 3000)
    })
  }

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 w-fit">
        {isTeacher && (
          <button
            type="button"
            onClick={() => setTab('inquiries')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === 'inquiries' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-500'}`}
          >
            문의{unreadInquiries > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadInquiries}</span>}
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab('send')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === 'send' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-500'}`}
        >
          발송
        </button>
      </div>

      {tab === 'inquiries' && isTeacher && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {inquiries.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">접수된 문의가 없습니다.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-900 text-left text-xs text-zinc-400 dark:text-zinc-600">
                    <th className="px-4 py-3 font-medium">학생</th>
                    <th className="px-4 py-3 font-medium">내용</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">접수일</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-950">
                  {inquiries.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => setSelectedInquiry(i)}
                      className={['cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950', !i.is_read ? 'bg-zinc-50/50 dark:bg-zinc-950/50' : ''].join(' ')}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {!i.is_read && <UnreadDot />}
                        <span>{i.student_name}</span>
                        {i.school && <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-600 font-normal">{i.school}</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-xs">
                        <span className="line-clamp-1">{i.content.slice(0, 40)}{i.content.length > 40 ? '…' : ''}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 hidden md:table-cell">{formatDatetime(i.created_at)}</td>
                      <td className="px-4 py-3"><ReadBadge is_read={i.is_read} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedInquiry && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
              onClick={() => setSelectedInquiry(null)}
            >
              <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">1:1 문의</h2>
                  <button type="button" onClick={() => setSelectedInquiry(null)} className="text-sm text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300">닫기</button>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 dark:text-zinc-600">학생</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedInquiry.student_name}
                      {selectedInquiry.grade && <span className="ml-1 text-zinc-500 dark:text-zinc-500">{selectedInquiry.grade}</span>}
                    </span>
                  </div>
                  {selectedInquiry.school && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 dark:text-zinc-600">학교</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{selectedInquiry.school}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 dark:text-zinc-600">접수일</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{formatDatetime(selectedInquiry.created_at)}</span>
                  </div>
                  <div className="pt-2">
                    <p className="mb-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-600">문의 내용</p>
                    <p className="rounded-xl bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {selectedInquiry.content}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/messages?studentId=${selectedInquiry.user_id}`}
                    className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors text-center"
                  >
                    답장 보내기
                  </Link>
                  {!selectedInquiry.is_read && (
                    <button
                      type="button"
                      disabled={inquiryPending}
                      onClick={() => handleMarkInquiryRead(selectedInquiry.id)}
                      className="flex-1 rounded-xl bg-zinc-950 dark:bg-zinc-50 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:pointer-events-none disabled:bg-zinc-400 dark:disabled:bg-zinc-700 disabled:text-zinc-100 dark:disabled:text-zinc-400 transition-colors"
                    >
                      {inquiryPending ? '처리 중…' : '읽음 처리'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'send' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">발송</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  채널 {!canSendKakao && <span className="font-normal text-zinc-400 dark:text-zinc-600">(카카오톡 발송은 선생님·데스크 조교만 가능)</span>}
                </label>
                <SegmentedControl
                  value={channel}
                  onChange={handleChannelChange}
                  options={[
                    { value: 'push', label: '쪽지' },
                    { value: 'kakao', label: '카카오톡', disabled: !canSendKakao },
                  ]}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  대상 {channel === 'push' && <span className="font-normal text-zinc-400 dark:text-zinc-600">(쪽지는 학부모 수신함이 없어 학생만 가능)</span>}
                </label>
                <SegmentedControl
                  value={audience}
                  onChange={setAudience}
                  options={[
                    { value: 'student', label: '학생' },
                    { value: 'parent', label: '학부모', disabled: channel === 'push' },
                  ]}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">범위</label>
                <SegmentedControl
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: 'all', label: '전체' },
                    { value: 'class', label: '분반' },
                    { value: 'individual', label: '개별' },
                  ]}
                />
              </div>

              {scope === 'class' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">분반 선택</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'individual' && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">분반 필터</label>
                    <select
                      value={filterClassId}
                      onChange={(e) => { setFilterClassId(e.target.value); setStudentId('') }}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                    >
                      <option value="">전체 분반</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      학생 선택 {audience === 'parent' && <span className="font-normal text-zinc-400 dark:text-zinc-600">(해당 학생의 학부모에게 발송)</span>}
                    </label>
                    <select
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                    >
                      {filteredStudents.length === 0 && <option value="">학생 없음</option>}
                      {filteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {channel === 'kakao' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">제목</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="카카오톡 메시지 제목"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="전달할 내용을 입력하세요."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
              {success && <p className="text-xs text-emerald-600">{success}</p>}

              <button
                type="submit"
                disabled={isPending || !content.trim() || (channel === 'kakao' && !title.trim())}
                className="w-full rounded-xl bg-zinc-950 dark:bg-zinc-50 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600"
              >
                {isPending ? '발송 중…' : channel === 'push' ? '쪽지 발송' : '카카오톡 발송'}
              </button>
            </form>
          </div>

          {/* 쪽지 발송 내역 */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">쪽지 발송 내역</h2>
            </div>
            {messages.length === 0 ? (
              <p className="px-5 pb-6 text-center text-sm text-zinc-400 dark:text-zinc-600">발송 내역이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {messages.map((m) => (
                  <li key={m.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 mb-1">{m.targetLabel}</p>
                        <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2">{m.content}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{formatDatetime(m.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 카카오톡 발송 내역 */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">카카오톡 발송 내역</h2>
            </div>
            {kakaoBroadcasts.length === 0 ? (
              <p className="px-5 pb-6 text-center text-sm text-zinc-400 dark:text-zinc-600">발송 내역이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {kakaoBroadcasts.map((k) => (
                  <li key={k.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 mb-1">{k.targetLabel} · {k.sentCount}건</p>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{k.title}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{k.content}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{formatDatetime(k.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
