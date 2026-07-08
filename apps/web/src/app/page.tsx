import type { Metadata } from "next";
import { AcmeHero } from "@/components/landing/acme-hero";
import { TeacherIntro } from "@/components/landing/teacher-intro";
import { SpecialLectureSection } from "@/components/landing/special-lecture-section";
import { CurriculumSection } from "@/components/landing/curriculum-section";
import { TestimonialSection } from "@/components/landing/testimonial-section";
import { SeminarSection } from "@/components/landing/seminar-section";
import { ClosingSection } from "@/components/landing/closing-section";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { SITE_CONFIG } from "@/lib/site-config";

const TITLE = "TeamDJ — 이동재T 수학 전문 학원";
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

      {/* 1. 상단: AcmeHero */}
      <div id="intro">
        <AcmeHero />
      </div>

      {/* 2. 중앙: TeacherIntro */}
      <TeacherIntro />

      {/* 3. 특강 안내 */}
      <SpecialLectureSection />

      {/* 4. 커리큘럼 라인업 */}
      <CurriculumSection />

      {/* 5. 검증된 내용 (후기) */}
      <TestimonialSection />

      {/* 6. 설명회 안내 */}
      <SeminarSection />

      {/* 7. 마무리: ClosingSection */}
      <ClosingSection />

      <SiteFooter />
    </div>
  );
}
