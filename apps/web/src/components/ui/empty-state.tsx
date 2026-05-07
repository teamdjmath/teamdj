import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  description?: string
  icon?: ReactNode
}

export function EmptyState({ message, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-3 text-zinc-300">{icon}</div>
      )}
      <p className="text-sm font-semibold text-zinc-500">{message}</p>
      {description && (
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
      )}
    </div>
  )
}
