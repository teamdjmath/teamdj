import { GoogleGenAI } from '@google/genai'
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
try {
  const t0 = Date.now()
  const res = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: ['이차함수 y=x^2-6x+5의 최솟값을 구해줘'],
    config: { temperature: 0.3, maxOutputTokens: 65536, thinkingConfig: { thinkingBudget: -1 } },
  })
  console.log('OK, time:', Date.now() - t0, 'ms')
  console.log('text len:', res.text?.length)
  console.log('usage:', JSON.stringify(res.usageMetadata))
} catch (e) {
  console.log('ERROR:', String(e?.message).slice(0, 500))
}
