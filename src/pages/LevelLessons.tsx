import { Link, Navigate, useParams } from 'react-router-dom'
import { levelById, levels } from '../data/levels'
import { lessons } from '../data/curriculum'
import type { LevelId } from '../data/types'
import { ProgressBar } from '../components/ProgressBar'
import { useLevelStats } from '../hooks/useLevelStats'
import { useProgress } from '../hooks/useProgress'

export function LevelLessons() {
  const { levelId } = useParams<{ levelId: string }>()
  const level = levelById(levelId ?? '')
  const { isLessonComplete } = useProgress()
  const stats = useLevelStats((levelId as LevelId) ?? 'beginner')

  if (!level) return <Navigate to="/curriculum" replace />

  const levelLessons = lessons.filter((l) => l.levelId === level.id)
  const categories = Array.from(new Set(levelLessons.map((l) => l.category)))

  return (
    <div className="page">
      <div className="level-tabs">
        {levels.map((l) => (
          <Link key={l.id} to={`/curriculum/${l.id}`} className={`level-tab ${l.id === level.id ? 'active' : ''}`}>
            {l.name}
          </Link>
        ))}
      </div>

      <h1 style={{ color: level.color }}>{level.name} Curriculum</h1>
      <p className="page-intro">{level.description}</p>
      <ProgressBar percent={stats.overallPercent} color={level.color} label="Level progress" />

      {categories.map((category) => (
        <section key={category} className="lesson-category">
          <h2 className="section-title">{category}</h2>
          <div className="lesson-list">
            {levelLessons
              .filter((l) => l.category === category)
              .map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`/curriculum/${level.id}/${lesson.id}`}
                  className="lesson-list-item"
                >
                  <span className={`check-dot ${isLessonComplete(lesson.id) ? 'done' : ''}`} aria-hidden="true" />
                  <div>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.summary}</p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
