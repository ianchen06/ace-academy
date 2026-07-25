import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { levels } from '../data/levels'
import type { Lesson, LevelId } from '../data/types'

// Content is authored in the repo and compiled at build time, but `html: true`
// would still let a stray tag in a lesson become live markup — and would become
// a real hazard the moment a CMS lets content arrive from outside a reviewed PR.
const md = new MarkdownIt({ html: false, linkify: true, typographer: false })

const FILENAME = /^(\d+)-(.+)\.md$/
const KNOWN_KEYS = ['category', 'title', 'summary', 'tips', 'drills'] as const

/**
 * Compiles one authored Markdown lesson into the `Lesson` the app consumes.
 *
 * Identity is derived from the file path rather than the frontmatter, so an id
 * cannot drift from the file that defines it. Ids are persisted in user progress
 * (localStorage and the Supabase row), which is why `src/data/lessonIds.test.ts`
 * snapshots them: a rename has to be an explicit, reviewed change.
 */
export function compileLesson(source: string, filePath: string): Lesson {
  const fail = (message: string): never => {
    throw new Error(`${filePath}: ${message}`)
  }

  const segments = filePath.split('/')
  const filename = segments[segments.length - 1] ?? ''
  const directory = segments[segments.length - 2] ?? ''

  const levelId = levels.find((level) => level.id === directory)?.id
  if (!levelId) {
    fail(`lives in "${directory}/", which is not a known level directory`)
  }

  const match = FILENAME.exec(filename)
  if (!match) {
    fail('is missing a numeric ordering prefix — name lesson files "<order>-<id>.md"')
  }
  const id = match![2]!

  const { data, content } = matter(source)
  if (Object.keys(data).length === 0) {
    fail('has no frontmatter — a lesson needs category, title, summary and tips')
  }

  for (const key of Object.keys(data)) {
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      fail(`has an unknown frontmatter key "${key}" (expected one of: ${KNOWN_KEYS.join(', ')})`)
    }
  }

  const text = (key: 'category' | 'title' | 'summary'): string => {
    const value = data[key]
    if (typeof value !== 'string' || value.trim() === '') {
      fail(`is missing a non-empty "${key}"`)
    }
    return (value as string).trim()
  }

  const tips = data.tips
  if (!Array.isArray(tips) || tips.length === 0 || tips.some((t) => typeof t !== 'string' || t.trim() === '')) {
    fail('needs "tips" to be a non-empty list of non-empty strings')
  }

  const drills = data.drills
  if (drills !== undefined) {
    if (!Array.isArray(drills) || drills.some((d) => typeof d !== 'string' || d.trim() === '')) {
      fail('needs "drills" to be a list of drill ids')
    }
  }

  if (content.trim() === '') {
    fail('has an empty body — the lesson prose goes below the frontmatter')
  }

  return {
    id,
    levelId: levelId as LevelId,
    category: text('category'),
    title: text('title'),
    summary: text('summary'),
    html: md.render(content.trim()),
    tips: (tips as string[]).map((tip) => tip.trim()),
    ...(drills ? { drillIds: drills as string[] } : {}),
  }
}
