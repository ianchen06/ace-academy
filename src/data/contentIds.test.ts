import { describe, expect, it } from 'vitest'
import { lessons } from './curriculum'
import { drills } from './drills'

/**
 * Content ids are a public contract, not an implementation detail.
 *
 * They are persisted in `localStorage` under `tennis-coach-progress` and in the
 * Supabase `progress` row — `completedLessons`, `completedDrills` and the
 * `quizAttempts` keys are all ids. Ids are now derived from filenames, which
 * means renaming `content/lessons/beginner/010-b-grip.md` would silently wipe
 * that lesson's completion for every existing user: data loss no other test
 * would notice.
 *
 * This snapshot turns that into a visible diff a reviewer has to accept on
 * purpose. If it fails, do not just re-record it: either restore the filename,
 * or decide deliberately that the progress loss is acceptable.
 */
describe('content ids', () => {
  it('matches the recorded ids that user progress is keyed on', async () => {
    const ids = {
      lessons: lessons.map((lesson) => `${lesson.levelId}/${lesson.id}`),
      drills: drills.map((drill) => `${drill.levelId}/${drill.id}`),
    }
    await expect(`${JSON.stringify(ids, null, 2)}\n`).toMatchFileSnapshot(
      './__snapshots__/content-ids.json',
    )
  })
})
