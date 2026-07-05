import type { NextConfig } from "next";

// CSP 참고:
// - script-src 'unsafe-inline' 'unsafe-eval' : Next.js 클라이언트 하이드레이션에 필요
// - connect-src wss://*.supabase.co : Supabase Realtime 웹소켓
// - frame-src youtube.com : 강의 영상 임베드
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://img.youtube.com https://i.ytimg.com https://*.supabase.co",
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
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
    ]
  },
};

export default nextConfig;
