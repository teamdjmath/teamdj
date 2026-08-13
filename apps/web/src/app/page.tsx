import type { Metadata } from "next";
import { AcmeHero } from "@/components/landing/acme-hero";
import { TeacherIntro } from "@/components/landing/teacher-intro";
import { TimetableSection } from "@/components/landing/timetable-section";
import { ClinicTimetableSection } from "@/components/landing/clinic-timetable-section";
import { CurriculumSection } from "@/components/landing/curriculum-section";
import { OpenClassesSection } from "@/components/landing/open-classes-section";
import { SystemSection } from "@/components/landing/system-section";
// import { TestimonialSection } from "@/components/landing/testimonial-section"; // 임시 비공개 (아래 렌더링도 주석 처리)
import { SeminarSection } from "@/components/landing/seminar-section";
import { ClosingSection } from "@/components/landing/closing-section";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { SITE_CONFIG } from "@/lib/site-config";

const TITLE = "TeamDJ - 다원MDS 이동재T";
const DESCRIPTION =
  "고1 공통수학부터 고3·N수 수능 대비까지, TeamDJ 이동재T와 함께하는 1등급 역전 전략. 2026 여름방학 특강 및 정규반 안내.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["수학학원", "이동재T", "TeamDJ", "미적분2", "공통수학2", "수능 수학", "여름방학 특강"],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// 학원 검색 노출용 구조화 데이터 — SITE_CONFIG 채우면 자동 반영
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_CONFIG.academyName || SITE_CONFIG.siteName,
  url: SITE_CONFIG.url,
  ...(SITE_CONFIG.phone && { telephone: SITE_CONFIG.phone }),
  ...(SITE_CONFIG.address && {
    address: { "@type": "PostalAddress", streetAddress: SITE_CONFIG.address },
  }),
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      {/* 1. 인삿말 */}
      <div id="intro">
        <AcmeHero />
      </div>
      <TeacherIntro />

      {/* 2. 시간표 (주간 타임테이블형) */}
      <TimetableSection />

      {/* 3. 클리닉 시간표 */}
      <ClinicTimetableSection />

      {/* 4. 커리큘럼 라인업 */}
      <CurriculumSection />

      {/* 5. 이번학기 개설반 안내 */}
      <OpenClassesSection />

      {/* 6. 교재 & 관리체계 시스템 안내 */}
      <SystemSection />

      {/* 7. 후기 (카카오톡 이미지 캡처본) — 요청으로 임시 비공개, 컴포넌트는 유지 */}
      {/* <TestimonialSection /> */}

      {/* 8. 비공개설명회 (연4회) — 추후 오픈 */}
      <SeminarSection />

      {/* 9. 상담신청 (클릭 시 번호 노출, 클로징 섹션에 통합) */}
      <ClosingSection />

      <SiteFooter />
    </div>
  );
}
