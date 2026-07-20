import { Link, Navigate, useParams } from 'react-router-dom'
import { levelById } from '../data/levels'
import { lessons } from '../data/curriculum'
import { drills } from '../data/drills'
import { useProgress } from '../hooks/useProgress'

export function LessonDetail() {
  const { levelId, lessonId } = useParams<{ levelId: string; lessonId: string }>()
  const level = levelById(levelId ?? '')
  const lesson = lessons.find((l) => l.id === lessonId && l.levelId === levelId)
  const { isLessonComplete, toggleLesson } = useProgress()

  if (!level || !lesson) return <Navigate to="/curriculum" replace />

  const levelLessons = lessons.filter((l) => l.levelId === level.id)
  const index = levelLessons.findIndex((l) => l.id === lesson.id)
  const prev = levelLessons[index - 1]
  const next = levelLessons[index + 1]
  const relatedDrills = drills.filter((d) => lesson.drillIds?.includes(d.id))
  const complete = isLessonComplete(lesson.id)

  return (
    <div className="page lesson-page">
      <div className="breadcrumb">
        <Link to="/curriculum">Curriculum</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/curriculum/${level.id}`}>{level.name}</Link>
        <span aria-hidden="true">/</span>
        <span>{lesson.title}</span>
      </div>

      <span className="category-chip" style={{ borderColor: level.color }}>
        {lesson.category}
      </span>
      <h1>{lesson.title}</h1>
      <p className="page-intro">{lesson.summary}</p>

      <div className="lesson-content">
        {lesson.content.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {lesson.tips.length > 0 && (
        <div className="tips-box">
          <h2>Coaching tips</h2>
          <ul>
            {lesson.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {relatedDrills.length > 0 && (
        <div className="related-drills">
          <h2 className="section-title">Practice this with</h2>
          <div className="drill-list">
            {relatedDrills.map((drill) => (
              <Link key={drill.id} to="/drills" className="drill-card-mini">
                <h3>{drill.title}</h3>
                <span>{drill.duration}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className={`btn ${complete ? 'btn-outline' : 'btn-primary'} mark-complete-btn`}
        onClick={() => toggleLesson(lesson.id)}
      >
        {complete ? '✓ Marked complete — click to undo' : 'Mark as complete'}
      </button>

      <div className="lesson-nav">
        {prev ? (
          <Link to={`/curriculum/${level.id}/${prev.id}`} className="lesson-nav-link prev">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/curriculum/${level.id}/${next.id}`} className="lesson-nav-link next">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
