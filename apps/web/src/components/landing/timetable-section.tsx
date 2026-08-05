/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "motion/react";

// 시간표 이미지 준비되면 이 경로에 파일을 두고 문자열을 채우세요 (예: "/timetable.png").
// public/ 폴더 바로 아래에 두면 "/파일명" 그대로 씁니다.
const TIMETABLE_IMAGE = "";

// 모바일 블록 목록용 데이터 — 이미지와 별개로 학기마다 채워서 관리합니다.
// (이미지 하나만으로는 좁은 화면에서 글씨가 안 보이기 때문에, 모바일은 이 데이터로 따로 나열합니다)
// 2학기 정규반 기준 (8/13~)
type TimetableRow = { grade: string; name: string; day: string; time: string };
const TIMETABLE_ROWS: TimetableRow[] = [
  { grade: "고1", name: "공통수학2 월목반", day: "월·목", time: "19:00 ~ 22:00" },
  { grade: "고1", name: "공통수학2 화금반", day: "화·금", time: "19:00 ~ 22:00" },
  { grade: "고2", name: "확률과 통계 A반", day: "토", time: "13:00 ~ 16:00" },
  { grade: "고2", name: "확률과 통계 B반", day: "일", time: "13:00 ~ 16:00" },
  { grade: "고2", name: "확률과 통계 C반", day: "일", time: "16:00 ~ 19:00" },
  { grade: "고2", name: "미적분2 A반", day: "토", time: "9:00 ~ 12:00" },
  { grade: "고2", name: "미적분2 B반", day: "토", time: "16:00 ~ 19:00" },
  { grade: "고2", name: "미적분1 A반", day: "토", time: "19:00 ~ 22:00" },
  { grade: "고3", name: "수능대비 팀수업", day: "일", time: "19:00 ~ 22:00" },
];

export function TimetableSection() {
  return (
    <section className="w-full py-14 md:py-24 bg-white overflow-hidden" id="timetable">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
            Timetable
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-6 break-keep">
            주간 시간표
          </h2>
        </motion.div>

        {/* 데스크탑 · 태블릿: 표 이미지 그대로 */}
        <div className="hidden sm:block">
          {TIMETABLE_IMAGE ? (
            <img src={TIMETABLE_IMAGE} alt="주간 시간표" className="w-full h-auto rounded-2xl border border-zinc-200" />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-16 text-center text-zinc-400 font-bold text-sm">
              시간표 이미지 준비 중
            </div>
          )}
        </div>

        {/* 모바일: 이미지 대신 블록으로 나열 + 이미지 다운로드 버튼 */}
        <div className="sm:hidden space-y-6">
          {TIMETABLE_ROWS.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-zinc-400 font-bold text-sm">
              시간표 준비 중
            </div>
          ) : (
            Object.entries(
              TIMETABLE_ROWS.reduce<Record<string, TimetableRow[]>>((acc, row) => {
                (acc[row.grade] ??= []).push(row);
                return acc;
              }, {}),
            ).map(([grade, rows]) => (
              <div key={grade}>
                <p className="text-sm font-black text-zinc-950 mb-2">{grade}</p>
                <div className="space-y-2">
                  {rows.map((row, i) => (
                    <div key={i} className="rounded-xl border border-zinc-200 px-4 py-3.5 flex items-center justify-between gap-3">
                      <p className="font-bold text-zinc-950 text-sm break-keep">{row.name}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-emerald-600">{row.day}</p>
                        <p className="text-xs text-zinc-500">{row.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {TIMETABLE_IMAGE && (
            <a
              href={TIMETABLE_IMAGE}
              download
              className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-zinc-700"
            >
              시간표 이미지 다운로드
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
