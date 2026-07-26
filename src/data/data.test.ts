import { describe, expect, it } from 'vitest'
import { levels, levelById } from './levels'
import { lessons } from './curriculum'
import { drills } from './drills'
import { quizzes } from './quizzes'
import type { LevelId } from './types'
import { internalLinks, renderedBlocks, renderedElements, renderedText } from '../test/compiledText'

const levelIds = levels.map((l) => l.id)
const FOOTWORK_CATEGORY = 'Footwork & Movement'
const GRIPS = ['Continental', 'Eastern', 'Semi-Western', 'Western']

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  return ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)))
}

describe('levels', () => {
  it('has unique ids', () => {
    expect(duplicates(levelIds)).toEqual([])
  })

  it('covers exactly the LevelId union', () => {
    const expected: LevelId[] = ['beginner', 'intermediate', 'advanced']
    expect([...levelIds].sort()).toEqual([...expected].sort())
  })

  it('gives every level a hex colour the UI can use for chips', () => {
    for (const level of levels) {
      expect(level.color, `${level.id} colour`).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  describe('levelById', () => {
    it('finds a known level', () => {
      expect(levelById('beginner')?.name).toBe('Beginner')
    })

    it('returns undefined for an unknown id', () => {
      expect(levelById('nope')).toBeUndefined()
    })
  })
})

describe('lessons', () => {
  it('has unique ids', () => {
    expect(duplicates(lessons.map((l) => l.id))).toEqual([])
  })

  it('only references known levels', () => {
    for (const lesson of lessons) {
      expect(levelIds, `lesson ${lesson.id}`).toContain(lesson.levelId)
    }
  })

  it('gives every level at least one lesson', () => {
    for (const id of levelIds) {
      expect(lessons.filter((l) => l.levelId === id).length, `level ${id}`).toBeGreaterThan(0)
    }
  })

  it('has non-empty title, summary and content everywhere', () => {
    for (const lesson of lessons) {
      expect(lesson.title.trim(), `lesson ${lesson.id} title`).not.toBe('')
      expect(lesson.summary.trim(), `lesson ${lesson.id} summary`).not.toBe('')
      expect(lesson.html.trim(), `lesson ${lesson.id} html`).not.toBe('')
      expect(lesson.html, `lesson ${lesson.id} html`).toContain('<p>')
      expect(lesson.tips.length, `lesson ${lesson.id} tips`).toBeGreaterThan(0)
    }
  })

  it('only links drillIds that actually exist', () => {
    const drillIds = new Set(drills.map((d) => d.id))
    for (const lesson of lessons) {
      for (const drillId of lesson.drillIds ?? []) {
        expect(drillIds, `lesson ${lesson.id} -> drill ${drillId}`).toContain(drillId)
      }
    }
  })

  it('only links drills from its own level', () => {
    const drillLevel = new Map(drills.map((d) => [d.id, d.levelId]))
    for (const lesson of lessons) {
      for (const drillId of lesson.drillIds ?? []) {
        expect(drillLevel.get(drillId), `lesson ${lesson.id} -> drill ${drillId}`).toBe(lesson.levelId)
      }
    }
  })
})

describe('drills', () => {
  it('has unique ids', () => {
    expect(duplicates(drills.map((d) => d.id))).toEqual([])
  })

  it('only references known levels', () => {
    for (const drill of drills) {
      expect(levelIds, `drill ${drill.id}`).toContain(drill.levelId)
    }
  })

  it('gives every level at least one drill', () => {
    for (const id of levelIds) {
      expect(drills.filter((d) => d.levelId === id).length, `level ${id}`).toBeGreaterThan(0)
    }
  })

  it('has instructions and populated metadata everywhere', () => {
    for (const drill of drills) {
      expect(renderedBlocks(drill.html).length, `drill ${drill.id} steps`).toBeGreaterThan(0)
      expect(drill.html, `drill ${drill.id} steps`).toContain('<ol>')
      expect(drill.duration.trim(), `drill ${drill.id} duration`).not.toBe('')
      expect(drill.equipment.trim(), `drill ${drill.id} equipment`).not.toBe('')
      expect(drill.goal.trim(), `drill ${drill.id} goal`).not.toBe('')
    }
  })
})

describe('quizzes', () => {
  it('has unique ids', () => {
    expect(duplicates(quizzes.map((q) => q.id))).toEqual([])
  })

  it('only references known levels', () => {
    for (const quiz of quizzes) {
      expect(levelIds, `quiz ${quiz.id}`).toContain(quiz.levelId)
    }
  })

  it('gives every level at least one quiz', () => {
    for (const id of levelIds) {
      expect(quizzes.filter((q) => q.levelId === id).length, `level ${id}`).toBeGreaterThan(0)
    }
  })

  it('has at least one question per quiz', () => {
    for (const quiz of quizzes) {
      expect(quiz.questions.length, `quiz ${quiz.id}`).toBeGreaterThan(0)
    }
  })

  it('uses question ids that are unique within their quiz', () => {
    for (const quiz of quizzes) {
      expect(duplicates(quiz.questions.map((q) => q.id)), `quiz ${quiz.id}`).toEqual([])
    }
  })

  it('offers at least two options per question', () => {
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        expect(question.options.length, `${quiz.id}/${question.id}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('has no duplicate options within a question', () => {
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        expect(duplicates(question.options), `${quiz.id}/${question.id}`).toEqual([])
      }
    }
  })

  // The single most damaging content bug: an off-by-one here silently marks
  // correct answers wrong for every user who takes the quiz.
  it('points correctIndex at a real option', () => {
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        expect(question.correctIndex, `${quiz.id}/${question.id}`).toBeGreaterThanOrEqual(0)
        expect(question.correctIndex, `${quiz.id}/${question.id}`).toBeLessThan(question.options.length)
        expect(Number.isInteger(question.correctIndex), `${quiz.id}/${question.id}`).toBe(true)
      }
    }
  })

  it('explains every answer', () => {
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        expect(question.explanation.trim(), `${quiz.id}/${question.id}`).not.toBe('')
      }
    }
  })
})

describe('cross-collection ids', () => {
  it('never reuses an id across lessons, drills and quizzes', () => {
    const all = [...lessons.map((l) => l.id), ...drills.map((d) => d.id), ...quizzes.map((q) => q.id)]
    expect(duplicates(all)).toEqual([])
  })
})

// Footwork is a skill that grows with the player rather than something learned
// once, so the curriculum must carry it through every level instead of leaving
// it stranded in the intermediate tier.
describe('footwork coverage', () => {
  it('teaches footwork at every level', () => {
    for (const id of levelIds) {
      const footworkLessons = lessons.filter((l) => l.levelId === id && l.category === FOOTWORK_CATEGORY)
      expect(footworkLessons.length, `level ${id} footwork lessons`).toBeGreaterThan(0)
    }
  })

  it('gives every level at least one footwork drill', () => {
    for (const id of levelIds) {
      const footworkDrills = drills.filter((d) => d.levelId === id && d.skill === 'Footwork')
      expect(footworkDrills.length, `level ${id} footwork drills`).toBeGreaterThan(0)
    }
  })
})

describe('grip coverage', () => {
  const gripSelection = lessons.find((l) => l.id === 'b-grip-selection')
  const gripEffects = lessons.find((l) => l.id === 'i-grip-effects')

  it('has a lesson on choosing a forehand grip', () => {
    expect(gripSelection).toBeDefined()
  })

  it('names every major grip in the grip-selection lesson', () => {
    const text = renderedText(gripSelection?.html)
    for (const grip of GRIPS) {
      expect(text, `grip ${grip}`).toContain(grip)
    }
  })

  // The handle bevels are numbered from the top going clockwise (for a
  // right-hander), which puts Continental on bevel 2 — every lesson that
  // mentions both must agree, or a reader following one lesson ends up with a
  // different grip than a reader following the other.
  it('always places the Continental grip on the second bevel', () => {
    const numberedBevel = /bevel \d|(?:first|second|third|fourth|fifth|sixth|seventh|eighth) bevel/i
    for (const lesson of lessons) {
      for (const sentence of renderedBlocks(lesson.html).flatMap((block) => block.split(/(?<=\.)\s+/))) {
        if (sentence.includes('Continental') && numberedBevel.test(sentence)) {
          expect(sentence, `lesson ${lesson.id}`).toMatch(/second bevel|bevel 2/i)
        }
      }
    }
  })

  it('has a lesson on how grip changes forehand technique', () => {
    expect(gripEffects).toBeDefined()
  })

  it('compares every major grip when explaining how grip changes the forehand', () => {
    const text = renderedText(gripEffects?.html)
    for (const grip of GRIPS) {
      expect(text, `grip ${grip}`).toContain(grip)
    }
  })
})

// Where the base knuckle sits around the octagon and where the fingers sit
// along the handle are independent choices: any of the four grips can be held
// bunched or with the index finger spread. The curriculum taught only the first
// axis, while `b-grip` called Continental "the hammer grip" — which quietly
// spends the word "hammer" on a bevel position and leaves a reader meeting
// "pistol grip" elsewhere to assume it must be some fifth bevel.
describe('grip hand-shape coverage', () => {
  const HAND_SHAPE_PATH = '/curriculum/intermediate/i-grip-hand-shape'
  const handShape = lessons.find((l) => l.id === 'i-grip-hand-shape')
  const handShapeTerm = /hammer|pistol/i

  it('has a lesson on where the fingers sit along the handle', () => {
    expect(handShape).toBeDefined()
  })

  it('names both hand shapes in the hand-shape lesson', () => {
    const text = renderedText(handShape?.html)
    expect(text).toMatch(/hammer/i)
    expect(text).toMatch(/pistol/i)
  })

  it('keeps the hand shapes off the bevel axis', () => {
    const numberedBevel = /bevel \d|(?:first|second|third|fourth|fifth|sixth|seventh|eighth) bevel/i
    for (const lesson of lessons) {
      for (const sentence of renderedBlocks(lesson.html).flatMap((block) => block.split(/(?<=\.)\s+/))) {
        if (handShapeTerm.test(sentence)) {
          expect(sentence, `lesson ${lesson.id}`).not.toMatch(numberedBevel)
        }
      }
    }
  })

  it('sends every other mention of a hand shape to the lesson that explains it', () => {
    for (const lesson of lessons) {
      if (lesson.id === handShape?.id) continue
      if (!handShapeTerm.test(renderedText(lesson.html))) continue
      expect(internalLinks(lesson.html), `lesson ${lesson.id}`).toContain(HAND_SHAPE_PATH)
    }
  })
})

describe('grip and footwork quizzes', () => {
  it('checks grip or footwork understanding at every level', () => {
    for (const id of levelIds) {
      const covered = quizzes.filter((q) => q.levelId === id && /grip|footwork/i.test(q.topic))
      expect(covered.length, `level ${id} grip/footwork quizzes`).toBeGreaterThan(0)
    }
  })
})

// The step-by-step forehand guides are the one place where paragraph order is
// load-bearing: a reader follows them as numbered checkpoints, so a missing or
// out-of-order step teaches the stroke wrong.
describe('step-by-step forehand guides', () => {
  const guideIds = ['b-forehand-eastern', 'i-forehand-semi-western', 'a-forehand-western']
  const guides = guideIds.map((id) => [id, lessons.find((l) => l.id === id)] as const)

  it('provides one guide per grip, spread across all three levels', () => {
    for (const [id, guide] of guides) {
      expect(guide, `guide ${id}`).toBeDefined()
    }
    expect(guides.map(([, guide]) => guide?.levelId)).toEqual(['beginner', 'intermediate', 'advanced'])
  })

  // Steps may be formatted as headings, paragraphs or list items — the guides
  // are authored Markdown and that is an editorial choice. The invariant is the
  // numbering, so scan every block form rather than assuming one of them.
  it('numbers the steps sequentially from 1', () => {
    for (const [id, guide] of guides) {
      const steps = renderedElements(guide?.html, 'h2, h3, h4, p, li').filter((block) =>
        /^Step \d+ —/.test(block),
      )
      expect(steps.length, `guide ${id} step count`).toBeGreaterThanOrEqual(6)
      expect(
        steps.map((block) => Number(block.match(/^Step (\d+) —/)![1])),
        `guide ${id} step numbering`,
      ).toEqual(steps.map((_, i) => i + 1))
    }
  })

  it('links every guide to a drill that practises it', () => {
    for (const [id, guide] of guides) {
      expect(guide?.drillIds?.length ?? 0, `guide ${id} drills`).toBeGreaterThan(0)
    }
  })
})

// Pro-style lessons show how the same grip fundamentals play out in a
// recognisable real-world technique, so each one must actually name the
// player and the grip it is describing, not just gesture at "pro tennis".
describe('pro-style forehand technique lessons', () => {
  const federer = lessons.find((l) => l.id === 'i-forehand-eastern-federer')
  const nadal = lessons.find((l) => l.id === 'i-forehand-semi-western-nadal')

  it('has a lesson on the Federer-style Eastern forehand', () => {
    expect(federer).toBeDefined()
    const text = renderedText(federer?.html)
    expect(text).toContain('Federer')
    expect(text).toContain('Eastern')
  })

  it('has a lesson on the Nadal-style Semi-Western forehand', () => {
    expect(nadal).toBeDefined()
    const text = renderedText(nadal?.html)
    expect(text).toContain('Nadal')
    expect(text).toContain('Semi-Western')
  })

  it('links each pro-style lesson to a practice drill from its own level', () => {
    const drillLevel = new Map(drills.map((d) => [d.id, d.levelId]))
    for (const lesson of [federer, nadal]) {
      expect(lesson?.drillIds?.length ?? 0, `lesson ${lesson?.id} drills`).toBeGreaterThan(0)
      for (const drillId of lesson?.drillIds ?? []) {
        expect(drillLevel.get(drillId), `lesson ${lesson?.id} -> drill ${drillId}`).toBe(lesson?.levelId)
      }
    }
  })
})

// Cross-links between lessons are the payoff of authoring in Markdown, but a
// link is only as good as its target: renaming a content file silently turns
// every link to it into a 404 the author never sees. Ids are already snapshotted
// (contentIds.test.ts); this closes the other half by checking the links.
describe('internal content links', () => {
  const staticRoutes = new Set(['/', '/curriculum', '/drills', '/quizzes', '/account'])
  const lessonPaths = new Set(lessons.map((l) => `/curriculum/${l.levelId}/${l.id}`))
  const levelPaths = new Set(levels.map((l) => `/curriculum/${l.id}`))
  const quizPaths = new Set(quizzes.map((q) => `/quizzes/${q.id}`))

  const sources = [
    ...lessons.map((l) => [`lesson ${l.id}`, l.html] as const),
    ...drills.map((d) => [`drill ${d.id}`, d.html] as const),
  ]

  it('only links to routes that exist', () => {
    for (const [label, html] of sources) {
      for (const href of internalLinks(html)) {
        const path = href.split(/[?#]/)[0]!
        const known =
          staticRoutes.has(path) ||
          lessonPaths.has(path) ||
          levelPaths.has(path) ||
          quizPaths.has(path)
        expect(known, `${label} links to ${href}, which is not a route in this app`).toBe(true)
      }
    }
  })

  it('never links a lesson to itself', () => {
    for (const lesson of lessons) {
      const self = `/curriculum/${lesson.levelId}/${lesson.id}`
      expect(internalLinks(lesson.html), `lesson ${lesson.id}`).not.toContain(self)
    }
  })
})
