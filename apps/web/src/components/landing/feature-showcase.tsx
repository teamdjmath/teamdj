"use client";

import { motion } from "motion/react";

/* ── 공통 ── */
function SectionLabel({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${dark ? 'bg-white/10 text-white/60' : 'bg-zinc-100 text-zinc-500'}`}>
      {children}
    </span>
  );
}
function Bullet({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <svg className={`w-4 h-4 shrink-0 mt-1 ${dark ? 'text-white/50' : 'text-zinc-400'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className={`text-sm leading-[1.8] ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>{children}</span>
    </li>
  );
}

/* ── 앱 Card 쉘 (실제 rounded-[32px] 스타일) ── */
function AppCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[32px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
function AppCardHeader({ title }: { title: string }) {
  return (
    <div className="px-6 pt-6 pb-4">
      <h3 className="text-base font-bold text-zinc-900 tracking-tight">{title}</h3>
    </div>
  );
}

/* ── 앱 프레임 (해당 탭이 활성화된 상태 표시) ── */
function PhoneFrame({ activeNav = 2, children }: { activeNav?: number; children: React.ReactNode }) {
  const navItems = ['홈', '학습', 'QnA', '리포트', '더보기'];
  return (
    <div className="w-full max-w-[300px] mx-auto">
      <div className="relative rounded-[40px] bg-zinc-950 p-2 shadow-2xl">
        <div className="rounded-t-[32px] overflow-hidden">
          <div className="bg-white border-b border-zinc-100 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-black tracking-tighter text-zinc-950 italic uppercase">TeamDJ</span>
            <div className="w-5 h-5 rounded-full bg-zinc-100" />
          </div>
        </div>
        <div className="bg-zinc-50 min-h-[480px] px-3 py-3 space-y-3">
          {children}
        </div>
        <div className="rounded-b-[32px] overflow-hidden bg-white border-t border-zinc-100">
          <div className="flex h-12">
            {navItems.map((label, i) => (
              <div key={label} className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${i === activeNav ? 'text-zinc-950' : 'text-zinc-300'}`}>
                <div className={`w-4 h-4 rounded ${i === activeNav ? 'bg-zinc-950' : 'bg-zinc-200'}`} />
                <span className={`text-[8px] ${i === activeNav ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   목업 1: 학습 리포트 (실제 report card 스타일)
───────────────────────────────────────── */
function ReportMockup() {
  const assignments = [
    { num: '1강', issue: '6/14', submit: '6/16', dots: 5 },
    { num: '2강', issue: '6/16', submit: '6/18', dots: 5 },
    { num: '3강', issue: '6/18', submit: '6/20', dots: 4 },
    { num: '4강', issue: '6/20', submit: '6/22', dots: 3 },
    { num: '5강', issue: '6/22', submit: '',     dots: 0 },
  ];

  function Dots({ n }: { n: number }) {
    return (
      <div className="flex gap-[3px] items-center">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full border ${i < n ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300'}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto border border-zinc-200 shadow-xl overflow-hidden bg-white text-left"
         style={{ fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}>
      {/* TeamDJ 헤더 */}
      <div className="bg-zinc-950 px-4 py-2 text-center">
        <span className="text-sm font-black tracking-tighter text-white italic uppercase">TeamDJ</span>
      </div>
      {/* 제목 */}
      <div className="border-b-2 border-zinc-900 px-4 py-2.5 text-center">
        <p className="text-sm font-bold text-zinc-900">6/22 역전의 수학 학습결과</p>
      </div>
      {/* 학생 정보 */}
      <table className="w-full border-collapse text-xs">
        <tbody>
          <tr>
            {[['학교','○○고등학교'],['학년','3'],['이름','홍길동']].map(([k,v]) => (
              <>
                <td key={`k${k}`} className="px-2 py-1.5 font-bold text-zinc-500 bg-zinc-50 border border-zinc-200 text-center whitespace-nowrap">{k}</td>
                <td key={`v${v}`} className="px-2 py-1.5 text-zinc-800 border border-zinc-200">{v}</td>
              </>
            ))}
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-bold text-zinc-500 bg-zinc-50 border border-zinc-200 text-center">출석</td>
            <td className="px-2 py-1.5 text-zinc-800 border border-zinc-200">출석</td>
            <td className="px-2 py-1.5 font-bold text-zinc-500 bg-zinc-50 border border-zinc-200 text-center">강좌</td>
            <td className="px-2 py-1.5 text-zinc-800 border border-zinc-200" colSpan={3}>수학 집중반</td>
          </tr>
        </tbody>
      </table>
      {/* 등원 하원 */}
      <div className="flex border-t border-b border-zinc-200">
        {[['등원','오후 3:55'],['하원','오후 9:10']].map(([label, val], i) => (
          <div key={label} className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${i > 0 ? 'border-l border-zinc-200' : ''}`}>
            <span className="text-[10px] font-bold text-zinc-400 tracking-wide">{label}</span>
            <span className="text-sm font-bold text-zinc-900">{val}</span>
          </div>
        ))}
      </div>
      {/* 학습내용 */}
      <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
        <p className="text-[10px] font-bold text-zinc-400 text-center tracking-wide">학습내용</p>
      </div>
      <div className="px-3 py-2.5 border-b border-zinc-200">
        <p className="text-xs text-zinc-700 leading-relaxed">수열의 극한 / 함수의 극한의 원리 이해 및 극값 판별법, 실전 문제 적용 연습</p>
      </div>
      {/* 테스트 점수 */}
      <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
        <p className="text-[10px] font-bold text-zinc-400 text-center tracking-wide">테스트 점수</p>
      </div>
      <div className="px-3 py-2.5 border-b border-zinc-200 flex items-center justify-between">
        <span className="text-base font-bold text-zinc-900">92점 / 100점</span>
        <span className="text-xs text-zinc-500">반 평균 <strong className="text-zinc-700">76점</strong>  표준편차 <strong className="text-zinc-700">12점</strong></span>
      </div>
      {/* 과제검사 */}
      <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
        <p className="text-[10px] font-bold text-zinc-400 text-center tracking-wide">과제검사</p>
      </div>
      <div className="px-3 py-2.5 border-b border-zinc-200">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-zinc-50">
              {['강좌','출제일','제출일','이행도'].map((h) => (
                <th key={h} className="border border-zinc-200 px-1.5 py-1 font-bold text-zinc-500 text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.num}>
                <td className="border border-zinc-200 px-1.5 py-1 text-center text-zinc-700">{a.num}</td>
                <td className="border border-zinc-200 px-1.5 py-1 text-center text-zinc-700">{a.issue}</td>
                <td className="border border-zinc-200 px-1.5 py-1 text-center text-zinc-700">{a.submit}</td>
                <td className="border border-zinc-200 px-1.5 py-1">
                  <div className="flex justify-center"><Dots n={a.dots} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 특이사항 */}
      <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
        <p className="text-[10px] font-bold text-zinc-400 text-center tracking-wide">특이사항 & 공지사항</p>
      </div>
      <div className="px-3 py-3">
        <p className="text-xs text-zinc-700 leading-relaxed">극한 파트 이해도가 눈에 띄게 향상되었습니다. 다음 수업 전까지 Runner 3강 복습 부탁드립니다.</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   목업 2: Q&A (activeNav=2)
───────────────────────────────────────── */
const QNA_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  answered:    { label: '답변완료', cls: 'bg-zinc-100 text-zinc-900 font-bold' },
  in_progress: { label: '답변중',   cls: 'bg-zinc-950 text-white' },
  open:        { label: '미답변',   cls: 'bg-zinc-100 text-zinc-400' },
};

function QnaMockup() {
  const questions = [
    { title: '수열의 극한 - 7번 문제 질문', status: 'answered', date: '6월 22일' },
    { title: 'Runner 5강 33번 풀이 질문',   status: 'in_progress', date: '6월 20일' },
    { title: 'ATO 모의 23번 접근법 질문',   status: 'open',       date: '6월 18일' },
  ];
  return (
    <PhoneFrame activeNav={2}>
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-zinc-900 tracking-tight">Q&A</p>
        <span className="rounded-2xl bg-zinc-950 px-3 py-1.5 text-[10px] font-bold text-white">새 질문 등록</span>
      </div>
      <div className="flex gap-1 border-b border-zinc-200 px-1">
        {['내 질문', '분반 전체 질문'].map((t, i) => (
          <button key={t} className={`px-3 py-2 text-[10px] font-bold border-b-2 -mb-px ${i === 0 ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {questions.map((q) => {
          const { label, cls } = QNA_STATUS_MAP[q.status];
          return (
            <div key={q.title} className="flex flex-col gap-1.5 p-4 rounded-[24px] bg-zinc-50">
              <div className="flex items-center justify-between gap-2">
                <span className="flex-1 truncate text-[12px] font-bold text-zinc-800">{q.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] ${cls}`}>{label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-400">{q.date}</span>
                <svg className="w-3 h-3 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
      <AppCard>
        <div className="px-4 py-3">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">최근 답변 평가</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <span key={s} className={`text-base ${s <= 4 ? 'text-yellow-400' : 'text-zinc-200'}`}>★</span>
              ))}
            </div>
            <span className="text-[10px] text-zinc-500">4점 · 수열 극한 답변</span>
          </div>
        </div>
      </AppCard>
    </PhoneFrame>
  );
}

/* ─────────────────────────────────────────
   목업 3: 과제 (activeNav=1)
───────────────────────────────────────── */
const CAT_STYLE: Record<string, string> = {
  '기출':   'bg-zinc-950 text-white',
  'Runner': 'bg-zinc-700 text-white',
  'ATO':    'bg-zinc-400 text-white',
};
function catCls(cat: string) {
  return CAT_STYLE[cat] ?? 'bg-zinc-100 text-zinc-500';
}

function AssignmentMockup() {
  const weeks = [
    {
      wk: '5주차',
      items: [
        { title: '수열의 극한 기출 정리', cat: '기출',   pct: 100, due: '6/13' },
        { title: 'Runner 3강 복습',       cat: 'Runner', pct: 75,  due: '6/19' },
      ],
    },
    {
      wk: '6주차',
      items: [
        { title: 'ATO 모의 오답 정리', cat: 'ATO',  pct: 40, due: '6/22' },
        { title: '오답노트 작성',       cat: '기출', pct: 0,  due: '6/26' },
      ],
    },
  ];

  return (
    <PhoneFrame activeNav={1}>
      <p className="text-sm font-bold text-zinc-950 px-1">학습</p>
      <AppCard>
        <AppCardHeader title="강의 영상" />
        <div className="px-4 pb-4 space-y-2">
          {[['수능 수학 (수열의 극한)','8강'],['Runner 특강','3강']].map(([c, n]) => (
            <div key={c} className="rounded-[20px] bg-zinc-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-900">{c}</span>
                  <span className="text-[9px] text-zinc-400">{n}</span>
                </div>
                <svg className="w-3 h-3 text-zinc-400 -rotate-90" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </AppCard>
      <AppCard>
        <AppCardHeader title="과제 목록" />
        <div className="px-4 pb-4 space-y-4">
          {weeks.map(({ wk, items }) => (
            <div key={wk}>
              <p className="mb-2 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">{wk}</p>
              <div className="space-y-3">
                {items.map((a) => (
                  <div key={a.title}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium ${catCls(a.cat)}`}>{a.cat}</span>
                        <span className="truncate text-[11px] font-bold text-zinc-800">{a.title}</span>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-zinc-700">{a.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100">
                      <div className={`h-1.5 rounded-full ${a.pct === 100 ? 'bg-zinc-950' : 'bg-zinc-600'}`} style={{ width: `${a.pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-[9px] text-zinc-400">마감 {a.due}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AppCard>
    </PhoneFrame>
  );
}

/* ─────────────────────────────────────────
   목업 4: 성적 (activeNav=3)
───────────────────────────────────────── */
function ScoreMockup() {
  const scores = [64, 71, 68, 82, 92];
  const labels = ['3월', '4월', '5월', '6월', '7월'];
  const W = 220, H = 70, pad = { l: 20, r: 8, t: 8, b: 16 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const minV = 50, maxV = 100;
  const px = (i: number) => pad.l + (i / (scores.length - 1)) * iW;
  const py = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV)) * iH;
  const line = scores.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(v)}`).join(' ');
  const exams = [
    { name: 'ATO 6월 전국 모의', type: '모의고사', date: '6/4',  score: 92, max: 100, grade: '2등급', rank: '3/18' },
    { name: '1학기 중간고사',     type: '중간고사', date: '5/15', score: 86, max: 100, grade: '3등급', rank: null },
  ];

  return (
    <PhoneFrame activeNav={3}>
      <p className="text-sm font-bold text-zinc-950 px-1">리포트</p>
      <AppCard>
        <AppCardHeader title="성적 히스토리" />
        <div className="px-4 pb-4">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
            {[60,70,80,90,100].map((v) => (
              <line key={v} x1={pad.l} y1={py(v)} x2={W-pad.r} y2={py(v)} stroke="#f4f4f5" strokeWidth={1} />
            ))}
            <path d={scores.map((_,i)=>`${i===0?'M':'L'}${px(i)},${py(100)}`).join(' ')} fill="none" stroke="#d4d4d8" strokeWidth={1.5} strokeDasharray="4 2" />
            <path d={line} fill="none" stroke="#09090b" strokeWidth={2} />
            {scores.map((v,i)=><circle key={i} cx={px(i)} cy={py(v)} r={3} fill="#09090b" />)}
            {labels.map((l,i)=><text key={l} x={px(i)} y={H} textAnchor="middle" fontSize={8} fill="#a1a1aa">{l}</text>)}
          </svg>
        </div>
      </AppCard>
      <AppCard>
        <AppCardHeader title="특별 시험 결과" />
        <div className="px-4 pb-4 divide-y divide-zinc-100">
          {exams.map((e) => (
            <div key={e.name} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-zinc-900">{e.name}</p>
                  <p className="text-[9px] text-zinc-400 mt-0.5">{e.type} · {e.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-semibold text-zinc-900">{e.score} / {e.max}점</p>
                  <div className="flex gap-1 justify-end mt-0.5">
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[8px] text-zinc-600">{e.grade}</span>
                    {e.rank && <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[8px] text-white">{e.rank}등</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AppCard>
    </PhoneFrame>
  );
}

/* ─────────────────────────────────────────
   목업 5: 강의 영상 (activeNav=1)
───────────────────────────────────────── */
function VideoMockup() {
  const lectures = [
    { num: 1, title: '수열의 극한 개념 정리', active: true,  dur: '42:18' },
    { num: 2, title: '수열의 극한 유형 분석', active: false, dur: '38:05' },
    { num: 3, title: '급수와 수렴 판정법',    active: false, dur: '51:30' },
    { num: 4, title: '멱급수와 실전 풀이',    active: false, dur: '47:22' },
  ];

  return (
    <PhoneFrame activeNav={1}>
      <p className="text-sm font-bold text-zinc-950 px-1">학습</p>
      <AppCard>
        <AppCardHeader title="강의 영상" />
        <div className="px-4 pb-4 space-y-2">
          <div className="rounded-[20px] bg-zinc-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-zinc-900">수능 수학 (수열의 극한)</span>
                <span className="text-[9px] text-zinc-400">8강</span>
              </div>
              <svg className="w-3 h-3 text-zinc-400 rotate-90" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="divide-y divide-zinc-100">
              {lectures.map((l) => (
                <div key={l.num} className={`flex items-center gap-2.5 px-4 py-2.5 ${l.active ? 'bg-white' : ''}`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${l.active ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                    {l.active
                      ? <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      : <span className="text-[9px] font-black">{l.num}</span>
                    }
                  </div>
                  <span className={`flex-1 text-[10px] font-semibold truncate ${l.active ? 'text-zinc-950' : 'text-zinc-500'}`}>{l.title}</span>
                  <span className="text-[9px] text-zinc-400 shrink-0">{l.dur}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppCard>
    </PhoneFrame>
  );
}

/* ─────────────────────────────────────────
   메인
───────────────────────────────────────── */
export function FeatureShowcase() {
  return (
    <div>
      {/* ── 학부모 섹션 ── */}
      <section id="for-parents" className="py-32 bg-zinc-950">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <SectionLabel dark>학부모님을 위해</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white break-keep leading-[1.35]">
                리포트 하나로<br />자녀의 학습을<br />파악합니다.
              </h2>
              <p className="text-zinc-400 text-base leading-[2] break-keep">
                수업이 끝나면 선생님이 직접 작성한 학습 리포트가 발행됩니다.
                테스트 점수, 과제 이행도, 등원·하원 시간, 선생님 피드백까지
                한 장에 담겨 있어 별도로 연락하지 않아도 됩니다.
              </p>
              <ul className="space-y-4">
                {[
                  '수업별 테스트 점수 & 반 평균 / 표준편차',
                  '강의별 과제 이행도 (5단계 동그라미)',
                  '등원·하원 시간 기록',
                  '선생님 직접 작성 특이사항 & 공지',
                ].map((item) => <Bullet key={item} dark>{item}</Bullet>)}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <ReportMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 브리지 ── */}
      <div className="py-24 bg-zinc-50 text-center border-y border-zinc-200">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <SectionLabel>학생을 위해</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-950 break-keep leading-[1.35]">
            학생 스스로 성장하는 환경
          </h2>
          <p className="text-zinc-500 text-base max-w-xl mx-auto leading-[2] break-keep px-4">
            질의응답, 과제 관리, 성적 확인, 강의 복습까지<br />
            학생이 학습 전반을 한 곳에서 챙길 수 있습니다.
          </p>
        </motion.div>
      </div>

      {/* ── 기능 1: Q&A ── */}
      <section className="py-32 bg-white">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <SectionLabel>질의응답</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 break-keep leading-[1.35]">
                모르는 문제,<br />바로 질문하세요.
              </h2>
              <p className="text-zinc-500 text-base leading-[2] break-keep">
                문제 사진이나 파일을 올리면 담당 조교가 직접 답변합니다.
                수식 풀이가 필요한 문제도 LaTeX 형식으로 깔끔하게 정리해 드립니다.
                답변이 완료되면 알림이 오고, 도움이 됐는지 별점으로 남길 수 있습니다.
              </p>
              <ul className="space-y-4">
                {[
                  '이미지 · PDF · 파일 첨부 가능',
                  'LaTeX 수식으로 체계적인 풀이 제공',
                  '분반 전체 질문 함께 열람',
                  '1–5점 별점으로 답변 품질 남기기',
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <QnaMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 기능 2: 과제 ── */}
      <section className="py-32 bg-zinc-50">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              className="order-2 lg:order-1"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <AssignmentMockup />
            </motion.div>
            <motion.div
              className="space-y-8 order-1 lg:order-2"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <SectionLabel>과제 관리</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 break-keep leading-[1.35]">
                과제 이행도로<br />습관을 만듭니다.
              </h2>
              <p className="text-zinc-500 text-base leading-[2] break-keep">
                강의 영상과 과제가 한 화면에서 관리됩니다.
                매월승리 · Runner · ATO 모의 같은 카테고리 뱃지로 구분되어
                어떤 유형 과제가 얼마나 남아 있는지 바로 보입니다.
              </p>
              <ul className="space-y-4">
                {[
                  '강의 영상 & 과제 한 화면에서 관리',
                  '카테고리 뱃지로 유형 구분',
                  '진행 바로 완료율 한눈에',
                  '마감일 자동 표시',
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 기능 3: 성적 ── */}
      <section className="py-32 bg-white">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <SectionLabel>성적 분석</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 break-keep leading-[1.35]">
                내 성적 흐름을<br />직접 확인합니다.
              </h2>
              <p className="text-zinc-500 text-base leading-[2] break-keep">
                수업마다 치르는 테스트 점수가 차트로 쌓입니다.
                ATO 전국 모의나 내신 시험 결과도 등급, 반 석차와 함께 기록되어
                내가 지금 어느 위치에 있는지 객관적으로 볼 수 있습니다.
              </p>
              <ul className="space-y-4">
                {[
                  '테스트 점수 월별 추이 차트',
                  '반 평균 · 표준편차 비교',
                  '모의고사 · 내신 시험 통합 조회',
                  '등급 & 반 석차 자동 계산',
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <ScoreMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 기능 4: 강의 영상 ── */}
      <section className="py-32 bg-zinc-50">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              className="order-2 lg:order-1"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <VideoMockup />
            </motion.div>
            <motion.div
              className="space-y-8 order-1 lg:order-2"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <SectionLabel>강의 영상</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 break-keep leading-[1.35]">
                수업 영상으로<br />언제든 복습합니다.
              </h2>
              <p className="text-zinc-500 text-base leading-[2] break-keep">
                수업이 끝나면 영상이 바로 올라옵니다.
                이해가 덜 됐던 부분을 다시 보거나, 다음 수업 전 미리 예습하기에도 좋습니다.
                과제 목록과 함께 있어서 진도 확인도 자연스럽게 됩니다.
              </p>
              <ul className="space-y-4">
                {[
                  '강좌별 강의 목록 정리',
                  '수업 직후 업로드',
                  '과제와 영상 함께 관리',
                  '원하는 강의 즉시 재생',
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 클로징 ── */}
      <div className="py-24 bg-zinc-950 border-t border-zinc-800">
        <motion.div
          className="container max-w-3xl mx-auto px-6 text-center space-y-5"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xl font-black tracking-tighter text-zinc-500 italic uppercase">TeamDJ</p>
          <p className="text-3xl md:text-4xl font-black tracking-tighter text-white break-keep leading-[1.35]">
            역전은 준비된 사람에게 옵니다.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
