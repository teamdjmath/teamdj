import { redirect } from 'next/navigation'

// 문의 & 발송 화면으로 통합됨 — 기존 링크/북마크 대비 리다이렉트만 유지
export default function ConsultationsRedirect() {
  redirect('/admin/messages?tab=inquiries')
}
