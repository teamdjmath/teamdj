import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Modal,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

interface Score {
  id: string
  subject: string | null
  score: number
  maxScore: number
  testDate: string
}

interface ReportItem {
  id: string
  createdAt: string
  imageUrl: string | null
}

export default function ReportScreen() {
  const [scores, setScores] = useState<Score[]>([])
  const [att, setAtt] = useState({ present: 0, late: 0, absent: 0 })
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [scoreRes, attRes, reportRes] = await Promise.all([
          supabase
            .from('test_scores')
            .select('id, score, max_score, subject, test_date')
            .eq('student_id', user.id)
            .order('test_date', { ascending: false })
            .limit(10),
          supabase
            .from('attendance')
            .select('status')
            .eq('student_id', user.id)
            .gte('date', THIRTY_DAYS_AGO),
          supabase
            .from('reports')
            .select('id, created_at, image_url')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        const attCount = { present: 0, late: 0, absent: 0 }
        for (const row of attRes.data ?? []) {
          const s = row.status as string
          if (s === 'present') attCount.present++
          else if (s === 'late') attCount.late++
          else if (s === 'absent') attCount.absent++
        }

        setScores(
          (scoreRes.data ?? []).map((s) => ({
            id: s.id as string,
            subject: s.subject as string | null,
            score: s.score as number,
            maxScore: s.max_score as number,
            testDate: s.test_date as string,
          })),
        )
        setAtt(attCount)
        setReports(
          (reportRes.data ?? []).map((r) => ({
            id: r.id as string,
            createdAt: r.created_at as string,
            imageUrl: r.image_url as string | null,
          })),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const attTotal = att.present + att.late + att.absent

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#09090b" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>리포트</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 출석 현황 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>출석 현황 (최근 30일)</Text>
          {attTotal === 0 ? (
            <Text style={styles.empty}>출결 데이터가 없습니다.</Text>
          ) : (
            <View style={styles.attGrid}>
              <AttStat label="출석" value={att.present} total={attTotal} />
              <AttStat label="지각" value={att.late} total={attTotal} />
              <AttStat label="결석" value={att.absent} total={attTotal} />
            </View>
          )}
        </View>

        {/* 성적 목록 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>최근 성적</Text>
          {scores.length === 0 ? (
            <Text style={styles.empty}>등록된 성적이 없습니다.</Text>
          ) : (
            scores.map((s, i) => {
              const pct = s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0
              return (
                <View
                  key={s.id}
                  style={[styles.scoreItem, i < scores.length - 1 && styles.scoreBorder]}
                >
                  <View style={styles.scoreLeft}>
                    <Text style={styles.scoreSubject}>{s.subject ?? '시험'}</Text>
                    <Text style={styles.scoreDate}>
                      {new Date(s.testDate).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.scoreRight}>
                    <Text style={styles.scoreValue}>
                      {s.score}
                      <Text style={styles.scoreMax}> / {s.maxScore}</Text>
                    </Text>
                    <View style={styles.scoreBar}>
                      <View
                        style={[
                          styles.scoreBarFill,
                          { width: `${pct}%` as `${number}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </View>

        {/* 학습 리포트 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>학습 리포트</Text>
          {reports.length === 0 ? (
            <Text style={styles.empty}>발송된 리포트가 없습니다.</Text>
          ) : (
            reports.map((r, i) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.reportItem, i < reports.length - 1 && styles.reportBorder]}
                activeOpacity={r.imageUrl ? 0.7 : 1}
                onPress={() => r.imageUrl && setSelectedImage(r.imageUrl)}
              >
                <View style={styles.reportLeft}>
                  <Text style={styles.reportDate}>
                    {new Date(r.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })} 리포트
                  </Text>
                  <Text style={styles.reportSub}>
                    {r.imageUrl ? '탭하여 이미지 보기' : '이미지 없음'}
                  </Text>
                </View>
                {r.imageUrl && (
                  <Text style={styles.chevron}>›</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* 이미지 전체보기 모달 */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.modalCloseText}>닫기 ✕</Text>
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

function AttStat({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <View style={styles.attStat}>
      <Text style={styles.attValue}>{value}</Text>
      <Text style={styles.attLabel}>{label}</Text>
      <Text style={styles.attPct}>{pct}%</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#09090b', marginBottom: 4 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },
  empty: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', paddingVertical: 8 },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e4e4e7', padding: 16, gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#09090b' },

  // 출석
  attGrid: { flexDirection: 'row', gap: 10 },
  attStat: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#f4f4f5',
    padding: 12, alignItems: 'center', gap: 2,
  },
  attValue: { fontSize: 24, fontWeight: '700', color: '#09090b' },
  attLabel: { fontSize: 12, color: '#71717a' },
  attPct: { fontSize: 10, color: '#d4d4d8' },

  // 성적
  scoreItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, gap: 12 },
  scoreBorder: { borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  scoreLeft: { gap: 2 },
  scoreSubject: { fontSize: 13, fontWeight: '500', color: '#09090b' },
  scoreDate: { fontSize: 11, color: '#a1a1aa' },
  scoreRight: { alignItems: 'flex-end', gap: 4 },
  scoreValue: { fontSize: 15, fontWeight: '700', color: '#09090b' },
  scoreMax: { fontSize: 13, fontWeight: '400', color: '#a1a1aa' },
  scoreBar: { width: 80, height: 3, borderRadius: 99, backgroundColor: '#f4f4f5', overflow: 'hidden' },
  scoreBarFill: { height: 3, borderRadius: 99, backgroundColor: '#09090b' },

  // 리포트
  reportItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  reportBorder: { borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  reportLeft: { flex: 1, gap: 2 },
  reportDate: { fontSize: 13, fontWeight: '500', color: '#09090b' },
  reportSub: { fontSize: 11, color: '#a1a1aa' },
  chevron: { fontSize: 20, color: '#d4d4d8' },

  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modalContent: { width: '100%', maxWidth: 400 },
  modalClose: { alignSelf: 'flex-end', marginBottom: 10 },
  modalCloseText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  modalImage: { width: '100%', aspectRatio: 0.7, borderRadius: 16 },
})
