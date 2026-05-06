import { test, expect } from '@playwright/test'

// 환경변수에서 스태프 자격증명을 읽음 (.env.test.local 또는 CI secrets)
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? 'teacher@teamdj.com'
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? 'changeme'

test.describe('인증 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login')
    // 스태프 탭 선택
    await page.getByRole('button', { name: '선생님 · 조교' }).click()
  })

  test('선생님 로그인 성공 → /admin/dashboard 리다이렉트', async ({ page }) => {
    await page.getByLabel(/이메일 주소/i).fill(STAFF_EMAIL)
    await page.getByLabel(/비밀번호/i).fill(STAFF_PASSWORD)
    await page.getByRole('button', { name: '로그인' }).click()

    // 로그인 후 대시보드로 이동
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10_000 })
  })

  test('잘못된 비밀번호 → 에러 메시지 표시', async ({ page }) => {
    await page.getByLabel(/이메일 주소/i).fill(STAFF_EMAIL)
    await page.getByLabel(/비밀번호/i).fill('wrong-password-12345')
    await page.getByRole('button', { name: '로그인' }).click()

    // 에러 메시지가 나타남 (URL 변경 없이)
    await expect(page.locator('p.text-red-600, [class*="red"]')).toBeVisible({ timeout: 8_000 })
    await expect(page).not.toHaveURL(/\/admin/)
  })

  test('로그인 안 된 상태로 /admin 접근 → /login 리다이렉트', async ({ page }) => {
    // 새 컨텍스트에서 쿠키 없이 직접 접근
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('로그인 안 된 상태로 /admin/classes 접근 → /login 리다이렉트', async ({ page }) => {
    await page.goto('/admin/classes')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })
})
