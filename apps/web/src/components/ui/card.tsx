import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-[32px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4">
      <div className="flex items-center gap-3">
        {icon && <div>{icon}</div>}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] font-bold text-zinc-300 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="text-sm font-medium text-zinc-400">{action}</div>}
    </div>
  )
}

export function CardContent({ children, className = '' }: CardProps) {
  return (
    <div className={`px-6 pb-6 ${className}`}>
      {children}
    </div>
  )
}
