import type { Page } from '@playwright/test'

export async function loginAsStaff(page: Page) {
  const email = process.env.E2E_STAFF_EMAIL ?? 'teacher@teamdj.com'
  const password = process.env.E2E_STAFF_PASSWORD ?? 'changeme'

  await page.goto('/login')
  await page.getByRole('button', { name: '선생님 · 조교' }).click()
  await page.getByLabel(/이메일 주소/i).fill(email)
  await page.getByLabel(/비밀번호/i).fill(password)
  await page.getByRole('button', { name: '로그인' }).click()
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 10_000 })
}
