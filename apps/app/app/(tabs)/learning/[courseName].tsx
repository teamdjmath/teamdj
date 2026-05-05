import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

interface Lecture {
  id: string
  title: string
  youtubeVideoId: string
  orderNum: number
}

export default function CourseDetailScreen() {
  const { courseName } = useLocalSearchParams()
  const decodedCourseName = decodeURIComponent(courseName as string)
  const router = useRouter()
  
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: lecError } = await supabase
          .from('lectures')
          .select('id, title, youtube_video_id, order_num')
          .eq('course_name', decodedCourseName)
          .order('order_num', { ascending: true })

        if (lecError) throw lecError
        
        setLectures((data || []).map(row => ({
          id: row.id as string,
          title: row.title as string,
          youtubeVideoId: (row.youtube_video_id || '') as string,
          orderNum: (row.order_num || 0) as number,
        })))
      } catch (e) {
        setError(e instanceof Error ? e.message : '강의를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [decodedCourseName])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#09090b" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: decodedCourseName, headerShown: true, headerBackTitle: '뒤로' }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 목록으로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{decodedCourseName}</Text>
        <Text style={styles.count}>{lectures.length}개의 강의</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {error && <Text style={styles.error}>{error}</Text>}
        
        {lectures.length === 0 ? (
          <Text style={styles.empty}>등록된 강의가 없습니다.</Text>
        ) : (
          <View style={styles.list}>
            {lectures.map((lec) => (
              <TouchableOpacity
                key={lec.id}
                style={styles.item}
                activeOpacity={0.8}
                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${lec.youtubeVideoId}`)}
              >
                <View style={styles.thumbWrap}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${lec.youtubeVideoId}/mqdefault.jpg` }}
                    style={styles.thumb}
                  />
                  <View style={styles.playOverlay}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </View>
                <View style={styles.info}>
                  <Text style={styles.order}>{lec.orderNum}강</Text>
                  <Text style={styles.lecTitle} numberOfLines={2}>{lec.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 13, color: '#a1a1aa', fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '700', color: '#09090b', letterSpacing: -0.5 },
  count: { fontSize: 13, color: '#a1a1aa', marginTop: 4 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  error: { color: '#ef4444', textAlign: 'center', marginBottom: 20 },
  empty: { textAlign: 'center', color: '#a1a1aa', marginTop: 40 },
  list: { gap: 20 },
  item: { flexDirection: 'row', gap: 16 },
  thumbWrap: { 
    width: 120, aspectRatio: 16/9, borderRadius: 12, overflow: 'hidden', 
    backgroundColor: '#f4f4f5', position: 'relative' 
  },
  thumb: { width: '100%', height: '100%' },
  playOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  playIcon: { fontSize: 20, color: '#ffffff' },
  info: { flex: 1, justifyContent: 'center' },
  order: { fontSize: 11, fontWeight: '700', color: '#09090b', marginBottom: 4 },
  lecTitle: { fontSize: 15, fontWeight: '600', color: '#27272a', lineHeight: 20 },
})
