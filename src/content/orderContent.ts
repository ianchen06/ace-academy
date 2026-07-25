import { levels } from '../data/levels'
import type { LevelId } from '../data/types'

const levelRank = new Map(levels.map((level, index) => [level.id, index]))

/**
 * Puts globbed content modules into curriculum order.
 *
 * Order used to be array position in a TypeScript literal; it is now the numeric
 * filename prefix within a level directory, and the position of that level in
 * `levels`. `LessonDetail` derives prev/next from this sequence, so a duplicate
 * prefix — two files claiming the same slot — is a build failure, not a silently
 * arbitrary ordering.
 */
export function orderContent<T extends { levelId: LevelId }>(modules: Record<string, T>): T[] {
  const seen = new Set<string>()

  return Object.entries(modules)
    .map(([path, item]) => {
      const prefix = path.split('/').pop()!.split('-')[0]!
      const dir = path.slice(0, path.lastIndexOf('/'))
      const slot = `${dir}/${prefix}`
      if (seen.has(slot)) {
        throw new Error(`Two files in ${dir} share the ordering prefix ${prefix} (${path})`)
      }
      seen.add(slot)
      return { path, item }
    })
    .sort((a, b) => {
      const byLevel = levelRank.get(a.item.levelId)! - levelRank.get(b.item.levelId)!
      return byLevel !== 0 ? byLevel : a.path.localeCompare(b.path)
    })
    .map(({ item }) => item)
}
