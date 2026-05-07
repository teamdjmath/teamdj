'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'

export async function createTodo(content: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createTodo', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const { error } = await supabase.from('student_todos').insert({ student_id: user.id, content })
    if (error) throw error

    revalidatePath('/dashboard/learning')
    return { success: true }
  })
}

export async function toggleTodo(id: string, isCompleted: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('toggleTodo', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const { error } = await supabase
      .from('student_todos')
      .update({ is_completed: isCompleted })
      .eq('id', id)
      .eq('student_id', user.id)
    if (error) throw error

    revalidatePath('/dashboard/learning')
    return { success: true }
  })
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteTodo', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const { error } = await supabase
      .from('student_todos')
      .delete()
      .eq('id', id)
      .eq('student_id', user.id)
    if (error) throw error

    revalidatePath('/dashboard/learning')
    return { success: true }
  })
}
