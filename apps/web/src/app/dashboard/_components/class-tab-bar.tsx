'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

type ClassTab = { id: string; name: string }

function ClassTabBarInner({ classes }: { classes: ClassTab[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeClassId = searchParams.get('classId') ?? classes[0]?.id ?? ''

  function selectClass(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('classId', id)
    router.push(`${pathname}?${params}`)
  }

  return (
    <div className="border-b border-zinc-100 bg-white px-4">
      <div className="max-w-lg mx-auto flex gap-1 overflow-x-auto py-1.5 scrollbar-none">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectClass(c.id)}
            className={[
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeClassId === c.id
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ClassTabBar({ classes }: { classes: ClassTab[] }) {
  if (classes.length <= 1) return null
  return (
    <Suspense>
      <ClassTabBarInner classes={classes} />
    </Suspense>
  )
}
