'use client'

import { useEffect } from 'react'

// 네이티브 date/time 입력은 브라우저 기본 동작상 우측 아이콘을 눌러야 선택창이 뜬다.
// 칸 어디를 눌러도 선택창이 열리도록 클릭을 위임으로 받아 showPicker()를 호출한다.
// 레이아웃에 한 번만 마운트하면 이후 추가되는 입력에도 자동 적용.
export function NativePickerOpener() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as HTMLInputElement | null
      if (!t || t.tagName !== 'INPUT') return
      if (t.type !== 'date' && t.type !== 'time' && t.type !== 'datetime-local') return
      if (t.disabled || t.readOnly) return
      try {
        t.showPicker?.()
      } catch {
        // 사용자 제스처 문맥이 아니거나 미지원 브라우저 — 기본 동작 유지
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
