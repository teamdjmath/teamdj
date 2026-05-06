type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = {
  action?: string
  userId?: string
  role?: string
  input?: unknown
  error?: unknown
  supabaseCode?: string
  duration?: number
  requestId?: string
}

export type SupabaseErrorParsed = {
  code: string
  message: string
  hint?: string
  details?: string
}

const PG_CODE_MAP: Record<string, string> = {
  '23505':           '중복된 데이터입니다',
  '23503':           '참조하는 데이터가 존재하지 않습니다',
  '42501':           '접근 권한이 없습니다 (RLS)',
  'PGRST116':        '데이터를 찾을 수 없습니다',
  'auth/user-not-found': '존재하지 않는 계정입니다',
}

const SENSITIVE = new Set([
  'password', 'password_hash', 'key', 'secret',
  'token', 'service_role', 'authorization', 'apikey',
])

function sanitize(val: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]'
  if (val === null || typeof val !== 'object') return val
  if (Array.isArray(val)) return val.map((v) => sanitize(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    out[k] = SENSITIVE.has(k.toLowerCase()) ? '[REDACTED]' : sanitize(v, depth + 1)
  }
  return out
}

export function parseSupabaseError(error: unknown): SupabaseErrorParsed {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const code = String(e.code ?? e.status ?? 'UNKNOWN')
    const rawMsg = String(e.message ?? '알 수 없는 오류')
    return {
      code,
      message: PG_CODE_MAP[code] ?? rawMsg,
      hint:    e.hint    != null ? String(e.hint)    : undefined,
      details: e.details != null ? String(e.details) : undefined,
    }
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message }
  }
  return { code: 'UNKNOWN', message: '알 수 없는 오류' }
}

const IS_PROD = process.env.NODE_ENV === 'production'

const DEV_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info:  '\x1b[32m',
  warn:  '\x1b[33m',
  error: '\x1b[31m',
}
const RESET = '\x1b[0m'

function emit(level: LogLevel, message: string, ctx: LogContext) {
  const ts = new Date().toISOString()
  const requestId = ctx.requestId ?? crypto.randomUUID().slice(0, 8)

  const safeCtx: Record<string, unknown> = {
    ...ctx,
    requestId,
    input: ctx.input != null ? sanitize(ctx.input) : undefined,
    error: ctx.error != null ? parseSupabaseError(ctx.error) : undefined,
  }

  // Remove undefined fields
  for (const k of Object.keys(safeCtx)) {
    if (safeCtx[k] === undefined) delete safeCtx[k]
  }

  if (IS_PROD) {
    process.stdout.write(JSON.stringify({ ts, level, message, ...safeCtx }) + '\n')
    return
  }

  const color = DEV_COLORS[level]
  const tag = `${color}[${level.toUpperCase().padEnd(5)}]${RESET}`
  const ctxStr = Object.entries(safeCtx)
    .filter(([k]) => k !== 'requestId')
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' ')

  const fn = level === 'error' ? console.error
    : level === 'warn' ? console.warn
    : console.log
  fn(`${tag} [${requestId}] ${message}${ctxStr ? '  ' + ctxStr : ''}`)
}

export const logger = {
  debug: (msg: string, ctx: LogContext = {}) => emit('debug', msg, ctx),
  info:  (msg: string, ctx: LogContext = {}) => emit('info',  msg, ctx),
  warn:  (msg: string, ctx: LogContext = {}) => emit('warn',  msg, ctx),
  error: (msg: string, ctx: LogContext = {}) => emit('error', msg, ctx),
}
