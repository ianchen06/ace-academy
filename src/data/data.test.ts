import { describe, expect, it } from 'vitest'
import { levels, levelById } from './levels'
import { lessons } from './curriculum'
import { drills } from './drills'
import { quizzes } from './quizzes'
import type { LevelId } from './types'

const levelIds = levels.map((l) => l.id)

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
      expect(lesson.content.length, `lesson ${lesson.id} content`).toBeGreaterThan(0)
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
      expect(drill.instructions.length, `drill ${drill.id} instructions`).toBeGreaterThan(0)
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
