import { orderContent } from '../content/orderContent'
import type { Lesson } from './types'

// Lessons are authored as Markdown under `content/lessons/<level>/<order>-<id>.md`
// and compiled to plain data at build time by the `ace-content` Vite plugin, so
// nothing here parses Markdown at runtime. See docs/engineering/content-authoring-strategy.md.
const modules = import.meta.glob<Lesson>('/content/lessons/**/*.md', {
  eager: true,
  import: 'default',
})

export const lessons: Lesson[] = orderContent(modules)
