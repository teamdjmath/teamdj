'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Score {
  date: string
  score: number
  maxScore: number
  subject: string
}

export function ScoreChart({ scores }: { scores: Score[] }) {
  const data = scores.map((s) => ({
    날짜: new Date(s.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    점수: s.score,
    만점: s.maxScore,
    subject: s.subject,
  }))

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="날짜" tick={{ fontSize: 10, fill: '#a1a1aa' }} />
          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e4e4e7',
              backgroundColor: '#fff',
            }}
            formatter={(value, name) => [String(value) + '점', name]}
          />
          <Line
            type="monotone"
            dataKey="점수"
            stroke="#09090b"
            strokeWidth={2}
            dot={{ r: 3, fill: '#09090b', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="만점"
            stroke="#d4d4d8"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
