import { describe, expect, it } from 'vitest'
import { compileQuiz } from './compileQuiz'

const PATH = '/repo/content/quizzes/beginner/010-b-quiz-rules.yml'

const VALID = `topic: Rules & Scoring
title: Rules & Scoring Basics
description: Test your knowledge of how points and games work.
questions:
  - id: q1
    question: What is the score when both players have 40?
    options: [Match point, Deuce, Tiebreak]
    answer: Deuce
    explanation: Both players on 40 is deuce.
`

describe('compileQuiz', () => {
  it('derives id and level from the file path', () => {
    const quiz = compileQuiz(VALID, PATH)
    expect(quiz.id).toBe('b-quiz-rules')
    expect(quiz.levelId).toBe('beginner')
  })

  it('carries the structured fields through', () => {
    const quiz = compileQuiz(VALID, PATH)
    expect(quiz.topic).toBe('Rules & Scoring')
    expect(quiz.title).toBe('Rules & Scoring Basics')
    expect(quiz.description).toBe('Test your knowledge of how points and games work.')
    expect(quiz.questions).toHaveLength(1)
  })

  // The whole point of authoring the answer as text: `correctIndex: 1` is a
  // number nobody can proofread, and getting it wrong marks correct answers
  // wrong for every user. Resolving it from the answer text makes the
  // off-by-one unrepresentable rather than merely tested for.
  describe('the answer', () => {
    it('resolves the answer text to the index of that option', () => {
      expect(compileQuiz(VALID, PATH).questions[0]!.correctIndex).toBe(1)
    })

    it('resolves an answer in first position', () => {
      const first = VALID.replace('answer: Deuce', 'answer: Match point')
      expect(compileQuiz(first, PATH).questions[0]!.correctIndex).toBe(0)
    })

    it('rejects an answer that matches no option', () => {
      const wrong = VALID.replace('answer: Deuce', 'answer: Duece')
      expect(() => compileQuiz(wrong, PATH)).toThrow(/Duece/)
    })

    it('rejects an answer that differs only by whitespace or case', () => {
      const sloppy = VALID.replace('answer: Deuce', 'answer: deuce')
      expect(() => compileQuiz(sloppy, PATH)).toThrow(/deuce/)
    })

    it('rejects a missing answer', () => {
      const none = VALID.replace('    answer: Deuce\n', '')
      expect(() => compileQuiz(none, PATH)).toThrow(/answer/)
    })
  })

  describe('validation', () => {
    it('rejects an unknown top-level key', () => {
      expect(() => compileQuiz(`${VALID}topics: oops\n`, PATH)).toThrow(/topics/)
    })

    it('rejects an unknown question key', () => {
      const extra = VALID.replace('    answer: Deuce', '    answer: Deuce\n    hint: nope')
      expect(() => compileQuiz(extra, PATH)).toThrow(/hint/)
    })

    for (const field of ['topic', 'title', 'description']) {
      it(`rejects a missing ${field}`, () => {
        const without = VALID.split('\n')
          .filter((line) => !line.startsWith(`${field}:`))
          .join('\n')
        expect(() => compileQuiz(without, PATH)).toThrow(new RegExp(field))
      })
    }

    it('rejects a quiz with no questions', () => {
      const empty = `topic: T\ntitle: T\ndescription: D\nquestions: []\n`
      expect(() => compileQuiz(empty, PATH)).toThrow(/questions/)
    })

    it('rejects a question with fewer than two options', () => {
      const thin = VALID.replace('[Match point, Deuce, Tiebreak]', '[Deuce]')
      expect(() => compileQuiz(thin, PATH)).toThrow(/two options/)
    })

    it('rejects duplicate options within a question', () => {
      const dupe = VALID.replace('[Match point, Deuce, Tiebreak]', '[Deuce, Deuce]')
      expect(() => compileQuiz(dupe, PATH)).toThrow(/duplicate/i)
    })

    it('rejects two questions sharing an id', () => {
      const twice = VALID + VALID.split('questions:\n')[1]
      expect(() => compileQuiz(twice, PATH)).toThrow(/q1/)
    })

    it('rejects a missing explanation', () => {
      const none = VALID.replace('    explanation: Both players on 40 is deuce.\n', '')
      expect(() => compileQuiz(none, PATH)).toThrow(/explanation/)
    })

    it('rejects malformed yaml with the file path attached', () => {
      expect(() => compileQuiz('topic: [unclosed\n', PATH)).toThrow(/010-b-quiz-rules\.yml/)
    })
  })
})
