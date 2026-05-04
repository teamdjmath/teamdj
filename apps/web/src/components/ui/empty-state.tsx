interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <p className="py-6 text-center text-[13px] font-bold text-zinc-500">{message}</p>
  )
}
