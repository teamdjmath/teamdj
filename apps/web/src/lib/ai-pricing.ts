// Gemini 유료 티어 단가 (USD / 1M 토큰). thinking 토큰은 출력 단가로 과금된다.
// 이미지 출력은 실제로는 장당 정가(예: gemini-3-pro-image 1K/2K $0.134/장)지만 ai_usage_logs에는
// 텍스트·이미지 토큰이 합산되어 저장되므로, 출력 단가로 근사한다 — 모니터링 참고용 추정치.
// 단가가 바뀌면 여기만 수정.
type ModelPricing = { inputPerM: number; outputPerM: number }

const PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-flash': { inputPerM: 0.3, outputPerM: 2.5 },
  'gemini-2.5-flash-image': { inputPerM: 0.3, outputPerM: 2.5 },
  'gemini-3-pro-image': { inputPerM: 2.0, outputPerM: 12.0 },
}
const DEFAULT_PRICING = PRICING['gemini-2.5-flash']

export const USD_TO_KRW = 1400

export function estimateCostKrw(
  promptTokens: number,
  thoughtsTokens: number,
  outputTokens: number,
  model?: string | null,
): number {
  const pricing = (model && PRICING[model]) || DEFAULT_PRICING
  const usd =
    (promptTokens / 1_000_000) * pricing.inputPerM +
    ((thoughtsTokens + outputTokens) / 1_000_000) * pricing.outputPerM
  return usd * USD_TO_KRW
}
