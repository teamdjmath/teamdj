

import { logger, parseSupabaseError } from '@/lib/logger'
import type { ActionResult } from '@/lib/types/actions'

export async function withAction<T = void>(
  actionName: string,
  userId: string | undefined,
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const start = Date.now()
  const requestId = crypto.randomUUID().slice(0, 8)

  logger.info(`${actionName}:start`, { action: actionName, userId, requestId })

  try {
    const result = await fn()
    const duration = Date.now() - start

    if (result.success) {
      logger.info(`${actionName}:done`, { action: actionName, userId, duration, requestId })
    } else {
      logger.warn(`${actionName}:fail`, {
        action: actionName, userId, duration, error: result.error, requestId,
      })
    }

    return result
  } catch (e) {
    const duration = Date.now() - start
    const parsed = parseSupabaseError(e)

    logger.error(`${actionName}:error`, {
      action:      actionName,
      userId,
      duration,
      error:       e,
      supabaseCode: parsed.code,
      requestId,
    })

    return { success: false, error: parsed.message }
  }
}
