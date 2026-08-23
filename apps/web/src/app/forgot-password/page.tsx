import Link from 'next/link'
import { ForgotPasswordForm } from './_components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">비밀번호 찾기</h1>
          <p className="mt-2 text-sm text-zinc-500">
            가입한 이메일로 비밀번호 재설정 링크를 보내드려요.
            <br />
            (조교/선생님 계정만 이용 가능합니다)
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/login" className="font-medium text-zinc-600 hover:text-zinc-900">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  )
}
