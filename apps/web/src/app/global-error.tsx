'use client'

import { useEffect, useState } from 'react'

// 배포 직후 옛날 페이지를 들고 있던 브라우저가 없어진 Server Action/청크를 호출할 때 나는 에러.
// reset()은 React 트리만 다시 그릴 뿐 새 JS를 안 받아오므로 이 케이스엔 안 먹는다 — 진짜 새로고침이 필요하다.
const STALE_DEPLOY_PATTERNS = [
  'was not found on the server',
  'ChunkLoadError',
  'Loading chunk',
  'Failed to fetch dynamically imported module',
]
function isStaleDeployError(message: string) {
  return STALE_DEPLOY_PATTERNS.some((p) => message.includes(p))
}

// 자동 새로고침을 무한 반복하지 않도록 이번 세션에 한 번만 시도
const AUTO_RELOAD_KEY = 'teamdj_stale_deploy_reload_once'

// 루트 레이아웃까지 무너졌을 때의 최후 방어선.
// 이 시점엔 Tailwind CSS가 로드되지 않으므로 인라인 스타일만 사용한다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const stale = isStaleDeployError(error.message || '')

  // sessionStorage 확인 + 표시를 마운트 시 한 번에 처리 (effect 안에서 setState 하지 않도록 lazy init에서 계산)
  const [autoReloading] = useState(() => {
    if (typeof window === 'undefined' || !stale) return false
    if (sessionStorage.getItem(AUTO_RELOAD_KEY)) return false
    sessionStorage.setItem(AUTO_RELOAD_KEY, '1')
    return true
  })

  useEffect(() => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        source: 'boundary',
        message: `[global] ${error.message || 'global error boundary triggered'}`,
        digest: error.digest,
        context: { scope: 'global', stack: error.stack?.slice(0, 500) },
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch(() => {})
  }, [error])

  useEffect(() => {
    if (!autoReloading) return
    const t = setTimeout(() => window.location.reload(), 800)
    return () => clearTimeout(t)
  }, [autoReloading])

  const code = error.digest?.slice(0, 8)

  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", backgroundColor: '#fafafa' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 384, width: '100%', backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: 24, padding: 32, textAlign: 'center' }}>
            {stale ? (
              <>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#18181b' }}>
                  {autoReloading ? '최신 버전으로 업데이트하고 있습니다' : '새 버전이 있습니다'}
                </h2>
                <p style={{ marginTop: 8, fontSize: 14, color: '#71717a', lineHeight: 1.6 }}>
                  {autoReloading
                    ? '잠시 후 자동으로 새로고침됩니다.'
                    : '아래 버튼을 눌러 새로고침해주세요. 그래도 안 되면 홈페이지 주소로 다시 접속해주세요.'}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{ marginTop: 24, width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', backgroundColor: '#09090b', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  새로고침
                </button>
              </>
            ) : (
              <>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#18181b' }}>일시적인 오류가 발생했습니다</h2>
                <p style={{ marginTop: 8, fontSize: 14, color: '#71717a', lineHeight: 1.6 }}>
                  오류가 자동으로 접수되었습니다.<br />잠시 후 다시 시도해주세요.
                </p>
                {code && (
                  <p style={{ marginTop: 12, fontSize: 12, color: '#a1a1aa' }}>
                    오류 코드: <strong style={{ fontFamily: 'monospace', color: '#52525b' }}>{code}</strong>
                  </p>
                )}
                <button
                  type="button"
                  onClick={reset}
                  style={{ marginTop: 24, width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', backgroundColor: '#09090b', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  다시 시도
                </button>
              </>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
