import { load } from 'js-yaml'
import { failFor, identityFromPath, requireStrings, requireText } from './compile'
import type { Fail } from './compile'
import type { Quiz, QuizQuestion } from '../data/types'

const KNOWN_KEYS = ['topic', 'title', 'description', 'questions']
const KNOWN_QUESTION_KEYS = ['id', 'question', 'options', 'answer', 'explanation']

function rejectUnknownKeys(
  data: Record<string, unknown>,
  known: string[],
  where: string,
  fail: Fail,
) {
  for (const key of Object.keys(data)) {
    if (!known.includes(key)) {
      fail(`has an unknown ${where} key "${key}" (expected one of: ${known.join(', ')})`)
    }
  }
}

/**
 * Compiles one authored YAML quiz into the `Quiz` the app consumes.
 *
 * Quizzes are structured data, not prose, so they are authored as YAML rather
 * than Markdown — and the answer is authored as *text* rather than as an index.
 * `correctIndex: 1` is a number no reviewer can proofread, and getting it wrong
 * silently marks correct answers wrong for every user who takes the quiz. Here
 * the index is derived, and an answer that matches no option fails the build.
 */
export function compileQuiz(source: string, filePath: string): Quiz {
  const fail = failFor(filePath)
  const { id, levelId } = identityFromPath(filePath, fail)

  let parsed: unknown
  try {
    parsed = load(source)
  } catch (error) {
    fail(`is not valid YAML — ${(error as Error).message}`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail('should be a YAML mapping of topic, title, description and questions')
  }
  const data = parsed as Record<string, unknown>
  rejectUnknownKeys(data, KNOWN_KEYS, 'top-level', fail)

  const rawQuestions = data.questions
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    fail('needs a non-empty "questions" list')
  }

  const seenIds = new Set<string>()
  const questions = (rawQuestions as unknown[]).map((raw, index): QuizQuestion => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      fail(`has a question at position ${index + 1} that is not a mapping`)
    }
    const q = raw as Record<string, unknown>
    rejectUnknownKeys(q, KNOWN_QUESTION_KEYS, 'question', fail)

    const questionId = requireText(q, 'id', fail)
    if (seenIds.has(questionId)) {
      fail(`reuses the question id "${questionId}"`)
    }
    seenIds.add(questionId)

    const options = requireStrings(q, 'options', fail)
    if (options.length < 2) {
      fail(`question "${questionId}" needs at least two options`)
    }
    if (new Set(options).size !== options.length) {
      fail(`question "${questionId}" has duplicate options`)
    }

    const answer = requireText(q, 'answer', fail)
    const correctIndex = options.indexOf(answer)
    if (correctIndex === -1) {
      fail(
        `question "${questionId}" has answer "${answer}", which is not one of its options ` +
          `(${options.join(' | ')}) — the answer must match an option exactly`,
      )
    }

    return {
      id: questionId,
      question: requireText(q, 'question', fail),
      options,
      correctIndex,
      explanation: requireText(q, 'explanation', fail),
    }
  })

  return {
    id,
    levelId,
    topic: requireText(data, 'topic', fail),
    title: requireText(data, 'title', fail),
    description: requireText(data, 'description', fail),
    questions,
  }
}
