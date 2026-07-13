import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { extractTokens, similarityScore } from '@/lib/data/qna-related'

describe('extractTokens', () => {
  it('상투어·숫자만인 토큰을 제거하고 의미 토큰만 남긴다', () => {
    const tokens = extractTokens('이차함수 최댓값 문제 질문입니다 30')
    expect(tokens).toContain('이차함수')
    expect(tokens).toContain('최댓값')
    expect(tokens).not.toContain('문제')
    expect(tokens).not.toContain('질문입니다')
    expect(tokens).not.toContain('30')
  })

  it('중복 토큰은 한 번만 센다', () => {
    const tokens = extractTokens('극한 극한 극한')
    expect(tokens).toEqual(['극한'])
  })
})

describe('similarityScore', () => {
  it('같은 주제의 질문(조사 변형 포함)을 유사로 판단한다', () => {
    const q1 = '이차함수 최댓값 문제 질문이요 구간 [0, 3]에서 이차함수의 최댓값과 최솟값을 구할 때 꼭짓점이 구간 안에 있으면 어떻게 판단하나요'
    const q2 = '이차함수 구간에서 최댓값 구하는 법 이차함수가 주어진 구간에서 최댓값을 가질 때 꼭짓점 위치에 따라 경우를 나누는 게 헷갈립니다'
    expect(similarityScore(q1, q2).isSimilar).toBe(true)
  })

  it('주제가 다른 질문은 유사로 판단하지 않는다', () => {
    const q1 = '이차함수 최댓값 문제 질문이요 구간에서 최댓값과 최솟값을 구하는 방법이 궁금합니다'
    const q2 = '수열의 극한 수렴 조건 등비수열이 수렴할 공비의 범위가 왜 그렇게 되는지 모르겠습니다'
    expect(similarityScore(q1, q2).isSimilar).toBe(false)
  })

  it('상투어만 겹치는 질문은 유사로 판단하지 않는다', () => {
    const q1 = '질문입니다 문제 풀이 설명 부탁드립니다 확률과 통계 조합'
    const q2 = '질문입니다 문제 풀이 설명 부탁드립니다 미분계수의 정의'
    expect(similarityScore(q1, q2).isSimilar).toBe(false)
  })

  it('짧은 글이라도 핵심 용어가 대부분 겹치면 유사로 판단한다', () => {
    const q1 = '접선의 방정식 구하기'
    const q2 = '접선의 방정식 문제'
    expect(similarityScore(q1, q2).isSimilar).toBe(true)
  })

  it('내용이 거의 비어 있으면 유사 판단을 하지 않는다', () => {
    expect(similarityScore('질문', '이차함수 최댓값').isSimilar).toBe(false)
  })
})
