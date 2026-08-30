'use client'

// 썸네일 클릭 시 이미지를 원본 크기로 크게 보여주는 전체화면 오버레이.
export function ImageLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="첨부 이미지 크게보기" className="max-h-full max-w-full rounded-lg object-contain" />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20 transition-colors"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  )
}
