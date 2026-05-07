import Link from 'next/link'

export default function ClassNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <p className="text-base font-semibold text-zinc-700">찾을 수 없는 페이지입니다</p>
      <p className="text-sm text-zinc-400">해당 분반이 존재하지 않거나 삭제되었습니다.</p>
      <Link
        href="/admin/classes"
        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        목록으로 돌아가기
      </Link>
    </div>
  )
}
