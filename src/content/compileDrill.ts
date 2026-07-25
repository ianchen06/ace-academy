import { failFor, frontmatter, identityFromPath, render, requireText } from './compile'
import type { Drill } from '../data/types'

const KNOWN_KEYS = ['skill', 'title', 'duration', 'equipment', 'goal'] as const

/** Compiles one authored Markdown drill into the `Drill` the app consumes. */
export function compileDrill(source: string, filePath: string): Drill {
  const fail = failFor(filePath)
  const { id, levelId } = identityFromPath(filePath, fail)
  const { data, body } = frontmatter(source, KNOWN_KEYS, fail)

  const html = render(body)
  // A drill is a numbered routine you run on court, not an essay about one.
  // This is the invariant the old `instructions: string[]` carried implicitly.
  if (!html.includes('<ol>')) {
    fail('has no numbered steps — a drill body needs an ordered list of instructions')
  }

  return {
    id,
    levelId,
    skill: requireText(data, 'skill', fail),
    title: requireText(data, 'title', fail),
    duration: requireText(data, 'duration', fail),
    equipment: requireText(data, 'equipment', fail),
    goal: requireText(data, 'goal', fail),
    html,
  }
}
