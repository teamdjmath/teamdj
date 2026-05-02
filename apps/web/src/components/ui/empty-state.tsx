interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <p className="py-6 text-center text-xs text-zinc-400">{message}</p>
  )
}
