type ClientLogLevel = 'warn' | 'error'

type ClientLogPayload = {
  level: ClientLogLevel
  message: string
  context?: Record<string, unknown>
  url?: string
  userAgent?: string
}

async function sendToServer(payload: ClientLogPayload) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // 로그 전송 실패는 무시 (무한 루프 방지)
  }
}

function buildPayload(
  level: ClientLogLevel,
  message: string,
  context?: Record<string, unknown>,
): ClientLogPayload {
  return {
    level,
    message,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  }
}

export const clientLogger = {
  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[client:warn] ${message}`, context)
    sendToServer(buildPayload('warn', message, context))
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { raw: String(error) }

    console.error(`[client:error] ${message}`, errorInfo, context)
    sendToServer(buildPayload('error', message, { ...context, error: errorInfo }))
  },
}
