import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { quizzes } from '../data/quizzes'
import { readStoredProgress, renderWithProviders, seedProgress } from '../test/renderWithProviders'
import { QuizPlay } from './QuizPlay'

const quiz = quizzes[0]
const questionCount = quiz.questions.length

function renderQuiz(id: string = quiz.id) {
  return renderWithProviders(<QuizPlay />, { route: `/quizzes/${id}`, path: '/quizzes/:quizId' })
}

/** Click the correct option for every question. */
async function answerAll(user: ReturnType<typeof renderQuiz>['user'], correct = true) {
  for (const question of quiz.questions) {
    const index = correct
      ? question.correctIndex
      : (question.correctIndex + 1) % question.options.length
    await user.click(screen.getByRole('button', { name: question.options[index] }))
  }
}

describe('QuizPlay', () => {
  it('renders the quiz title, topic and description', () => {
    renderQuiz()
    expect(screen.getByRole('heading', { level: 1, name: quiz.title })).toBeInTheDocument()
    expect(screen.getByText(quiz.topic)).toBeInTheDocument()
    expect(screen.getByText(quiz.description)).toBeInTheDocument()
  })

  it('renders every question with all of its options', () => {
    renderQuiz()
    for (const question of quiz.questions) {
      expect(screen.getByRole('heading', { name: new RegExp(escapeRegExp(question.question)) })).toBeInTheDocument()
      for (const option of question.options) {
        expect(screen.getByRole('button', { name: option })).toBeInTheDocument()
      }
    }
  })

  it('redirects to the quiz list for an unknown quiz id', () => {
    renderQuiz('does-not-exist')
    expect(screen.queryByRole('heading', { level: 1, name: quiz.title })).not.toBeInTheDocument()
  })

  it('disables submit until every question is answered', async () => {
    const { user } = renderQuiz()
    const submit = screen.getByRole('button', { name: `Answer all ${questionCount} questions` })
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole('button', { name: quiz.questions[0].options[0] }))
    expect(screen.getByRole('button', { name: `Answer all ${questionCount} questions` })).toBeDisabled()
  })

  it('enables submit once all questions are answered', async () => {
    const { user } = renderQuiz()
    await answerAll(user)
    expect(screen.getByRole('button', { name: 'Submit answers' })).toBeEnabled()
  })

  it('marks the chosen option as selected', async () => {
    const { user } = renderQuiz()
    const option = screen.getByRole('button', { name: quiz.questions[0].options[0] })
    await user.click(option)
    expect(option).toHaveClass('selected')
  })

  it('lets an answer be changed before submitting', async () => {
    const { user } = renderQuiz()
    const [first, second] = quiz.questions[0].options
    await user.click(screen.getByRole('button', { name: first }))
    await user.click(screen.getByRole('button', { name: second }))

    expect(screen.getByRole('button', { name: first })).not.toHaveClass('selected')
    expect(screen.getByRole('button', { name: second })).toHaveClass('selected')
  })

  it('scores a perfect run', async () => {
    const { user } = renderQuiz()
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    expect(screen.getByRole('heading', { name: `You scored ${questionCount} / ${questionCount}` })).toBeInTheDocument()
  })

  it('scores a run where every answer is wrong', async () => {
    const { user } = renderQuiz()
    await answerAll(user, false)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    expect(screen.getByRole('heading', { name: `You scored 0 / ${questionCount}` })).toBeInTheDocument()
  })

  it('reveals the correct answer and explanation after submitting', async () => {
    const { user } = renderQuiz()
    await answerAll(user, false)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    const question = quiz.questions[0]
    expect(screen.getByRole('button', { name: question.options[question.correctIndex] })).toHaveClass('correct')
    expect(screen.getByText(question.explanation)).toBeInTheDocument()
  })

  it('marks the user’s wrong choice as incorrect', async () => {
    const { user } = renderQuiz()
    await answerAll(user, false)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    const question = quiz.questions[0]
    const chosen = question.options[(question.correctIndex + 1) % question.options.length]
    expect(screen.getByRole('button', { name: chosen })).toHaveClass('incorrect')
  })

  it('locks the options after submitting', async () => {
    const { user } = renderQuiz()
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    expect(screen.getByRole('button', { name: quiz.questions[0].options[0] })).toBeDisabled()
  })

  it('ignores clicks on options after submitting', async () => {
    const { user } = renderQuiz()
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    const question = quiz.questions[0]
    const other = question.options[(question.correctIndex + 1) % question.options.length]
    await user.click(screen.getByRole('button', { name: other }))

    // The score banner must not change from the locked-in result.
    expect(screen.getByRole('heading', { name: `You scored ${questionCount} / ${questionCount}` })).toBeInTheDocument()
  })

  it('hides the submit button after submitting', async () => {
    const { user } = renderQuiz()
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    expect(screen.queryByRole('button', { name: 'Submit answers' })).not.toBeInTheDocument()
  })

  it('persists the attempt to progress', async () => {
    const { user } = renderQuiz()
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    const attempt = readStoredProgress().quizAttempts?.[quiz.id]
    expect(attempt).toMatchObject({ score: questionCount, total: questionCount })
  })

  it('clears the answers when retaking', async () => {
    const { user } = renderQuiz()
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))
    await user.click(screen.getByRole('button', { name: 'Retake quiz' }))

    expect(screen.getByRole('button', { name: `Answer all ${questionCount} questions` })).toBeDisabled()
    expect(screen.getByRole('button', { name: quiz.questions[0].options[0] })).not.toHaveClass('selected')
  })

  it('shows a previous best score before a new attempt', () => {
    seedProgress({ quizAttempts: { [quiz.id]: { score: 2, total: questionCount, date: '2026-01-01T00:00:00Z' } } })
    renderQuiz()
    expect(screen.getByText(`Your best score: 2/${questionCount}`)).toBeInTheDocument()
  })

  it('hides the best score banner while showing results', async () => {
    seedProgress({ quizAttempts: { [quiz.id]: { score: 2, total: questionCount, date: '2026-01-01T00:00:00Z' } } })
    const { user } = renderQuiz()
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    expect(screen.queryByText(`Your best score: 2/${questionCount}`)).not.toBeInTheDocument()
  })

  it('does not downgrade a stored best score after a worse attempt', async () => {
    seedProgress({ quizAttempts: { [quiz.id]: { score: questionCount, total: questionCount, date: '2026-01-01T00:00:00Z' } } })
    const { user } = renderQuiz()
    await answerAll(user, false)
    await user.click(screen.getByRole('button', { name: 'Submit answers' }))

    expect(readStoredProgress().quizAttempts?.[quiz.id].score).toBe(questionCount)
  })

  it('offers a breadcrumb back to the quiz list', () => {
    renderQuiz()
    expect(screen.getByRole('link', { name: 'Quizzes' })).toHaveAttribute('href', '/quizzes')
  })
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
