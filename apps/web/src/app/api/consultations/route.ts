import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, content } = body

    if (!name?.trim()) return NextResponse.json({ success: false, error: '이름을 입력해주세요.' }, { status: 400 })
    if (!phone?.trim()) return NextResponse.json({ success: false, error: '연락처를 입력해주세요.' }, { status: 400 })
    if (!content?.trim()) return NextResponse.json({ success: false, error: '상담 내용을 입력해주세요.' }, { status: 400 })

    // 연락처 형식 검증 (숫자, 하이픈만 허용)
    if (!/^[\d\-]+$/.test(phone.trim())) {
      return NextResponse.json({ success: false, error: '연락처는 숫자와 하이픈(-)만 사용할 수 있습니다.' }, { status: 400 })
    }

    let admin
    try {
      admin = createAdminClient()
    } catch (envErr) {
      console.error('[consultations] admin client init failed:', envErr)
      return NextResponse.json({ success: false, error: '서버 설정 오류입니다.' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('consultations').insert({
      name: name.trim(),
      phone: phone.trim(),
      content: content.trim(),
    })

    if (error) {
      console.error('[consultations] insert error:', error)
      return NextResponse.json({ success: false, error: '저장에 실패했습니다. (' + error.message + ')' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
