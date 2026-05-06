import { test, expect } from '@playwright/test'
import { loginAsStaff } from './helpers/login'

test.describe('분반 관리', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/admin/classes')
  })

  test('분반 생성 → 목록에 표시', async ({ page }) => {
    const uniqueName = `E2E테스트반-${Date.now()}`

    // 분반 추가 버튼 클릭 (모달/섹션 열림)
    await page.getByRole('button', { name: /분반 추가|새 분반|추가/ }).first().click()

    // 필수 항목 입력
    await page.getByLabel(/분반명|이름/i).fill(uniqueName)
    await page.getByLabel(/과목/i).fill('수학')
    await page.getByLabel(/학년/i).fill('중1')

    // 저장
    await page.getByRole('button', { name: /저장|만들기|생성/ }).click()

    // 목록에서 새 분반 확인
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 8_000 })
  })

  test('분반 생성 시 필수 항목 누락 → 에러 표시', async ({ page }) => {
    await page.getByRole('button', { name: /분반 추가|새 분반|추가/ }).first().click()

    // 이름만 비우고 저장 시도
    await page.getByLabel(/과목/i).fill('영어')
    await page.getByLabel(/학년/i).fill('중2')
    // 분반명 비움 (기본값 없음)

    await page.getByRole('button', { name: /저장|만들기|생성/ }).click()

    // 에러 메시지 혹은 validation 확인
    // (브라우저 기본 required 또는 서버 검증 에러)
    const hasError =
      (await page.locator('text=필수').count()) > 0 ||
      (await page.locator('[class*="red"], [class*="error"]').count()) > 0

    expect(hasError).toBe(true)
  })
})
