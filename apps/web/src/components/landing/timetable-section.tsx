/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "motion/react";

// 시간표 이미지 준비되면 이 경로에 파일을 두고 문자열을 채우세요 (예: "/timetable.png").
// public/ 폴더 바로 아래에 두면 "/파일명" 그대로 씁니다.
// 채워지면 데스크톱은 그래픽 대신 이 이미지를 그대로 씁니다.
const TIMETABLE_IMAGE = "";

const DAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];

type TimetableEvent = { day: number; start: string; end: string; title: string; sub: string };

// 2학기 정규반 기준 (8/13~)
const EVENTS: TimetableEvent[] = [
  { day: 0, start: "19:00", end: "22:00", title: "고1 공통수학2", sub: "월목 심화반" },
  { day: 1, start: "19:00", end: "22:00", title: "고1 공통수학2", sub: "화금 고난도반" },
  { day: 3, start: "19:00", end: "22:00", title: "고1 공통수학2", sub: "월목 심화반" },
  { day: 4, start: "19:00", end: "22:00", title: "고1 공통수학2", sub: "화금 고난도반" },
  { day: 5, start: "9:00", end: "11:50", title: "고2 미적분2", sub: "토 심화+고난도A" },
  { day: 5, start: "13:00", end: "15:50", title: "고2 확률과통계", sub: "토 심화+고난도A" },
  { day: 5, start: "16:00", end: "18:50", title: "고2 미적분2", sub: "토 심화+고난도B" },
  { day: 5, start: "19:00", end: "21:50", title: "고2 미적분1", sub: "토 심화+고난도A" },
  { day: 6, start: "13:00", end: "15:50", title: "고2 확률과통계", sub: "일 심화+고난도B" },
  { day: 6, start: "16:00", end: "18:50", title: "고2 확률과통계", sub: "일 실력+심화C" },
  { day: 6, start: "19:00", end: "21:50", title: "고3 팀수업", sub: "일 파이널" },
];

const NOTES = [
  "토요일 미적분2 A반과 B반은 완전히 동일한 수업입니다.",
  "확률과통계 A반과 B반은 동일한 수업이며, C반도 교재가 같으나 개념설명이 더 자세히 들어가고, 대신 고난도 문제풀이의 비중이 축소됩니다.",
  "고1 월목반과 화금반의 주 교재 및 숙제장은 통합본이 제공됩니다. 교재 내에서 월목반과 화금반의 수업내용 및 과제가 나뉘어집니다.",
];

// 모바일 블록 목록용 — EVENTS와 별개 표현(요일 묶어서 표기)이라 따로 관리합니다.
type TimetableRow = { grade: string; name: string; day: string; time: string };
const TIMETABLE_ROWS: TimetableRow[] = [
  { grade: "고1", name: "공통수학2 월목 심화반", day: "월·목", time: "19:00 ~ 22:00" },
  { grade: "고1", name: "공통수학2 화금 고난도반", day: "화·금", time: "19:00 ~ 22:00" },
  { grade: "고2", name: "미적분2 토 심화+고난도A", day: "토", time: "9:00 ~ 11:50" },
  { grade: "고2", name: "확률과통계 토 심화+고난도A", day: "토", time: "13:00 ~ 15:50" },
  { grade: "고2", name: "미적분2 토 심화+고난도B", day: "토", time: "16:00 ~ 18:50" },
  { grade: "고2", name: "미적분1 토 심화+고난도A", day: "토", time: "19:00 ~ 21:50" },
  { grade: "고2", name: "확률과통계 일 심화+고난도B", day: "일", time: "13:00 ~ 15:50" },
  { grade: "고2", name: "확률과통계 일 실력+심화C", day: "일", time: "16:00 ~ 18:50" },
  { grade: "고3", name: "팀수업 일 파이널", day: "일", time: "19:00 ~ 21:50" },
];

const START_HOUR = 9;
const END_HOUR = 22;
const SLOT_MIN = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN;
const ROW_PX = 22;

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
// 9:00 기준 경과 슬롯 수(30분=1) — 정수로 안 떨어지는 시각(11:50 등)도 그대로 소수로 반환.
// px 위치 계산에만 쓰므로 정수일 필요가 없다 (CSS grid-row 라인 번호는 정수만 되고, 이게 예전 버그 원인이었다).
function slotOffset(t: string) {
  return (toMinutes(t) - START_HOUR * 60) / SLOT_MIN;
}
function fmtMin(m: number) {
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => {
  const startMin = START_HOUR * 60 + i * SLOT_MIN;
  return { start: fmtMin(startMin), end: fmtMin(startMin + SLOT_MIN) };
});

function TimetableGrid() {
  const bodyHeight = SLOT_COUNT * ROW_PX;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 text-xs">
      {/* 헤더 */}
      <div className="flex">
        <div className="w-[76px] shrink-0 border-b border-zinc-200 bg-zinc-50" />
        {DAYS.map((d) => (
          <div
            key={d}
            className="flex-1 flex items-center justify-center border-b border-l border-zinc-200 bg-zinc-50 py-2 text-sm font-bold text-zinc-700"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* 시간축 라벨 */}
        <div className="w-[76px] shrink-0">
          {SLOTS.map((slot, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-1 border-b border-zinc-100 text-[9px] text-zinc-400 tabular-nums"
              style={{ height: ROW_PX }}
            >
              <span>{slot.start}</span>
              <span>{slot.end}</span>
            </div>
          ))}
        </div>

        {/* 요일 컬럼 — 배경 격자(flow) + 수업 블록(절대 위치, px 기반이라 11:50처럼 30분 경계가 아닌 시각도 정확히 맞는다) */}
        {DAYS.map((_, di) => (
          <div key={di} className="relative flex-1 border-l border-zinc-100" style={{ height: bodyHeight }}>
            {SLOTS.map((_, i) => (
              <div key={i} className="border-b border-zinc-100" style={{ height: ROW_PX }} />
            ))}
            {EVENTS.filter((ev) => ev.day === di).map((ev, i) => {
              const top = slotOffset(ev.start) * ROW_PX;
              const height = (slotOffset(ev.end) - slotOffset(ev.start)) * ROW_PX;
              return (
                <div
                  key={i}
                  className="absolute inset-x-0.5 flex flex-col items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-1 text-center overflow-hidden"
                  style={{ top, height }}
                >
                  <p className="text-[11px] font-bold text-zinc-900 break-keep leading-tight">{ev.title}</p>
                  <p className="text-[10px] text-emerald-700 break-keep leading-tight">{ev.sub}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

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

        {/* 데스크탑 · 태블릿: 표 이미지 준비되면 이미지로, 아니면 반응형 그래픽 */}
        <div className="hidden sm:block">
          {TIMETABLE_IMAGE ? (
            <img src={TIMETABLE_IMAGE} alt="주간 시간표" className="w-full h-auto rounded-2xl border border-zinc-200" />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <TimetableGrid />
              </div>
            </div>
          )}
        </div>

        {/* 모바일: 블록으로 나열 */}
        <div className="sm:hidden space-y-6">
          {Object.entries(
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
          ))}
        </div>

        {/* 안내사항 */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <ol className="space-y-1.5">
            {NOTES.map((note, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-zinc-500 break-keep">
                <span className="shrink-0 font-bold text-zinc-400">{i + 1}.</span>
                {note}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
