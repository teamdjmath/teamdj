import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

const LS_NOTIFICATIONS = 'teamdj_notifications'
const LS_MARKETING = 'teamdj_marketing'

const FAQ_ITEMS = [
  {
    q: '출결 처리는 어떻게 되나요?',
    a: '수업 시작 시간 기준으로 10분 이내 입실은 출석, 30분 이내는 지각, 그 이후는 결석으로 처리됩니다.',
  },
  {
    q: '과제 완료율은 어디서 입력하나요?',
    a: '과제 완료율은 담당 선생님이 직접 입력합니다. 완료 후 선생님께 확인을 요청해주세요.',
  },
  {
    q: '질문은 어떻게 등록하나요?',
    a: '현재 질문 등록은 선생님을 통해서만 가능합니다. 추후 학생 직접 등록 기능이 추가될 예정입니다.',
  },
  {
    q: '강의 영상은 언제까지 볼 수 있나요?',
    a: '강의 영상은 YouTube로 제공되며, 선생님이 삭제하기 전까지 언제든지 시청 가능합니다.',
  },
  {
    q: '성적은 어디서 확인하나요?',
    a: '하단 탭의 "리포트" 메뉴에서 최근 테스트 성적을 확인하실 수 있습니다.',
  },
]

export default function MoreScreen() {
  const { signOut } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null)
  const [faqOpen, setFaqOpen] = useState(false)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [inquiryText, setInquiryText] = useState('')
  const [inquiryDone, setInquiryDone] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(LS_NOTIFICATIONS),
      AsyncStorage.getItem(LS_MARKETING),
    ]).then(([n, m]) => {
      if (n !== null) setNotifications(n === 'true')
      if (m !== null) setMarketing(m === 'true')
    })
  }, [])

  function handleNotifications(v: boolean) {
    setNotifications(v)
    AsyncStorage.setItem(LS_NOTIFICATIONS, String(v))
  }

  function handleMarketing(v: boolean) {
    setMarketing(v)
    AsyncStorage.setItem(LS_MARKETING, String(v))
  }


  function handleInquirySubmit() {
    if (!inquiryText.trim()) return
    setInquiryDone(true)
    setInquiryText('')
    setTimeout(() => {
      setInquiryDone(false)
      setInquiryOpen(false)
    }, 2000)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 지원 메뉴 */}
        <View style={styles.card}>
          <MenuRow label="1:1 문의" onPress={() => setInquiryOpen(true)} />
          <MenuRow label="자주 묻는 질문" onPress={() => setFaqOpen(true)} />
          <MenuRow label="약관 및 이용동의" onPress={() => setTermsOpen(true)} last />
        </View>

        {/* 알림 설정 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>알림 설정</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleLabel}>알림 허용</Text>
              <Text style={styles.toggleSub}>수업, 과제, 공지 알림</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotifications}
              trackColor={{ false: '#e4e4e7', true: '#09090b' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#e4e4e7"
            />
          </View>
          <View style={[styles.toggleRow, styles.noBorder]}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleLabel}>마케팅 알림</Text>
              <Text style={styles.toggleSub}>이벤트 및 혜택 정보</Text>
            </View>
            <Switch
              value={marketing}
              onValueChange={handleMarketing}
              trackColor={{ false: '#e4e4e7', true: '#09090b' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#e4e4e7"
            />
          </View>
        </View>

        {/* 버전 정보 */}
        <View style={styles.card}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>앱 버전</Text>
            <Text style={styles.versionValue}>1.0.0</Text>
          </View>
        </View>

        {/* 로그아웃 */}
        {logoutConfirm ? (
          <View style={styles.logoutConfirmBox}>
            <Text style={styles.logoutConfirmText}>정말 로그아웃 하시겠습니까?</Text>
            <View style={styles.logoutConfirmRow}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setLogoutConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={() => { signOut(); router.replace('/login') }}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutConfirmBtnText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutConfirm(true)} activeOpacity={0.8}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* FAQ 모달 */}
      <Modal
        visible={faqOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFaqOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>자주 묻는 질문</Text>
            <TouchableOpacity onPress={() => setFaqOpen(false)}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {FAQ_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.faqItem, idx < FAQ_ITEMS.length - 1 && styles.faqBorder]}
                onPress={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                activeOpacity={0.7}
              >
                <View style={styles.faqQ}>
                  <Text style={styles.faqQText}>{item.q}</Text>
                  <Text style={styles.faqChevron}>{openFaqIdx === idx ? '∧' : '›'}</Text>
                </View>
                {openFaqIdx === idx && <Text style={styles.faqAText}>{item.a}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 1:1 문의 모달 */}
      <Modal
        visible={inquiryOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInquiryOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>1:1 문의</Text>
              <TouchableOpacity onPress={() => setInquiryOpen(false)}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {inquiryDone ? (
                <View style={styles.inquiryDone}>
                  <Text style={styles.inquiryDoneTitle}>문의가 접수되었습니다.</Text>
                  <Text style={styles.inquiryDoneSub}>영업일 기준 1~2일 내 답변드립니다.</Text>
                </View>
              ) : (
                <View style={styles.inquiryForm}>
                  <TextInput
                    style={styles.inquiryInput}
                    value={inquiryText}
                    onChangeText={setInquiryText}
                    placeholder="문의 내용을 입력해주세요."
                    placeholderTextColor="#a1a1aa"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.submitBtn, !inquiryText.trim() && styles.submitBtnDisabled]}
                    onPress={handleInquirySubmit}
                    disabled={!inquiryText.trim()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>문의 보내기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* 약관 모달 */}
      <Modal
        visible={termsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTermsOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>약관 및 이용동의</Text>
            <TouchableOpacity onPress={() => setTermsOpen(false)}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.termsText}>{TERMS_TEXT}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function MenuRow({
  label,
  onPress,
  last = false,
}: {
  label: string
  onPress: () => void
  last?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !last && styles.menuBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  )
}

const TERMS_TEXT = `제1조 (목적)
본 약관은 TeamDJ(이하 "서비스")를 이용함에 있어 회원과 서비스 제공자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (개인정보 수집 및 이용)
서비스는 원활한 운영을 위해 이름, 연락처, 학습 데이터 등 최소한의 정보를 수집합니다. 수집된 정보는 서비스 제공 목적 외에 사용되지 않습니다.

제3조 (서비스 이용)
회원은 본 서비스를 통해 강의 영상 시청, 과제 확인, 성적 조회 등의 기능을 이용할 수 있습니다. 서비스 내 콘텐츠는 저작권법에 의해 보호됩니다.

제4조 (면책 조항)
서비스는 천재지변, 시스템 장애 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.`

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },

  card: { backgroundColor: '#f8f8fa', borderRadius: 24, marginBottom: 4, overflow: 'hidden' },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: '#a1a1aa',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6,
  },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 20,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  menuLabel: { fontSize: 16, fontWeight: '500', color: '#09090b' },
  menuChevron: { fontSize: 22, color: '#d4d4d8' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#f1f1f4',
  },
  noBorder: { borderBottomWidth: 0 },
  toggleLeft: { gap: 2 },
  toggleLabel: { fontSize: 16, fontWeight: '500', color: '#09090b' },
  toggleSub: { fontSize: 12, color: '#a1a1aa' },

  versionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 20,
  },
  versionLabel: { fontSize: 16, fontWeight: '500', color: '#09090b' },
  versionValue: { fontSize: 15, color: '#a1a1aa', fontWeight: '400' },

  logoutBtn: {
    paddingVertical: 20, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1, borderColor: '#f8f8fa', marginTop: 8,
  },
  logoutText: { fontSize: 16, color: '#ef4444', fontWeight: '600' },

  logoutConfirmBox: {
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1, borderColor: '#fee2e2', marginTop: 8,
    padding: 20, gap: 14,
  },
  logoutConfirmText: { fontSize: 14, color: '#3f3f46', textAlign: 'center' },
  logoutConfirmRow:  { flexDirection: 'row', gap: 10 },
  logoutCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#f4f4f5',
  },
  logoutCancelText:      { fontSize: 14, fontWeight: '600', color: '#71717a' },
  logoutConfirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  logoutConfirmBtnText:  { fontSize: 14, fontWeight: '600', color: '#fff' },

  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f4f4f5',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#09090b' },
  modalClose: { fontSize: 14, color: '#a1a1aa' },
  modalBody: { padding: 20, gap: 0 },

  faqItem: { paddingVertical: 14, gap: 8 },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  faqQ: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqQText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#09090b' },
  faqChevron: { fontSize: 16, color: '#a1a1aa' },
  faqAText: { fontSize: 13, color: '#71717a', lineHeight: 20 },

  inquiryForm: { gap: 12 },
  inquiryInput: {
    minHeight: 140, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#09090b', backgroundColor: '#fafafa',
  },
  submitBtn: {
    backgroundColor: '#09090b', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#d4d4d8' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  inquiryDone: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  inquiryDoneTitle: { fontSize: 16, fontWeight: '600', color: '#09090b' },
  inquiryDoneSub: { fontSize: 13, color: '#a1a1aa' },

  termsText: { fontSize: 13, color: '#52525b', lineHeight: 22 },
})
