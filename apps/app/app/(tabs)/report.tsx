import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import { LineChart } from 'react-native-gifted-charts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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
  const { user } = useAuth()
  const [scores, setScores] = useState<Score[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    async function load() {
      try {
        const [scoreRes, reportRes] = await Promise.all([
          supabase
            .from('test_scores')
            .select('id, score, max_score, subject, test_date')
            .eq('student_id', user!.id)
            .order('test_date', { ascending: false })
            .limit(10),
          supabase
            .from('reports')
            .select('id, created_at, image_url')
            .eq('student_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        setScores(
          (scoreRes.data ?? []).map((s) => ({
            id: s.id as string,
            subject: s.subject as string | null,
            score: s.score as number,
            maxScore: s.max_score as number,
            testDate: s.test_date as string,
          })),
        )
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
  }, [user])

  const handleDownload = async (imageUrl: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 저장하려면 갤러리 접근 권한이 필요합니다.')
        return
      }
      const filename = `report_${Date.now()}.jpg`
      // @ts-ignore
      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      const downloadRes = await FileSystem.downloadAsync(imageUrl, fileUri)
      if (downloadRes.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadRes.uri)
        Alert.alert('저장 완료', '학습 리포트가 갤러리에 저장되었습니다.')
      } else {
        throw new Error('다운로드 실패')
      }
    } catch {
      Alert.alert('오류', '이미지를 저장하는 중 문제가 발생했습니다.')
    }
  }

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
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 성적 히스토리 차트 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>성적 히스토리</Text>
          {scores.length === 0 ? (
            <Text style={styles.empty}>등록된 성적이 없습니다.</Text>
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={scores.slice().reverse().map((s) => ({
                  value: s.score,
                  label: new Date(s.testDate).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric',
                  }),
                }))}
                height={180}
                noOfSections={4}
                spacing={50}
                initialSpacing={20}
                color="#09090b"
                thickness={2}
                dataPointsColor="#09090b"
                yAxisTextStyle={{ fontSize: 10, color: '#a1a1aa' }}
                xAxisLabelTextStyle={{ fontSize: 10, color: '#a1a1aa' }}
                hideRules
                showVerticalLines
                verticalLinesColor="#f4f4f5"
                xAxisColor="#f4f4f5"
                yAxisColor="#f4f4f5"
                pointerConfig={{
                  pointerStripColor: 'lightgray',
                  pointerStripWidth: 2,
                  pointerColor: 'lightgray',
                  radius: 4,
                  pointerLabelComponent: (items: any) => (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>{items[0].value}</Text>
                    </View>
                  ),
                }}
              />
            </View>
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
                onPress={() => r.imageUrl && handleDownload(r.imageUrl)}
              >
                <View style={styles.reportLeft}>
                  <Text style={styles.reportDate}>
                    {new Date(r.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}{' '}
                    리포트
                  </Text>
                  <Text style={styles.reportSub}>
                    {r.imageUrl ? '탭하여 이미지 저장' : '이미지 없음'}
                  </Text>
                </View>
                {r.imageUrl && (
                  <View style={styles.downloadIconWrap}>
                    <Text style={styles.downloadIcon}>↓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },

  card: { backgroundColor: '#f8f8fa', borderRadius: 24, padding: 20, gap: 16, marginBottom: 4 },
  cardTitle: {
    fontSize: 12, fontWeight: '600', color: '#a1a1aa',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  empty: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', paddingVertical: 12 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },

  chartContainer: { marginTop: 10, marginLeft: -20, backgroundColor: '#f8f8fa' },
  tooltip: { backgroundColor: '#09090b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tooltipText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },

  reportItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 8 },
  reportBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  reportLeft: { flex: 1, gap: 2 },
  reportDate: { fontSize: 14, fontWeight: '500', color: '#09090b' },
  reportSub: { fontSize: 12, color: '#a1a1aa' },
  downloadIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f1f4',
  },
  downloadIcon: { fontSize: 18, color: '#09090b', marginTop: -2 },
})
