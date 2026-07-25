import { describe, expect, it } from 'vitest'
import { quizzes } from './quizzes'
import { legacyQuizzes } from './quizzesLegacy'

/**
 * TEMPORARY — the gate on the quiz YAML migration. Delete this file and
 * `quizzesLegacy.ts` together once reviewed.
 *
 * The comparison that matters most is `correctIndex`: the authored files now
 * carry the answer as text, and this proves the resolved index still points at
 * the same option it did before. A silent shift here would mark correct answers
 * wrong for every user.
 */
describe('quiz yaml migration', () => {
  it('produces the same quizzes in the same order', () => {
    expect(quizzes.map((q) => q.id)).toEqual(legacyQuizzes.map((q) => q.id))
  })

  it('preserves every quiz and question, field for field', () => {
    for (const [index, quiz] of quizzes.entries()) {
      const legacy = legacyQuizzes[index]!
      expect(quiz.levelId, legacy.id).toBe(legacy.levelId)
      expect(quiz.topic, legacy.id).toBe(legacy.topic)
      expect(quiz.title, legacy.id).toBe(legacy.title)
      expect(quiz.description, legacy.id).toBe(legacy.description)
      expect(quiz.questions, legacy.id).toEqual(legacy.questions)
    }
  })

  it('resolves every answer to the option the old correctIndex pointed at', () => {
    for (const quiz of quizzes) {
      const legacy = legacyQuizzes.find((q) => q.id === quiz.id)!
      for (const [index, question] of quiz.questions.entries()) {
        const legacyQuestion = legacy.questions[index]!
        expect(
          question.options[question.correctIndex],
          `${quiz.id}/${question.id}`,
        ).toBe(legacyQuestion.options[legacyQuestion.correctIndex])
      }
    }
  })
})
