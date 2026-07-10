import type { NextConfig } from "next";

// CSP 참고:
// - script-src 'unsafe-inline' 'unsafe-eval' : Next.js 클라이언트 하이드레이션에 필요
// - connect-src wss://*.supabase.co : Supabase Realtime 웹소켓
// - frame-src youtube.com : 강의 영상 임베드
// - img-src blob: / media-src : Q&A 첨부 이미지·영상 — blob:은 업로드 전 로컬 미리보기(URL.createObjectURL),
//   supabase.co는 업로드 후 재생. 둘 다 없으면 브라우저가 CSP 위반으로 조용히 렌더링을 막아
//   "첨부가 안 된다"처럼 보임 (실제로는 업로드 자체는 connect-src로 성공함)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // img-src https: — 공지 본문에 외부 이미지 URL을 붙여넣어 미리보기하는 기능 지원 (이미지 로드는 저위험)
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://kapi.kakao.com",
  "frame-src https://www.youtube.com https://youtube.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy',   value: CSP },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  // HSTS: 2년 캐시, includeSubDomains, preload 목록 등록 가능
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
    ]
  },
};

export default nextConfig;
