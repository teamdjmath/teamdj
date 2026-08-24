type Row = {
  date: string;
  day: string;
  start?: string;
  end?: string;
  note?: string;
  noteSpan?: number;
  covered?: boolean; // 이전 행의 note가 rowSpan으로 덮는 행 — 시간 칸을 렌더링하지 않는다
};

const ROWS: Row[] = [
  { date: "9월 17일", day: "목요일", start: "17:00", end: "22:00" },
  { date: "9월 18일", day: "금요일", start: "17:00", end: "22:00" },
  { date: "9월 19일", day: "토요일", start: "9:00", end: "22:00" },
  { date: "9월 20일", day: "일요일", start: "12:00", end: "19:00" },
  { date: "9월 21일", day: "월요일", start: "17:00", end: "22:00" },
  { date: "9월 22일", day: "화요일", start: "17:00", end: "22:00" },
  { date: "9월 23일", day: "수요일", note: "홈페이지(온라인) 첨삭만 진행", noteSpan: 3 },
  { date: "9월 24일", day: "목요일", covered: true },
  { date: "9월 25일", day: "금요일", covered: true },
  { date: "9월 26일", day: "토요일", start: "9:00", end: "22:00" },
  { date: "9월 27일", day: "일요일", start: "12:00", end: "19:00" },
  { date: "9월 28일", day: "월요일", start: "17:00", end: "22:00" },
  { date: "9월 29일", day: "화요일", start: "17:00", end: "22:00" },
  { date: "9월 30일", day: "수요일", start: "17:00", end: "22:00" },
  { date: "10월 1일", day: "목요일", start: "17:00", end: "22:00" },
  { date: "10월 2일", day: "금요일", start: "17:00", end: "22:00" },
  { date: "10월 3일", day: "토요일", start: "17:00", end: "22:00" },
  { date: "10월 4일", day: "일요일", start: "13:00", end: "19:00" },
  { date: "10월 5일", day: "월요일", start: "17:00", end: "22:00" },
  { date: "10월 6일", day: "화요일", start: "17:00", end: "22:00" },
  { date: "10월 7일", day: "수요일", start: "13:00", end: "22:00" },
  { date: "10월 8일", day: "목요일", note: "휴무", noteSpan: 2 },
  { date: "10월 9일", day: "금요일", covered: true },
  { date: "10월 10일", day: "토요일", note: "기말 내신대비 순차개강" },
];

function dayColor(day: string) {
  if (day === "일요일") return "text-red-400";
  if (day === "토요일") return "text-blue-400";
  return "text-zinc-500";
}

export function MidtermScheduleGraphic() {
  return (
    <div className="w-full rounded-3xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-black text-white tracking-wide align-middle mr-2">
          예시
        </span>
        <span className="text-sm font-black tracking-tight text-zinc-900 align-middle">
          26년 2학기 중간내신대비 시간표
        </span>
      </div>
      <div className="max-h-[380px] overflow-y-auto">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0">
            <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <th className="px-2 py-2 font-bold">날짜</th>
              <th className="px-2 py-2 font-bold">요일</th>
              <th className="px-2 py-2 font-bold">시작</th>
              <th className="px-2 py-2 font-bold">종료</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {ROWS.map((row) => (
              <tr key={row.date} className="text-zinc-700">
                <td className="px-2 py-1.5 font-mono tabular-nums whitespace-nowrap">{row.date}</td>
                <td className={`px-2 py-1.5 font-semibold ${dayColor(row.day)}`}>{row.day}</td>
                {row.covered ? null : row.note ? (
                  <td
                    colSpan={2}
                    rowSpan={row.noteSpan ?? 1}
                    className="px-2 py-1.5 font-bold text-emerald-700 bg-emerald-50/50"
                  >
                    {row.note}
                  </td>
                ) : (
                  <>
                    <td className="px-2 py-1.5 font-mono tabular-nums">{row.start}</td>
                    <td className="px-2 py-1.5 font-mono tabular-nums">{row.end}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
