import { useMemo, useState } from 'react'
import { levels } from '../data/levels'
import { drills } from '../data/drills'
import type { LevelId } from '../data/types'
import { useProgress } from '../hooks/useProgress'

export function Drills() {
  const [levelFilter, setLevelFilter] = useState<LevelId | 'all'>('all')
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const { isDrillComplete, toggleDrill } = useProgress()

  const skills = useMemo(() => {
    const scoped = levelFilter === 'all' ? drills : drills.filter((d) => d.levelId === levelFilter)
    return Array.from(new Set(scoped.map((d) => d.skill))).sort()
  }, [levelFilter])

  const filteredDrills = useMemo(() => {
    return drills.filter((d) => {
      if (levelFilter !== 'all' && d.levelId !== levelFilter) return false
      if (skillFilter !== 'all' && d.skill !== skillFilter) return false
      return true
    })
  }, [levelFilter, skillFilter])

  return (
    <div className="page">
      <h1>Drills</h1>
      <p className="page-intro">
        Concrete practice routines you can run solo, with a partner, or with a group. Mark
        drills complete as you work through them.
      </p>

      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Level</span>
          <div className="filter-chips">
            <button
              type="button"
              className={`chip-btn ${levelFilter === 'all' ? 'active' : ''}`}
              onClick={() => setLevelFilter('all')}
            >
              All
            </button>
            {levels.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`chip-btn ${levelFilter === level.id ? 'active' : ''}`}
                style={levelFilter === level.id ? { backgroundColor: level.color, borderColor: level.color } : undefined}
                onClick={() => {
                  setLevelFilter(level.id)
                  setSkillFilter('all')
                }}
              >
                {level.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Skill</span>
          <div className="filter-chips">
            <button
              type="button"
              className={`chip-btn ${skillFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSkillFilter('all')}
            >
              All
            </button>
            {skills.map((skill) => (
              <button
                key={skill}
                type="button"
                className={`chip-btn ${skillFilter === skill ? 'active' : ''}`}
                onClick={() => setSkillFilter(skill)}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="drill-grid">
        {filteredDrills.map((drill) => {
          const level = levels.find((l) => l.id === drill.levelId)!
          const complete = isDrillComplete(drill.id)
          return (
            <div key={drill.id} className={`drill-card ${complete ? 'complete' : ''}`} style={{ borderTopColor: level.color }}>
              <div className="drill-card-header">
                <span className="level-pill" style={{ backgroundColor: level.color }}>
                  {level.name}
                </span>
                <span className="skill-pill">{drill.skill}</span>
              </div>
              <h3>{drill.title}</h3>
              <div className="drill-meta">
                <span>⏱ {drill.duration}</span>
                <span>🎾 {drill.equipment}</span>
              </div>
              <p className="drill-goal">{drill.goal}</p>
              <ol className="drill-steps">
                {drill.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <button type="button" className={`btn ${complete ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleDrill(drill.id)}>
                {complete ? '✓ Completed' : 'Mark complete'}
              </button>
            </div>
          )
        })}
        {filteredDrills.length === 0 && <p>No drills match those filters yet.</p>}
      </div>
    </div>
  )
}
