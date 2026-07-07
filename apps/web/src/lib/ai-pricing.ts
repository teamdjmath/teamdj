// Gemini 2.5 Flash 유료 티어 단가 (2025-06 개정 기준, USD / 1M 토큰)
// thinking 토큰은 출력 단가로 과금된다. 단가가 바뀌면 여기만 수정.
export const GEMINI_FLASH_INPUT_USD_PER_M = 0.3
export const GEMINI_FLASH_OUTPUT_USD_PER_M = 2.5
export const USD_TO_KRW = 1400

export function estimateCostKrw(promptTokens: number, thoughtsTokens: number, outputTokens: number): number {
  const usd =
    (promptTokens / 1_000_000) * GEMINI_FLASH_INPUT_USD_PER_M +
    ((thoughtsTokens + outputTokens) / 1_000_000) * GEMINI_FLASH_OUTPUT_USD_PER_M
  return usd * USD_TO_KRW
}
