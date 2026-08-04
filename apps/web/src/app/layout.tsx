import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeScope } from "@/components/theme-scope";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DongDongMath",
  description: "TeamDJ LMS",
};

// 다크모드는 /admin 영역에만 구현되어 있음 — 다른 페이지(학생 대시보드, 랜딩 등)에 다크 클래스가 붙으면
// 배경만 어둡게 바뀌고 텍스트는 그대로라 가독성이 깨진다. 그래서 경로를 확인해 /admin에서만 적용한다.
const THEME_SCRIPT = `(function(){try{if(!location.pathname.startsWith('/admin'))return;var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeScope />
        {children}
      </body>
    </html>
  );
}
