import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * Answer every question with its first option, confirming each selection lands
 * before moving on — clicking straight through races the re-render and
 * occasionally drops an answer, leaving submit permanently disabled.
 */
async function answerEveryQuestion(page: Page): Promise<number> {
  const questions = page.locator('.quiz-question')
  // `count()` does not auto-wait, so it reads 0 if the quiz page has not
  // rendered yet. Wait for the first question before counting.
  await expect(questions.first()).toBeVisible()
  const count = await questions.count()

  for (let i = 0; i < count; i++) {
    const option = questions.nth(i).locator('.quiz-option').first()
    await option.click()
    await expect(option).toHaveClass(/selected/)
  }
  return count
}

test.describe('browsing the curriculum', () => {
  test('a visitor can go from the dashboard to a lesson and back', async ({ page }) => {
    await page.goto('#/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn tennis')

    await page.getByRole('link', { name: /Beginner/ }).first().click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beginner Curriculum')

    await page.locator('.lesson-list-item').first().click()
    await expect(page.locator('.breadcrumb')).toBeVisible()

    await page.getByRole('link', { name: 'Curriculum' }).first().click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Curriculum')
  })

  test('the main nav reaches every section', async ({ page }) => {
    await page.goto('#/')

    await page.getByRole('link', { name: 'Drills', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Drills')

    await page.getByRole('link', { name: 'Quizzes', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quizzes')

    await page.getByRole('link', { name: 'Curriculum', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Curriculum')
  })

  test('an unknown URL shows the 404 page', async ({ page }) => {
    await page.goto('#/no-such-page')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('404')

    await page.getByRole('link', { name: 'Back to Dashboard' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn tennis')
  })
})

test.describe('completing lessons', () => {
  test('marking a lesson complete moves the level progress bar', async ({ page }) => {
    await page.goto('#/curriculum/beginner')
    const progress = page.getByRole('progressbar', { name: 'Level progress' })
    await expect(progress).toHaveAttribute('aria-valuenow', '0')

    await page.locator('.lesson-list-item').first().click()
    await page.getByRole('button', { name: 'Mark as complete' }).click()
    await expect(page.getByRole('button', { name: /Marked complete/ })).toBeVisible()

    await page.goBack()
    await expect(progress).not.toHaveAttribute('aria-valuenow', '0')
  })

  test('progress survives a reload', async ({ page }) => {
    await page.goto('#/curriculum/beginner')
    await page.locator('.lesson-list-item').first().click()
    await page.getByRole('button', { name: 'Mark as complete' }).click()

    await page.reload()
    await expect(page.getByRole('button', { name: /Marked complete/ })).toBeVisible()
  })

  test('a completed lesson is ticked in the level list', async ({ page }) => {
    await page.goto('#/curriculum/beginner')
    await expect(page.locator('.check-dot.done')).toHaveCount(0)

    await page.locator('.lesson-list-item').first().click()
    await page.getByRole('button', { name: 'Mark as complete' }).click()
    await page.goBack()

    await expect(page.locator('.check-dot.done')).toHaveCount(1)
  })

  test('a completion can be undone', async ({ page }) => {
    await page.goto('#/curriculum/beginner')
    await page.locator('.lesson-list-item').first().click()

    await page.getByRole('button', { name: 'Mark as complete' }).click()
    await page.getByRole('button', { name: /Marked complete/ }).click()
    await expect(page.getByRole('button', { name: 'Mark as complete' })).toBeVisible()
  })
})

test.describe('drills', () => {
  test('filters narrow the visible drills', async ({ page }) => {
    await page.goto('#/drills')
    const cards = page.locator('.drill-card')
    await expect(cards.first()).toBeVisible()
    const total = await cards.count()

    await page.locator('.filter-group', { hasText: 'Level' }).getByRole('button', { name: 'Beginner' }).click()
    const filtered = await cards.count()
    expect(filtered).toBeLessThan(total)
    expect(filtered).toBeGreaterThan(0)
  })

  test('a drill can be marked complete and stays complete after reload', async ({ page }) => {
    await page.goto('#/drills')
    const first = page.locator('.drill-card').first()

    await first.getByRole('button', { name: 'Mark complete' }).click()
    await expect(first).toHaveClass(/complete/)

    await page.reload()
    await expect(page.locator('.drill-card').first()).toHaveClass(/complete/)
  })
})

test.describe('quizzes', () => {
  test('a perfect run scores full marks and is remembered', async ({ page }) => {
    await page.goto('#/quizzes')
    await page.locator('.quiz-card').first().click()

    await expect(page.getByRole('button', { name: /Answer all/ })).toBeDisabled()

    // Read the real score off the result banner rather than assuming which
    // options are correct.
    const count = await answerEveryQuestion(page)

    await page.getByRole('button', { name: 'Submit answers' }).click()
    await expect(page.locator('.quiz-result-banner')).toContainText(`/ ${count}`)

    // Correct answers and explanations are revealed.
    await expect(page.locator('.quiz-option.correct')).toHaveCount(count)
    await expect(page.locator('.quiz-explanation')).toHaveCount(count)
  })

  test('the best score appears on the quiz list afterwards', async ({ page }) => {
    await page.goto('#/quizzes')
    await page.locator('.quiz-card').first().click()

    await answerEveryQuestion(page)
    await page.getByRole('button', { name: 'Submit answers' }).click()
    await expect(page.locator('.quiz-result-banner')).toBeVisible()

    await page.getByRole('link', { name: 'Quizzes', exact: true }).first().click()
    await expect(page.locator('.quiz-card').first().locator('.quiz-best-score')).toBeVisible()
  })

  test('retaking a quiz clears the previous answers', async ({ page }) => {
    await page.goto('#/quizzes')
    await page.locator('.quiz-card').first().click()

    await answerEveryQuestion(page)
    await page.getByRole('button', { name: 'Submit answers' }).click()
    await page.getByRole('button', { name: 'Retake quiz' }).click()

    await expect(page.locator('.quiz-option.selected')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Answer all/ })).toBeDisabled()
  })
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the menu opens, navigates, and closes itself', async ({ page }) => {
    await page.goto('#/')
    const links = page.locator('.nav-links')
    await expect(links).not.toHaveClass(/open/)

    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(links).toHaveClass(/open/)

    await page.getByRole('link', { name: 'Drills', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Drills')
    await expect(links).not.toHaveClass(/open/)
  })

  test('primary tap targets meet the 44px minimum', async ({ page }) => {
    await page.goto('#/drills')
    const button = page.locator('.drill-card').first().getByRole('button')
    const box = await button.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})
