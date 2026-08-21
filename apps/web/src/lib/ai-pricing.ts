// Gemini 유료 티어 단가 — 원화로 직접 저장한다 (USD_TO_KRW=1400 환산, 구글 공식 단가는 USD로
// 공표되므로 각 항목 옆 주석에 원본 USD를 남겨 나중에 단가가 바뀌면 대조하기 쉽게 한다).
// thinking 토큰은 출력 단가로 과금된다.
// 이미지 출력은 실제로는 장당 정가(예: gemini-3-pro-image 1K/2K ₩188/장)지만 ai_usage_logs에는
// 텍스트·이미지 토큰이 합산되어 저장되므로, 출력 단가로 근사한다 — 모니터링 참고용 추정치.
type ModelPricing = { inputPerM: number; outputPerM: number }

const PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-flash': { inputPerM: 420, outputPerM: 3_500 }, // $0.3 / $2.5
  'gemini-2.5-flash-image': { inputPerM: 420, outputPerM: 3_500 }, // $0.3 / $2.5
  'gemini-3-pro-image': { inputPerM: 2_800, outputPerM: 16_800 }, // $2.0 / $12.0
  // $2.0 / $12.0 (프롬프트 <=200k 토큰 기준 — 우리 프롬프트는 항상 훨씬 작아 >200k 단가($4/$18)는 해당 없음)
  'gemini-3.1-pro-preview': { inputPerM: 2_800, outputPerM: 16_800 },
}
const DEFAULT_PRICING = PRICING['gemini-2.5-flash']

export function estimateCostKrw(
  promptTokens: number,
  thoughtsTokens: number,
  outputTokens: number,
  model?: string | null,
): number {
  const pricing = (model && PRICING[model]) || DEFAULT_PRICING
  return (
    (promptTokens / 1_000_000) * pricing.inputPerM +
    ((thoughtsTokens + outputTokens) / 1_000_000) * pricing.outputPerM
  )
}
