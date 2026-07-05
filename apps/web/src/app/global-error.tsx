'use client'

import { useEffect } from 'react'

// 루트 레이아웃까지 무너졌을 때의 최후 방어선.
// 이 시점엔 Tailwind CSS가 로드되지 않으므로 인라인 스타일만 사용한다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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

  const code = error.digest?.slice(0, 8)

  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", backgroundColor: '#fafafa' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 384, width: '100%', backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: 24, padding: 32, textAlign: 'center' }}>
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
          </div>
        </div>
      </body>
    </html>
  )
}
