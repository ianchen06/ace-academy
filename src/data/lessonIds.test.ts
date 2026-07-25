import { describe, expect, it } from 'vitest'
import { lessons } from './curriculum'

/**
 * Lesson ids are a public contract, not an implementation detail.
 *
 * They are persisted in `localStorage` under `tennis-coach-progress` and in the
 * Supabase `progress` row, so a completed lesson is remembered *by id*. Ids are
 * now derived from filenames, which means renaming `content/lessons/beginner/
 * 010-b-grip.md` would silently wipe that lesson's completion for every existing
 * user — a data-loss bug that no other test would notice.
 *
 * This snapshot turns that into a visible diff a reviewer has to accept on
 * purpose. If it fails, do not just re-record it: either restore the filename,
 * or decide deliberately that the progress loss is acceptable.
 */
describe('lesson ids', () => {
  it('matches the recorded set of ids that user progress is keyed on', async () => {
    const ids = lessons.map((lesson) => `${lesson.levelId}/${lesson.id}`)
    await expect(`${JSON.stringify(ids, null, 2)}\n`).toMatchFileSnapshot(
      './__snapshots__/lesson-ids.json',
    )
  })
})
