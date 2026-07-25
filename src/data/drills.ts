import { orderContent } from '../content/orderContent'
import type { Drill } from './types'

// Drills are authored as Markdown under `content/drills/<level>/<order>-<id>.md`
// and compiled to plain data at build time by the `ace-content` Vite plugin, so
// nothing here parses Markdown at runtime. See docs/engineering/content-authoring-strategy.md.
const modules = import.meta.glob<Drill>('/content/drills/**/*.md', {
  eager: true,
  import: 'default',
})

export const drills: Drill[] = orderContent(modules)
