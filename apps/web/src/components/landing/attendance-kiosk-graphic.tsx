// 실제 출결 단말기 화면을 사진 대신 벡터 그래픽으로 재현한 컴포넌트.
// 사진은 화면 반사·블러 때문에 캡처가 깨끗하게 안 나와서, 색상·레이아웃만 그대로 옮겨 그렸다.
export function AttendanceKioskGraphic() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm">
      {/* 좌측 패널 */}
      <div className="flex w-[38%] shrink-0 flex-col items-center bg-gradient-to-b from-sky-500 to-blue-600 px-3 py-4 text-white">
        <span className="self-start rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold tracking-tight">
          ⚙ 설정
        </span>

        <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p className="mt-1 text-[11px] font-black tracking-tight">TeamDJ</p>

        <p className="mt-3 text-[8px] font-medium text-white/80">2026년 08월 13일 목요일</p>
        <p className="text-lg font-black tabular-nums tracking-tight">17:52</p>

        <p className="mt-3 text-center text-[8px] leading-relaxed text-white/85">
          본 단말기에서는 현재
          <br />
          출입 기록이 없습니다.
        </p>

        <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold">
          <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          QR코드
        </span>
      </div>

      {/* 우측 키패드 */}
      <div className="flex flex-1 flex-col">
        <p className="border-b border-zinc-100 py-3 text-center text-[11px] font-bold text-blue-600">
          출결번호를 입력하세요.
        </p>
        <div className="grid flex-1 grid-cols-3 place-items-center">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <span key={n} className="text-base font-bold text-blue-500">
              {n}
            </span>
          ))}
          <span className="text-[10px] font-bold text-blue-400">지움</span>
          <span className="text-base font-bold text-blue-500">0</span>
          <span className="text-[10px] font-bold text-blue-400">입력</span>
        </div>
      </div>
    </div>
  );
}
