import { SolapiMessageService } from 'solapi'
import { logger } from '@/lib/logger'

// 카카오 친구톡(브랜드메시지) 발송 — Solapi 연동. 사업자번호로 카카오 채널을 개설하고
// Solapi에 연동해 pfId를 발급받은 뒤, 아래 4개 환경변수만 채우면 바로 동작한다:
// SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_PF_ID, SOLAPI_SENDER_PHONE
// (SOLAPI_SENDER_PHONE은 Solapi 콘솔에 사전 등록해둔 발신번호). 이 함수는 reports.ts의
// 이미지 발송(sendKakaoReport)과 여기(텍스트 전용 발송)에서 공유한다.
export function getSolapiConfig() {
  const apiKey = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const pfId = process.env.SOLAPI_PF_ID
  const senderPhone = process.env.SOLAPI_SENDER_PHONE
  if (!apiKey || !apiSecret || !pfId || !senderPhone) return null
  // .env.local에 "여기에발신번호" 같은 자리표시자만 채워둔 상태(값은 비어있지 않음)로 실제
  // 발송을 시도하면 Solapi SDK가 전화번호 형식 검증에서 거대한 스키마 덤프 에러를 던진다 —
  // 숫자가 하나도 없으면 아직 실연결 전으로 보고 미설정과 동일하게 취급해 API 호출 자체를 막는다.
  if (!/\d/.test(senderPhone)) return null
  return { apiKey, apiSecret, pfId, senderPhone }
}

// 이미지 없이 텍스트만 보내는 친구톡(BMS_FREE, chatBubbleType=TEXT) — 밀린 과제 알림,
// QnA 새 질문/답변완료, 공지사항·쪽지 등 텍스트로 충분한 모든 발송에 공용으로 쓴다.
// 설정이 아직 없으면(사업자번호 미연결) 조용히 스킵 — 호출부가 별도 에러 처리를 안 해도 됨.
export async function sendKakaoText(
  phones: (string | null | undefined)[],
  text: string,
  logContext: string,
): Promise<{ sentCount: number; errors: string[] }> {
  const config = getSolapiConfig()
  if (!config) return { sentCount: 0, errors: [] }

  // 킬스위치 — SOLAPI_*를 실제 값으로 채워도(테스트 목적) 이 플래그를 'true'로 명시하기 전까지는
  // 절대 실제 발송을 안 한다. 질문 등록/공지/쪽지 등 거의 모든 액션에 카카오 발송이 걸려있어서,
  // 자격증명만 넣고 테스트하다가 실수로 실제 문자가 나가는 사고를 막기 위함.
  if (process.env.KAKAO_AUTO_SEND !== 'true') {
    logger.info('sendKakaoText:disabled', { action: logContext })
    return { sentCount: 0, errors: [] }
  }

  const cleanPhones = [...new Set(phones.map((p) => p?.replace(/\D/g, '') ?? '').filter(Boolean))]
  if (cleanPhones.length === 0) return { sentCount: 0, errors: [] }

  const messageService = new SolapiMessageService(config.apiKey, config.apiSecret)

  const results = await Promise.allSettled(
    cleanPhones.map((phone) =>
      messageService.send({
        to: phone,
        from: config.senderPhone,
        text,
        type: 'BMS_FREE' as const,
        kakaoOptions: {
          pfId: config.pfId,
          // TEXT 버블은 본문을 bms.content에 넣어야 한다 (top-level text만으로는 Solapi SDK가
          // "TEXT 타입에 content 없음" 스키마 검증 에러를 던짐 — 그 에러 객체가 거대한 타입 덤프라
          // 그대로 노출하면 화면이 깨짐, 아래 catch에서도 메시지 길이를 잘라 방어)
          bms: { targeting: 'I' as const, chatBubbleType: 'TEXT' as const, content: text },
        },
      }),
    ),
  )

  let sentCount = 0
  const errors: string[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') sentCount++
    else {
      // Solapi SDK는 요청이 스키마 검증에 걸리면 전체 타입 정의를 그대로 토해내는 에러를 던질 때가
      // 있다 — 그대로 화면(ActionResult.error)까지 흘려보내면 안 되므로 짧게 잘라 방어한다.
      const raw = result.reason instanceof Error ? result.reason.message : '발송 실패'
      errors.push(raw.length > 200 ? '카카오 발송 요청이 유효하지 않습니다.' : raw)
    }
  }
  if (errors.length > 0) {
    logger.warn('sendKakaoText:partial-failure', { action: logContext, error: errors.join('; ') })
  }
  return { sentCount, errors }
}
