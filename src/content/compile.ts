import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { levels } from '../data/levels'
import type { LevelId } from '../data/types'

// Content is authored in the repo and compiled at build time, but `html: true`
// would still let a stray tag in a file become live markup — and would become a
// real hazard the moment a CMS lets content arrive from outside a reviewed PR.
const md = new MarkdownIt({ html: false, linkify: true, typographer: false })

const FILENAME = /^(\d+)-(.+)\.md$/

/** Reports a problem the way an author needs to read it: file first, then why. */
export type Fail = (message: string) => never

export function failFor(filePath: string): Fail {
  return (message) => {
    throw new Error(`${filePath}: ${message}`)
  }
}

/**
 * Identity comes from the path, never the frontmatter, so an id cannot drift
 * from the file that defines it. Ids are persisted in user progress, which is
 * why `src/data/contentIds.test.ts` snapshots them.
 */
export function identityFromPath(filePath: string, fail: Fail): { id: string; levelId: LevelId } {
  const segments = filePath.split('/')
  const filename = segments[segments.length - 1] ?? ''
  const directory = segments[segments.length - 2] ?? ''

  const levelId = levels.find((level) => level.id === directory)?.id
  if (!levelId) {
    fail(`lives in "${directory}/", which is not a known level directory`)
  }

  const match = FILENAME.exec(filename)
  if (!match) {
    fail('is missing a numeric ordering prefix — name content files "<order>-<id>.md"')
  }

  return { id: match![2]!, levelId: levelId as LevelId }
}

/**
 * Splits frontmatter from body and rejects any key we do not recognise. A
 * typo'd key would otherwise drop content silently — `tip:` instead of `tips:`
 * would publish a lesson with no coaching tips at all.
 */
export function frontmatter(
  source: string,
  knownKeys: readonly string[],
  fail: Fail,
): { data: Record<string, unknown>; body: string } {
  const { data, content } = matter(source)

  if (Object.keys(data).length === 0) {
    fail(`has no frontmatter — expected: ${knownKeys.join(', ')}`)
  }
  for (const key of Object.keys(data)) {
    if (!knownKeys.includes(key)) {
      fail(`has an unknown frontmatter key "${key}" (expected one of: ${knownKeys.join(', ')})`)
    }
  }
  if (content.trim() === '') {
    fail('has an empty body — the content goes below the frontmatter')
  }

  return { data, body: content.trim() }
}

export function requireText(data: Record<string, unknown>, key: string, fail: Fail): string {
  const value = data[key]
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`is missing a non-empty "${key}"`)
  }
  return (value as string).trim()
}

export function requireStrings(
  data: Record<string, unknown>,
  key: string,
  fail: Fail,
): string[] {
  const value = data[key]
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    fail(`needs "${key}" to be a non-empty list of non-empty strings`)
  }
  return (value as string[]).map((item) => item.trim())
}

export function render(body: string): string {
  return md.render(body)
}
