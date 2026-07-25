import type { Plugin } from 'vite'
import { compileLesson } from '../src/content/compileLesson'
import { compileDrill } from '../src/content/compileDrill'
import { compileQuiz } from '../src/content/compileQuiz'

const COLLECTIONS = [
  { dir: '/content/lessons/', compile: compileLesson },
  { dir: '/content/drills/', compile: compileDrill },
  { dir: '/content/quizzes/', compile: compileQuiz },
]

/**
 * Compiles authored Markdown under `content/` into plain data modules.
 *
 * The compile — and therefore the validation — happens here, on the node side:
 * a malformed lesson fails `vite dev`, `vite build` and `vitest` with the file
 * path and a reason, and no Markdown parser or validator reaches the browser
 * bundle. Because `vitest.config.ts` merges `vite.config.ts`, dev, build, unit
 * tests and the Playwright preview all run this identical pipeline with no
 * codegen step and no generated files to keep in sync.
 */
export function aceContent(): Plugin {
  return {
    name: 'ace-content',
    enforce: 'pre',
    transform(code, id) {
      const path = id.split('?')[0]!
      if (!path.endsWith('.md') && !path.endsWith('.yml')) return null
      const collection = COLLECTIONS.find(({ dir }) => path.includes(dir))
      if (!collection) return null
      return { code: `export default ${JSON.stringify(collection.compile(code, path))}`, map: null }
    },
  }
}
