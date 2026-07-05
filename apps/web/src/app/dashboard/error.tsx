'use client'

import { ErrorScreen } from '@/components/ui/error-screen'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorScreen error={error} reset={reset} scope="dashboard" homeHref="/dashboard" />
}
