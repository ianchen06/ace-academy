import { Link } from 'react-router-dom'
import { levels } from '../data/levels'
import { quizzes } from '../data/quizzes'
import { useProgress } from '../hooks/useProgress'

export function Quizzes() {
  const { bestQuizAttempt } = useProgress()

  return (
    <div className="page">
      <h1>Quizzes</h1>
      <p className="page-intro">
        Test what you have learned about rules, strokes, and strategy at each level.
      </p>

      {levels.map((level) => {
        const levelQuizzes = quizzes.filter((q) => q.levelId === level.id)
        if (levelQuizzes.length === 0) return null
        return (
          <section key={level.id} className="quiz-level-section">
            <h2 className="section-title" style={{ color: level.color }}>
              {level.name}
            </h2>
            <div className="quiz-grid">
              {levelQuizzes.map((quiz) => {
                const best = bestQuizAttempt(quiz.id)
                return (
                  <Link key={quiz.id} to={`/quizzes/${quiz.id}`} className="quiz-card" style={{ borderTopColor: level.color }}>
                    <span className="skill-pill">{quiz.topic}</span>
                    <h3>{quiz.title}</h3>
                    <p>{quiz.description}</p>
                    <div className="quiz-card-footer">
                      <span>{quiz.questions.length} questions</span>
                      {best && (
                        <span className="quiz-best-score">
                          Best: {best.score}/{best.total}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
