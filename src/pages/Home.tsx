import { Link } from 'react-router-dom'
import { levels } from '../data/levels'
import { ProgressBar } from '../components/ProgressBar'
import { useLevelStats } from '../hooks/useLevelStats'

function LevelCard({ levelId }: { levelId: (typeof levels)[number]['id'] }) {
  const level = levels.find((l) => l.id === levelId)!
  const stats = useLevelStats(levelId)

  return (
    <Link to={`/curriculum/${level.id}`} className="level-card" style={{ borderTopColor: level.color }}>
      <div className="level-card-header">
        <h3>{level.name}</h3>
        <span className="level-card-tagline">{level.tagline}</span>
      </div>
      <p className="level-card-desc">{level.description}</p>
      <ProgressBar percent={stats.overallPercent} color={level.color} label={`${level.name} progress`} />
      <div className="level-card-stats">
        <span>{stats.lessonsDone}/{stats.lessonsTotal} lessons</span>
        <span>{stats.drillsDone}/{stats.drillsTotal} drills</span>
        <span>{stats.quizzesAttempted}/{stats.quizzesTotal} quizzes</span>
      </div>
    </Link>
  )
}

export function Home() {
  return (
    <div className="page home-page">
      <section className="hero-section">
        <h1>Learn tennis, one level at a time.</h1>
        <p>
          Structured lessons, practice drills, and quizzes that take you from your first
          forehand to advanced match tactics — at your own pace.
        </p>
      </section>

      <section>
        <h2 className="section-title">Choose your level</h2>
        <div className="level-grid">
          {levels.map((level) => (
            <LevelCard key={level.id} levelId={level.id} />
          ))}
        </div>
      </section>

      <section className="quicklinks-section">
        <h2 className="section-title">Jump to</h2>
        <div className="quicklinks-grid">
          <Link to="/drills" className="quicklink-card">
            <h3>Drills</h3>
            <p>Practice routines for every skill and level.</p>
          </Link>
          <Link to="/quizzes" className="quicklink-card">
            <h3>Quizzes</h3>
            <p>Test your knowledge of rules, strokes, and strategy.</p>
          </Link>
          <Link to="/curriculum" className="quicklink-card">
            <h3>Full Curriculum</h3>
            <p>Browse every lesson across all levels.</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
