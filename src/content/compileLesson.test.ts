import { describe, expect, it } from 'vitest'
import { compileLesson } from './compileLesson'

const PATH = '/repo/content/lessons/beginner/010-b-grip.md'

function source(frontmatter: string, body = 'A paragraph of lesson prose.') {
  return `---\n${frontmatter}\n---\n\n${body}\n`
}

const VALID = `category: Fundamentals
title: The Grip
summary: How you hold the racquet shapes every shot.
tips:
  - Practice switching grips off the court.`

describe('compileLesson', () => {
  describe('identity derived from the file path', () => {
    it('derives the id from the filename, without the ordering prefix', () => {
      expect(compileLesson(source(VALID), PATH).id).toBe('b-grip')
    })

    it('derives the level from the containing directory', () => {
      const path = '/repo/content/lessons/advanced/020-a-tactics.md'
      expect(compileLesson(source(VALID), path).levelId).toBe('advanced')
    })

    it('rejects a directory that is not a known level', () => {
      const path = '/repo/content/lessons/expert/010-x.md'
      expect(() => compileLesson(source(VALID), path)).toThrow(/expert/)
    })

    it('rejects a filename without a numeric ordering prefix', () => {
      const path = '/repo/content/lessons/beginner/b-grip.md'
      expect(() => compileLesson(source(VALID), path)).toThrow(/ordering prefix/)
    })

    it('rejects an id whose level prefix disagrees with its directory', () => {
      const path = '/repo/content/lessons/beginner/010-i-topspin.md'
      expect(() => compileLesson(source(VALID), path)).toThrow(/should be named "b-topspin"/)
    })

    it('names the offending file in every error it throws', () => {
      const path = '/repo/content/lessons/beginner/010-b-grip.md'
      expect(() => compileLesson(source('title: Only a title'), path)).toThrow(/010-b-grip\.md/)
    })
  })

  describe('frontmatter', () => {
    it('carries the structured fields through', () => {
      const lesson = compileLesson(source(VALID), PATH)
      expect(lesson.category).toBe('Fundamentals')
      expect(lesson.title).toBe('The Grip')
      expect(lesson.summary).toBe('How you hold the racquet shapes every shot.')
      expect(lesson.tips).toEqual(['Practice switching grips off the court.'])
    })

    it('maps the `drills` list onto drillIds', () => {
      const lesson = compileLesson(source(`${VALID}\ndrills: [b-drill-grip-shadow]`), PATH)
      expect(lesson.drillIds).toEqual(['b-drill-grip-shadow'])
    })

    it('leaves drillIds undefined when no drills are listed', () => {
      expect(compileLesson(source(VALID), PATH).drillIds).toBeUndefined()
    })

    it('rejects a file with no frontmatter block at all', () => {
      expect(() => compileLesson('Just a body, no frontmatter.', PATH)).toThrow(/frontmatter/)
    })

    for (const field of ['category', 'title', 'summary']) {
      it(`rejects a missing ${field}`, () => {
        const without = VALID.split('\n')
          .filter((line) => !line.startsWith(`${field}:`))
          .join('\n')
        expect(() => compileLesson(source(without), PATH)).toThrow(new RegExp(field))
      })

      it(`rejects a blank ${field}`, () => {
        const blank = VALID.split('\n')
          .map((line) => (line.startsWith(`${field}:`) ? `${field}: "   "` : line))
          .join('\n')
        expect(() => compileLesson(source(blank), PATH)).toThrow(new RegExp(field))
      })
    }

    it('rejects a lesson with no tips', () => {
      expect(() => compileLesson(source('category: F\ntitle: T\nsummary: S\ntips: []'), PATH)).toThrow(
        /tips/,
      )
    })

    it('rejects a tip that is not a string', () => {
      const bad = 'category: F\ntitle: T\nsummary: S\ntips: [3]'
      expect(() => compileLesson(source(bad), PATH)).toThrow(/tips/)
    })

    it('rejects a drills entry that is not a string', () => {
      expect(() => compileLesson(source(`${VALID}\ndrills: [7]`), PATH)).toThrow(/drills/)
    })

    // A typo'd key would otherwise drop content silently: `tip:` instead of
    // `tips:` would compile to a lesson with no coaching tips at all.
    it('rejects an unknown frontmatter key', () => {
      expect(() => compileLesson(source(`${VALID}\ntipz: [oops]`), PATH)).toThrow(/tipz/)
    })
  })

  describe('body', () => {
    it('renders paragraphs as html', () => {
      const lesson = compileLesson(source(VALID, 'First para.\n\nSecond para.'), PATH)
      expect(lesson.html).toContain('<p>First para.</p>')
      expect(lesson.html).toContain('<p>Second para.</p>')
    })

    it('renders the markdown the TypeScript content model could not express', () => {
      const body = '## A heading\n\n1. step one\n2. step two\n\nSome **bold** text.'
      const { html } = compileLesson(source(VALID, body), PATH)
      expect(html).toContain('<h2>A heading</h2>')
      expect(html).toContain('<ol>')
      expect(html).toContain('<strong>bold</strong>')
    })

    // Content is authored with semantic line breaks: one sentence per source
    // line, so a typo fix diffs as one line rather than a rewritten paragraph.
    // That only works while a single newline stays a soft break — turning on
    // markdown-it's `breaks` option would put a <br> after every sentence in
    // the curriculum and reflow every lesson on the site.
    it('joins semantic line breaks into one paragraph rather than breaking the line', () => {
      const body = 'One sentence.\nA second sentence.\n\nA new paragraph.'
      const { html } = compileLesson(source(VALID, body), PATH)
      expect(html).not.toContain('<br>')
      expect(html).toContain('<p>One sentence.\nA second sentence.</p>')
      expect(html).toContain('<p>A new paragraph.</p>')
    })

    it('escapes raw html in the source rather than passing it through', () => {
      const { html } = compileLesson(source(VALID, 'Beware <script>alert(1)</script>'), PATH)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('rejects an empty body', () => {
      expect(() => compileLesson(source(VALID, '   '), PATH)).toThrow(/body/)
    })
  })
})
