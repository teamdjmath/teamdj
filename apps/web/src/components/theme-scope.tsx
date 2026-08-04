'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// 다크모드는 /admin에만 구현되어 있다. 클라이언트 라우팅으로 /admin 밖으로 이동하면
// <html>의 dark 클래스가 그대로 남아 다른 페이지가 깨져 보이므로 여기서 제거한다.
export function ThemeScope() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname.startsWith('/admin')) {
      document.documentElement.classList.remove('dark')
    }
  }, [pathname])

  return null
}
