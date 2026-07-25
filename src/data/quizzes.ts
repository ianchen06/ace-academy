import { orderContent } from '../content/orderContent'
import type { Quiz } from './types'

// Quizzes are structured data, so they are authored as YAML under
// `content/quizzes/<level>/<order>-<id>.yml` and compiled at build time by the
// `ace-content` Vite plugin — which resolves each question's authored `answer`
// text to the `correctIndex` the UI uses, failing the build if it matches no
// option. See docs/engineering/content-authoring-strategy.md.
const modules = import.meta.glob<Quiz>('/content/quizzes/**/*.yml', {
  eager: true,
  import: 'default',
})

export const quizzes: Quiz[] = orderContent(modules)
