import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 | TeamDJ',
}

const EFFECTIVE_DATE = '2025년 7월 1일'
const COMPANY = 'TeamDJ'
const CONTACT_EMAIL = 'teamdj.info@gmail.com'

export default function PrivacyPage() {
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
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">개인정보처리방침</h1>
          <p className="mt-2 text-sm text-zinc-500">시행일: {EFFECTIVE_DATE}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-700">

          {/* 전문 */}
          <Section>
            <p>
              {COMPANY}(이하 &quot;서비스&quot;)은 「개인정보보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
            </p>
          </Section>

          {/* 제1조 */}
          <Section title="제1조 (개인정보의 처리 목적)">
            <p>서비스는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              <li>회원 가입 및 관리 — 회원제 서비스 제공에 따른 본인 식별·인증</li>
              <li>학습 관리 서비스 제공 — 출결 관리, 과제·성적 조회, 학습 리포트 작성 및 발송</li>
              <li>학부모 소통 — 카카오톡을 통한 학습 리포트 발송 및 알림</li>
              <li>서비스 개선 — 접속 빈도 파악 및 서비스 이용에 관한 통계 분석</li>
            </ol>
          </Section>

          {/* 제2조 */}
          <Section title="제2조 (처리하는 개인정보의 항목)">
            <Table
              headers={['구분', '수집 항목', '수집 방법']}
              rows={[
                ['학생', '이름, 전화번호(로그인 ID), 학교, 학년', '관리자 직접 등록'],
                ['학부모', '이름, 전화번호(카카오톡 발송용)', '관리자 직접 등록'],
                ['직원(선생님/조교)', '이름, 이메일', '초대코드 회원가입'],
                ['자동 수집', '서비스 이용 기록, 접속 IP', '서비스 이용 시 자동 생성'],
                ['학습 데이터', '출결 기록, 테스트 점수, 과제 완료율, Q&A 내용, 학습 리포트', '서비스 이용 과정 중 생성'],
              ]}
            />
            <p className="mt-3 text-xs text-zinc-500">
              ※ 전화번호는 서비스 내부에서 로그인 ID({'{전화번호}@teamdj.com'})로 변환되어 저장됩니다.
            </p>
          </Section>

          {/* 제3조 */}
          <Section title="제3조 (개인정보의 처리 및 보유 기간)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>서비스는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</li>
              <li>학원 수강 종료 후 회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</li>
              <li>관련 법령에 의한 보존 기간
                <Table
                  className="mt-2"
                  headers={['항목', '근거 법령', '보존 기간']}
                  rows={[
                    ['계약 및 청약철회 기록', '전자상거래법', '5년'],
                    ['소비자 불만·분쟁 처리 기록', '전자상거래법', '3년'],
                    ['접속에 관한 기록', '통신비밀보호법', '3개월'],
                  ]}
                />
              </li>
            </ol>
          </Section>

          {/* 제4조 */}
          <Section title="제4조 (개인정보의 제3자 제공)">
            <p>서비스는 정보주체의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.</p>
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              <li>정보주체가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              <li>카카오(주) — 학습 리포트 카카오톡 발송 시 학부모 전화번호 제공. 수신 후 즉시 파기하며 마케팅 목적으로는 사용하지 않습니다.</li>
            </ol>
          </Section>

          {/* 제5조 */}
          <Section title="제5조 (개인정보 처리 위탁)">
            <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
            <Table
              className="mt-3"
              headers={['수탁자', '위탁 업무', '보유 기간']}
              rows={[
                ['Supabase Inc. (미국)', '데이터베이스 저장 및 인증 처리', '위탁 계약 종료 시까지'],
                ['Vercel Inc. (미국)', '웹 서버 호스팅 및 파일 저장', '위탁 계약 종료 시까지'],
                ['카카오(주) (대한민국)', '카카오톡 메시지 발송', '발송 완료 후 즉시 파기'],
                ['Alphabet Inc. (미국)', '강의 영상 제공 (YouTube)', '위탁 계약 종료 시까지'],
              ]}
            />
            <p className="mt-3">
              서비스는 위탁계약 체결 시 「개인정보보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독 등에 관한 사항을 계약서에 명시하고 있습니다.
            </p>
            <p className="mt-2">
              국외 이전 관련하여 서버가 미국에 위치한 서비스를 이용함에 따라 귀하의 개인정보가 미국으로 이전될 수 있습니다. 각 수탁자의 개인정보보호 정책은 해당 업체의 웹사이트에서 확인하실 수 있습니다.
            </p>
          </Section>

          {/* 제6조 */}
          <Section title="제6조 (정보주체의 권리·의무 및 행사 방법)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>정보주체는 서비스에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
                <ul className="mt-2 ml-5 space-y-1 list-disc">
                  <li>개인정보 열람 요구</li>
                  <li>오류 등이 있을 경우 정정 요구</li>
                  <li>삭제 요구</li>
                  <li>처리정지 요구</li>
                </ul>
              </li>
              <li>권리 행사는 아래 개인정보 보호책임자에게 이메일로 요청하실 수 있으며, 10일 이내에 조치하겠습니다.</li>
              <li>정보주체의 법정대리인이나 위임을 받은 자는 대리인임을 증명하는 서류를 제출하여 권리를 행사할 수 있습니다.</li>
            </ol>
          </Section>

          {/* 제7조 */}
          <Section title="제7조 (만 14세 미만 아동의 개인정보 처리)">
            <p>
              서비스는 만 14세 미만 아동의 개인정보를 수집하는 경우 법정대리인(부모)의 동의를 받아 처리합니다. 학원에 재원 중인 만 14세 미만 학생의 개인정보는 학원 원장 또는 담당 선생님이 법정대리인의 동의를 확인한 후 관리자 계정을 통해 등록합니다.
            </p>
          </Section>

          {/* 제8조 */}
          <Section title="제8조 (개인정보의 안전성 확보 조치)">
            <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>관리적 조치: 개인정보 취급 직원 최소화 및 교육</li>
              <li>기술적 조치: 개인정보처리시스템 접근권한 관리, 역할 기반 접근 제어(RLS), HTTPS 암호화 전송</li>
              <li>물리적 조치: 전산실 및 자료보관실 접근 통제 (데이터센터는 위탁사 기준 적용)</li>
              <li>비밀번호 암호화: 모든 비밀번호는 Supabase Auth에 의해 bcrypt로 해시 저장</li>
            </ul>
          </Section>

          {/* 제9조 */}
          <Section title="제9조 (개인정보 보호책임자)">
            <p>서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 개인정보 관련 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
            <div className="mt-3 p-4 rounded-xl bg-zinc-100 space-y-1">
              <p><span className="font-medium">개인정보 보호책임자:</span> TeamDJ 운영팀</p>
              <p><span className="font-medium">이메일:</span> {CONTACT_EMAIL}</p>
            </div>
            <p className="mt-3">
              정보주체는 서비스를 이용하면서 발생한 모든 개인정보보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다. 서비스는 정보주체의 문의에 지체없이 답변 및 처리해드릴 것입니다.
            </p>
          </Section>

          {/* 제10조 */}
          <Section title="제10조 (개인정보 처리방침 변경)">
            <ol className="space-y-2 list-decimal list-inside">
              <li>이 개인정보처리방침은 {EFFECTIVE_DATE}부터 적용됩니다.</li>
              <li>이전의 개인정보처리방침은 서비스 내 공지사항에서 확인하실 수 있습니다.</li>
            </ol>
          </Section>

          {/* 권리구제 */}
          <Section title="개인정보 침해 신고 및 상담 기관">
            <ul className="space-y-1 list-disc list-inside">
              <li>개인정보분쟁조정위원회: <span className="font-mono">1833-6972</span> / www.kopico.go.kr</li>
              <li>개인정보침해신고센터: <span className="font-mono">(국번없이) 118</span> / privacy.kisa.or.kr</li>
              <li>대검찰청 사이버범죄수사단: <span className="font-mono">02-3480-3573</span> / www.spo.go.kr</li>
              <li>경찰청 사이버범죄 신고시스템: <span className="font-mono">(국번없이) 182</span> / cyberbureau.police.go.kr</li>
            </ul>
          </Section>

          <div className="pt-4 border-t border-zinc-200 flex gap-4 text-xs text-zinc-400">
            <Link href="/terms" className="hover:text-zinc-700 transition-colors">이용약관 →</Link>
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

function Table({
  headers,
  rows,
  className = '',
}: {
  headers: string[]
  rows: string[][]
  className?: string
}) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-zinc-200 ${className}`}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-100">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-semibold text-zinc-700 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-zinc-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
