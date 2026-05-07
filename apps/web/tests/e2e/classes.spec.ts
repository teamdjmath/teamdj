import { test, expect } from '@playwright/test'
import { loginAsStaff } from './helpers/login'

test.describe('분반 관리', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/admin/classes')
  })

  test('분반 생성 → 목록에 표시', async ({ page }) => {
    const uniqueName = `E2E테스트반-${Date.now()}`

    // 분반 추가 버튼 클릭
    await page.getByRole('button', { name: /새 분반/ }).click()

    // 모달이 열릴 때까지 대기
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })

    // name 속성으로 input 찾기 (InputField는 label/input이 htmlFor로 연결되지 않음)
    await dialog.locator('input[name="name"]').fill(uniqueName)
    await dialog.locator('input[name="subject"]').fill('수학')
    await dialog.locator('input[name="grade"]').fill('중1')

    // 생성 버튼 클릭
    await dialog.getByRole('button', { name: '생성' }).click()

    // 목록에서 새 분반 확인
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 8_000 })
  })

  test('분반 생성 시 필수 항목 누락 → 에러 표시', async ({ page }) => {
    await page.getByRole('button', { name: /새 분반/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })

    // 이름은 비우고 과목/학년만 입력
    await dialog.locator('input[name="subject"]').fill('영어')
    await dialog.locator('input[name="grade"]').fill('중2')

    // 제출 시도
    await dialog.getByRole('button', { name: '생성' }).click()

    // required 유효성 검사로 모달이 닫히지 않거나 에러 메시지가 표시됨
    const dialogStillOpen = await dialog.isVisible()
    const hasRedError = (await page.locator('[class*="red"]').count()) > 0
    expect(dialogStillOpen || hasRedError).toBe(true)
  })
})
