import { Link } from 'react-router-dom'
import { levels } from '../data/levels'
import { lessons } from '../data/curriculum'
import { ProgressBar } from '../components/ProgressBar'
import { useLevelStats } from '../hooks/useLevelStats'

function LevelSection({ levelId }: { levelId: (typeof levels)[number]['id'] }) {
  const level = levels.find((l) => l.id === levelId)!
  const stats = useLevelStats(levelId)
  const levelLessons = lessons.filter((l) => l.levelId === levelId)
  const categories = Array.from(new Set(levelLessons.map((l) => l.category)))

  return (
    <section className="curriculum-level-section" style={{ borderLeftColor: level.color }}>
      <div className="curriculum-level-header">
        <div>
          <h2>{level.name}</h2>
          <p>{level.description}</p>
        </div>
        <Link to={`/curriculum/${level.id}`} className="btn btn-outline">
          View lessons
        </Link>
      </div>
      <ProgressBar percent={stats.overallPercent} color={level.color} />
      <div className="curriculum-categories">
        {categories.map((cat) => (
          <span key={cat} className="category-chip">
            {cat}
          </span>
        ))}
      </div>
    </section>
  )
}

export function CurriculumOverview() {
  return (
    <div className="page">
      <h1>Curriculum</h1>
      <p className="page-intro">
        Every level builds on the last. Work through lessons in order, or jump to the topic
        you need most.
      </p>
      <div className="curriculum-level-list">
        {levels.map((level) => (
          <LevelSection key={level.id} levelId={level.id} />
        ))}
      </div>
    </div>
  )
}
