import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase, phoneToEmail } from '@/lib/supabase'

type LoginTab = 'student' | 'staff'

export default function LoginScreen() {
  const [tab, setTab] = useState<LoginTab>('student')

  // 학생/학부모 입력
  const [phone, setPhone] = useState('')
  const [studentPw, setStudentPw] = useState('')

  // 선생님/조교 입력
  const [email, setEmail] = useState('')
  const [staffPw, setStaffPw] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      const loginEmail = tab === 'student' ? phoneToEmail(phone) : email.trim()
      const password = tab === 'student' ? studentPw : staffPw

      if (!loginEmail || !password) {
        setError('아이디와 비밀번호를 모두 입력해주세요.')
        return
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        } else {
          setError(authError.message)
        }
        return
      }

      // 역할에 따라 이동 (_layout에서도 처리하지만 즉시 이동)
      const role = data.user?.user_metadata?.role as string | undefined
      if (role === 'teacher' || role === 'ta') {
        // 어드민은 웹에서만 사용 — 그냥 탭으로 보냄
        router.replace('/')
      } else {
        router.replace('/')
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고 */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>TeamDJ</Text>
          <Text style={styles.logoSub}>학습 관리 플랫폼</Text>
        </View>

        {/* 탭 전환 */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'student' && styles.tabBtnActive]}
            onPress={() => { setTab('student'); setError(null) }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === 'student' && styles.tabBtnTextActive]}>
              학생 / 학부모
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'staff' && styles.tabBtnActive]}
            onPress={() => { setTab('staff'); setError(null) }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === 'staff' && styles.tabBtnTextActive]}>
              선생님 · 조교
            </Text>
          </TouchableOpacity>
        </View>

        {/* 폼 */}
        <View style={styles.form}>
          {tab === 'student' ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>전화번호</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="01012345678"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>
                  숫자만 입력 (예: 01012345678)
                </Text>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                  style={styles.input}
                  value={studentPw}
                  onChangeText={setStudentPw}
                  placeholder="비밀번호 입력"
                  placeholderTextColor="#a1a1aa"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>이메일</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                  style={styles.input}
                  value={staffPw}
                  onChangeText={setStaffPw}
                  placeholder="비밀번호 입력"
                  placeholderTextColor="#a1a1aa"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fafafa' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#09090b',
    letterSpacing: -1,
  },
  logoSub: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBtnActive: {
    backgroundColor: '#09090b',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3f3f46',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#09090b',
    backgroundColor: '#fff',
  },
  inputHint: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: -2,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
  },
  loginBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: {
    backgroundColor: '#d4d4d8',
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
})
