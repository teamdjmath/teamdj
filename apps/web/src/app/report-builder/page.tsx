import type { Metadata } from 'next'
import { ReportBuilderClient } from './_components/report-builder-client'

export const metadata: Metadata = {
  title: '학습 리포트 생성기 | TeamDJ',
  description: '엑셀 파일을 업로드해 학생별 학습 리포트를 생성하고 PNG로 다운로드합니다.',
}

export default function ReportBuilderPage() {
  return <ReportBuilderClient />
}
