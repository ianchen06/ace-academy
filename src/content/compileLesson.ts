import {
  failFor,
  frontmatter,
  identityFromPath,
  render,
  requireStrings,
  requireText,
} from './compile'
import type { Lesson } from '../data/types'

const KNOWN_KEYS = ['category', 'title', 'summary', 'tips', 'drills'] as const

/** Compiles one authored Markdown lesson into the `Lesson` the app consumes. */
export function compileLesson(source: string, filePath: string): Lesson {
  const fail = failFor(filePath)
  const { id, levelId } = identityFromPath(filePath, fail)
  const { data, body } = frontmatter(source, KNOWN_KEYS, fail)

  const drills = data.drills === undefined ? undefined : requireStrings(data, 'drills', fail)

  return {
    id,
    levelId,
    category: requireText(data, 'category', fail),
    title: requireText(data, 'title', fail),
    summary: requireText(data, 'summary', fail),
    html: render(body),
    tips: requireStrings(data, 'tips', fail),
    ...(drills ? { drillIds: drills } : {}),
  }
}
