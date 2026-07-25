import { describe, expect, it } from 'vitest'
import { lessons } from './curriculum'
import { legacyLessons } from './curriculumLegacy'

/**
 * TEMPORARY — the gate on the Markdown migration.
 *
 * A 32-file mechanical migration is only trustworthy if something proves no text
 * was lost, reordered or mangled on the way out of the TypeScript literals. This
 * compares the compiled Markdown against the previous in-memory curriculum,
 * field by field and paragraph by paragraph.
 *
 * Delete this file and `curriculumLegacy.ts` together once the migration is reviewed.
 */
describe('markdown migration', () => {
  it('produces the same number of lessons', () => {
    expect(lessons.length).toBe(legacyLessons.length)
  })

  it('preserves lesson order exactly', () => {
    expect(lessons.map((l) => l.id)).toEqual(legacyLessons.map((l) => l.id))
  })

  it('preserves every structured field', () => {
    for (const [index, lesson] of lessons.entries()) {
      const legacy = legacyLessons[index]!
      expect(lesson.id, `lesson ${index}`).toBe(legacy.id)
      expect(lesson.levelId, legacy.id).toBe(legacy.levelId)
      expect(lesson.category, legacy.id).toBe(legacy.category)
      expect(lesson.title, legacy.id).toBe(legacy.title)
      expect(lesson.summary, legacy.id).toBe(legacy.summary)
      expect(lesson.tips, legacy.id).toEqual(legacy.tips)
      expect(lesson.drillIds, legacy.id).toEqual(legacy.drillIds)
    }
  })

  // Reading the rendered paragraphs back out of the DOM — rather than comparing
  // HTML strings — means entity escaping (&, <, ") is normalised away and only
  // the words a reader actually sees are compared.
  it('preserves every paragraph of prose, in order', () => {
    for (const lesson of lessons) {
      const legacy = legacyLessons.find((l) => l.id === lesson.id)!
      const host = document.createElement('div')
      host.innerHTML = lesson.html
      const rendered = [...host.querySelectorAll('p')].map((p) => p.textContent)
      expect(rendered, `lesson ${lesson.id}`).toEqual(legacy.content)
    }
  })
})
