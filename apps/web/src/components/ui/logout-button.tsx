'use client'

import { signOut } from '@/lib/actions/auth'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ className = '', children }: LogoutButtonProps) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={`w-full text-left text-sm text-red-500 hover:text-red-600 transition-colors ${className}`}
      >
        {children ?? '로그아웃'}
      </button>
    </form>
  )
}
