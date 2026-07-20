import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { quizzes } from '../data/quizzes'
import { levelById } from '../data/levels'
import { useProgress } from '../hooks/useProgress'

export function QuizPlay() {
  const { quizId } = useParams<{ quizId: string }>()
  const quiz = quizzes.find((q) => q.id === quizId)
  const { recordQuizAttempt, bestQuizAttempt } = useProgress()

  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  if (!quiz) return <Navigate to="/quizzes" replace />

  const level = levelById(quiz.levelId)
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined)
  const score = quiz.questions.filter((q) => answers[q.id] === q.correctIndex).length
  const best = bestQuizAttempt(quiz.id)

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
    recordQuizAttempt(quiz.id, score, quiz.questions.length)
  }

  const handleRetry = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="page quiz-page">
      <div className="breadcrumb">
        <Link to="/quizzes">Quizzes</Link>
        <span aria-hidden="true">/</span>
        <span>{quiz.title}</span>
      </div>

      <span className="category-chip" style={{ borderColor: level?.color }}>
        {quiz.topic}
      </span>
      <h1>{quiz.title}</h1>
      <p className="page-intro">{quiz.description}</p>
      {best && !submitted && (
        <p className="quiz-best-score">
          Your best score: {best.score}/{best.total}
        </p>
      )}

      {submitted && (
        <div className="quiz-result-banner">
          <h2>
            You scored {score} / {quiz.questions.length}
          </h2>
          <button type="button" className="btn btn-outline" onClick={handleRetry}>
            Retake quiz
          </button>
        </div>
      )}

      <div className="quiz-questions">
        {quiz.questions.map((question, qi) => {
          const selected = answers[question.id]
          return (
            <div key={question.id} className="quiz-question">
              <h3>
                {qi + 1}. {question.question}
              </h3>
              <div className="quiz-options">
                {question.options.map((option, oi) => {
                  let optionClass = 'quiz-option'
                  if (selected === oi) optionClass += ' selected'
                  if (submitted) {
                    if (oi === question.correctIndex) optionClass += ' correct'
                    else if (oi === selected) optionClass += ' incorrect'
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      className={optionClass}
                      onClick={() => handleSelect(question.id, oi)}
                      disabled={submitted}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
              {submitted && <p className="quiz-explanation">{question.explanation}</p>}
            </div>
          )
        })}
      </div>

      {!submitted && (
        <button type="button" className="btn btn-primary submit-quiz-btn" onClick={handleSubmit} disabled={!allAnswered}>
          {allAnswered ? 'Submit answers' : `Answer all ${quiz.questions.length} questions`}
        </button>
      )}
    </div>
  )
}
