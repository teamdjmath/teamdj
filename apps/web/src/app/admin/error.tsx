'use client'

import { ErrorScreen } from '@/components/ui/error-screen'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorScreen error={error} reset={reset} scope="admin" homeHref="/admin/dashboard" />
}
