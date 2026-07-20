import { expect, test, TEST_EMAIL, TEST_PASSWORD, USER_ID } from './fixtures'

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('#/account')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
}

test.describe('accounts', () => {
  test('a visitor can sign in and see their email in the nav', async ({ page, supabase }) => {
    void supabase
    await signIn(page)

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
    await expect(page.locator('.account-page')).toContainText(TEST_EMAIL)
    await expect(page.locator('.nav-links').getByRole('link', { name: TEST_EMAIL })).toBeVisible()
  })

  test('bad credentials show an error and keep the form', async ({ page, supabase }) => {
    void supabase
    await page.goto('#/account')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign In', exact: true }).click()

    await expect(page.locator('.auth-error')).toContainText(/Invalid login credentials/i)
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test('signing up asks the user to confirm their email', async ({ page, supabase }) => {
    void supabase
    await page.goto('#/account')
    await page.getByRole('button', { name: /Don't have an account/ }).click()
    await page.getByLabel('Email').fill('new@example.com')
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click()

    await expect(page.locator('.auth-info')).toContainText(/Check your email to confirm/)
  })

  test('a signed-in user can sign out', async ({ page, supabase }) => {
    void supabase
    await signIn(page)
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.locator('.nav-links').getByRole('link', { name: 'Sign In' })).toBeVisible()
  })

  test('the session survives a reload', async ({ page, supabase }) => {
    void supabase
    await signIn(page)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })
})

test.describe('cross-device progress sync', () => {
  test('progress made elsewhere is pulled down on sign-in', async ({ page, supabase }) => {
    // A different device already completed this beginner lesson.
    supabase.seedRow(USER_ID, { completed_lessons: ['b-grip'] })

    await signIn(page)
    await page.goto('#/curriculum/beginner')
    await expect(page.locator('.check-dot.done')).toHaveCount(1)
  })

  test('a cloud row seeded for another user is not applied', async ({ page, supabase }) => {
    supabase.seedRow('someone-else', { completed_lessons: ['b-grip'] })

    await signIn(page)
    await page.goto('#/curriculum/beginner')
    await expect(page.locator('.check-dot.done')).toHaveCount(0)
  })

  test('local guest progress is merged up, not discarded', async ({ page, supabase }) => {
    await page.goto('#/curriculum/beginner')
    await page.locator('.lesson-list-item').first().click()
    await page.getByRole('button', { name: 'Mark as complete' }).click()

    const localLessonId = page.url().split('/').pop()!
    supabase.seedRow(USER_ID, { completed_lessons: ['b-scoring'] })

    await signIn(page)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

    await expect
      .poll(() => supabase.upserts.at(-1)?.completed_lessons ?? [])
      .toEqual(expect.arrayContaining([localLessonId, 'b-scoring']))
  })

  test('changes made while signed in are pushed to the backend', async ({ page, supabase }) => {
    supabase.seedRow(USER_ID, {})
    await signIn(page)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

    await page.goto('#/drills')
    await page.locator('.drill-card').first().getByRole('button', { name: 'Mark complete' }).click()

    await expect.poll(() => supabase.upserts.at(-1)?.completed_drills.length ?? 0).toBeGreaterThan(0)
  })

  test('the app stays usable when the backend read fails', async ({ page, supabase }) => {
    supabase.seedRow(USER_ID, {})
    supabase.failNextSelect()

    await signIn(page)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

    // Local progress still works even though the sync failed.
    await page.goto('#/drills')
    const first = page.locator('.drill-card').first()
    await first.getByRole('button', { name: 'Mark complete' }).click()
    await expect(first).toHaveClass(/complete/)

    // Regression: the unread cloud row must not be overwritten with local-only
    // state, or progress from another device would be destroyed.
    expect(supabase.upserts).toEqual([])
  })
})
