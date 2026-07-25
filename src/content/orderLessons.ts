import { levels } from '../data/levels'
import type { Lesson } from '../data/types'

const levelRank = new Map(levels.map((level, index) => [level.id, index]))

/**
 * Puts globbed lesson modules into curriculum order.
 *
 * Order used to be array position in `curriculum.ts`; it is now the numeric
 * filename prefix within a level directory, and the position of that level in
 * `levels`. `LessonDetail` derives prev/next from this sequence, so a duplicate
 * prefix — two lessons claiming the same slot — is a build failure, not a
 * silently arbitrary ordering.
 */
export function orderLessons(modules: Record<string, Lesson>): Lesson[] {
  const seen = new Set<string>()

  return Object.entries(modules)
    .map(([path, lesson]) => {
      const prefix = path.split('/').pop()!.split('-')[0]!
      const slot = `${lesson.levelId}/${prefix}`
      if (seen.has(slot)) {
        throw new Error(`Two ${lesson.levelId} lessons share the ordering prefix ${prefix} (${path})`)
      }
      seen.add(slot)
      return { path, lesson }
    })
    .sort((a, b) => {
      const byLevel = levelRank.get(a.lesson.levelId)! - levelRank.get(b.lesson.levelId)!
      return byLevel !== 0 ? byLevel : a.path.localeCompare(b.path)
    })
    .map(({ lesson }) => lesson)
}
