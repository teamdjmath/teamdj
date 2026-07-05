import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 | TeamDJ',
}

const EFFECTIVE_DATE = '2025년 7월 1일'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-5 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">이용약관</h1>
          <p className="mt-2 text-sm text-zinc-500">시행일: {EFFECTIVE_DATE}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-700">

          {/* 제1조 */}
          <Section title="제1조 (목적)">
            <p>
              이 약관은 TeamDJ(이하 &quot;서비스&quot;)가 제공하는 학습 관리 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 서비스 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </Section>

          {/* 제2조 */}
          <Section title="제2조 (정의)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>&quot;서비스&quot;란 TeamDJ가 제공하는 학습 관리 플랫폼 및 관련 제반 서비스를 의미합니다.</li>
              <li>&quot;이용자&quot;란 이 약관에 따라 서비스가 제공하는 서비스를 받는 학생, 학부모, 선생님, 조교를 말합니다.</li>
              <li>&quot;계정&quot;이란 이용자가 서비스를 이용하기 위해 설정한 이메일 또는 전화번호와 비밀번호의 조합을 말합니다.</li>
              <li>&quot;콘텐츠&quot;란 서비스 내에서 이용자가 게시하는 게시물, 댓글, 파일 등 일체의 정보를 말합니다.</li>
            </ol>
          </Section>

          {/* 제3조 */}
          <Section title="제3조 (약관의 효력 및 변경)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>이 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.</li>
              <li>서비스는 합리적인 사유가 발생한 경우에는 이 약관을 변경할 수 있으며, 약관이 변경되는 경우 서비스 내 공지사항을 통해 7일 전에 사전 고지합니다.</li>
              <li>이용자가 변경된 약관에 동의하지 않으면 이용을 중단하고 탈퇴를 요청할 수 있습니다.</li>
            </ol>
          </Section>

          {/* 제4조 */}
          <Section title="제4조 (서비스의 제공 및 변경)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>서비스는 다음과 같은 업무를 수행합니다.
                <ul className="mt-2 ml-5 space-y-1 list-disc">
                  <li>출결 관리 및 조회</li>
                  <li>과제 등록 및 완료율 관리</li>
                  <li>테스트 성적 등록 및 조회</li>
                  <li>학습 리포트 작성 및 카카오톡 발송</li>
                  <li>공지사항 및 Q&amp;A 게시판 운영</li>
                  <li>강의 영상 제공</li>
                </ul>
              </li>
              <li>서비스는 운영상·기술상의 필요에 따라 제공하는 서비스를 변경할 수 있습니다. 서비스 내용이 변경될 경우 공지사항을 통해 이용자에게 사전 공지합니다.</li>
            </ol>
          </Section>

          {/* 제5조 */}
          <Section title="제5조 (서비스 이용)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>서비스는 연중무휴 24시간 제공함을 원칙으로 합니다.</li>
              <li>서비스는 시스템 정기점검, 증설 및 교체를 위해 서비스를 일시적으로 중단할 수 있습니다. 이 경우 사전에 공지합니다.</li>
              <li>서비스는 무료로 제공됩니다. 단, 일부 부가 서비스는 유료로 제공될 수 있으며, 이 경우 별도로 안내합니다.</li>
            </ol>
          </Section>

          {/* 제6조 */}
          <Section title="제6조 (이용자의 의무)">
            <p>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              <li>타인의 계정을 도용하거나 허위 정보로 서비스를 이용하는 행위</li>
              <li>서비스에서 얻은 정보를 서비스의 사전 동의 없이 복제, 배포, 출판하거나 상업적으로 이용하는 행위</li>
              <li>다른 이용자의 개인정보를 동의 없이 수집, 저장하거나 유포하는 행위</li>
              <li>서비스의 운영을 고의로 방해하는 행위</li>
              <li>기타 불법적이거나 부당한 행위</li>
            </ol>
          </Section>

          {/* 제7조 */}
          <Section title="제7조 (콘텐츠의 관리)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>이용자가 서비스 내에 게시한 콘텐츠에 대한 권리와 책임은 이용자에게 있습니다.</li>
              <li>서비스는 이용자의 콘텐츠가 다음 각 호에 해당하는 경우 사전 통지 없이 삭제 또는 임시 조치할 수 있습니다.
                <ul className="mt-2 ml-5 space-y-1 list-disc">
                  <li>타인의 명예를 훼손하거나 모욕하는 내용</li>
                  <li>공공질서 및 미풍양속에 위반되는 내용</li>
                  <li>범죄행위에 해당하는 내용</li>
                  <li>타인의 지적재산권을 침해하는 내용</li>
                </ul>
              </li>
            </ol>
          </Section>

          {/* 제8조 */}
          <Section title="제8조 (개인정보보호)">
            <p>
              서비스는 이용자의 개인정보를 보호하기 위해 개인정보처리방침을 운영합니다. 서비스의 개인정보 처리에 관한 사항은{' '}
              <Link href="/privacy" className="text-zinc-900 underline underline-offset-2 hover:no-underline">
                개인정보처리방침
              </Link>
              에서 확인하실 수 있습니다.
            </p>
          </Section>

          {/* 제9조 */}
          <Section title="제9조 (서비스의 책임 제한)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중지, 해결이 곤란한 기술적 결함 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>서비스는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>서비스는 이용자가 서비스를 통해 얻은 정보에 대해 그 정확성, 신뢰성 등에 관하여 책임을 지지 않습니다.</li>
            </ol>
          </Section>

          {/* 제10조 */}
          <Section title="제10조 (계약 해지)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>이용자는 언제든지 개인정보 보호책임자에게 이용 해지를 신청할 수 있습니다.</li>
              <li>서비스는 이용자가 이 약관에서 금지한 행위를 한 경우 사전 통보 없이 서비스 이용을 제한하거나 해지할 수 있습니다.</li>
            </ol>
          </Section>

          {/* 제11조 */}
          <Section title="제11조 (준거법 및 관할법원)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>서비스와 이용자 간 제기된 소송은 대한민국 법을 준거법으로 합니다.</li>
              <li>서비스와 이용자 간 발생한 분쟁에 관한 소송은 서비스 소재지를 관할하는 법원을 전속 관할로 합니다.</li>
            </ol>
          </Section>

          <div className="pt-4 border-t border-zinc-200 text-xs text-zinc-500">
            <p>부칙: 이 약관은 {EFFECTIVE_DATE}부터 시행합니다.</p>
          </div>

          <div className="flex gap-4 text-xs text-zinc-400">
            <Link href="/privacy" className="hover:text-zinc-700 transition-colors">개인정보처리방침 →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section>
      {title && (
        <h2 className="text-base font-bold text-zinc-900 mb-3">{title}</h2>
      )}
      {children}
    </section>
  )
}
