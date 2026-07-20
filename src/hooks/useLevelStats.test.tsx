import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ProgressProvider } from '../context/ProgressContext'
import { lessons } from '../data/curriculum'
import { drills } from '../data/drills'
import { quizzes } from '../data/quizzes'
import type { LevelId } from '../data/types'
import { seedProgress, type StoredProgress } from '../test/renderWithProviders'
import { useLevelStats } from './useLevelStats'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <ProgressProvider>{children}</ProgressProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

function statsFor(levelId: LevelId, progress: StoredProgress = {}) {
  seedProgress(progress)
  return renderHook(() => useLevelStats(levelId), { wrapper }).result.current
}

const beginnerLessons = lessons.filter((l) => l.levelId === 'beginner')
const beginnerDrills = drills.filter((d) => d.levelId === 'beginner')
const beginnerQuizzes = quizzes.filter((q) => q.levelId === 'beginner')

describe('useLevelStats', () => {
  it('reports the totals for the requested level', () => {
    const stats = statsFor('beginner')
    expect(stats.levelId).toBe('beginner')
    expect(stats.lessonsTotal).toBe(beginnerLessons.length)
    expect(stats.drillsTotal).toBe(beginnerDrills.length)
    expect(stats.quizzesTotal).toBe(beginnerQuizzes.length)
  })

  it('is all zeroes with no progress', () => {
    const stats = statsFor('beginner')
    expect(stats.lessonsDone).toBe(0)
    expect(stats.drillsDone).toBe(0)
    expect(stats.quizzesAttempted).toBe(0)
    expect(stats.overallPercent).toBe(0)
  })

  it('counts completed lessons for the level', () => {
    const stats = statsFor('beginner', { completedLessons: [beginnerLessons[0].id, beginnerLessons[1].id] })
    expect(stats.lessonsDone).toBe(2)
  })

  it('counts completed drills for the level', () => {
    const stats = statsFor('beginner', { completedDrills: [beginnerDrills[0].id] })
    expect(stats.drillsDone).toBe(1)
  })

  it('counts a quiz as attempted regardless of score', () => {
    const stats = statsFor('beginner', {
      quizAttempts: { [beginnerQuizzes[0].id]: { score: 0, total: 5, date: '2026-01-01T00:00:00Z' } },
    })
    expect(stats.quizzesAttempted).toBe(1)
  })

  it('ignores progress belonging to a different level', () => {
    const advancedLesson = lessons.find((l) => l.levelId === 'advanced')!
    const stats = statsFor('beginner', { completedLessons: [advancedLesson.id] })
    expect(stats.lessonsDone).toBe(0)
    expect(stats.overallPercent).toBe(0)
  })

  it('ignores ids that no longer exist in the curriculum', () => {
    const stats = statsFor('beginner', { completedLessons: ['deleted-lesson'] })
    expect(stats.lessonsDone).toBe(0)
  })

  it('reaches 100% when every item in the level is done', () => {
    const stats = statsFor('advanced', {
      completedLessons: lessons.filter((l) => l.levelId === 'advanced').map((l) => l.id),
      completedDrills: drills.filter((d) => d.levelId === 'advanced').map((d) => d.id),
      quizAttempts: Object.fromEntries(
        quizzes
          .filter((q) => q.levelId === 'advanced')
          .map((q) => [q.id, { score: 1, total: 1, date: '2026-01-01T00:00:00Z' }]),
      ),
    })
    expect(stats.overallPercent).toBe(100)
  })

  it('rounds the percentage to a whole number', () => {
    const stats = statsFor('beginner', { completedLessons: [beginnerLessons[0].id] })
    const total = beginnerLessons.length + beginnerDrills.length + beginnerQuizzes.length
    expect(stats.overallPercent).toBe(Math.round((1 / total) * 100))
    expect(Number.isInteger(stats.overallPercent)).toBe(true)
  })

  it('weights lessons, drills and quizzes equally', () => {
    const total = beginnerLessons.length + beginnerDrills.length + beginnerQuizzes.length
    const fromLesson = statsFor('beginner', { completedLessons: [beginnerLessons[0].id] }).overallPercent
    const fromDrill = statsFor('beginner', { completedDrills: [beginnerDrills[0].id] }).overallPercent
    expect(fromLesson).toBe(fromDrill)
    expect(fromLesson).toBe(Math.round((1 / total) * 100))
  })

  it('never exceeds 100% when stored progress contains duplicates', () => {
    const stats = statsFor('beginner', {
      completedLessons: [beginnerLessons[0].id, beginnerLessons[0].id],
    })
    expect(stats.overallPercent).toBeLessThanOrEqual(100)
  })

  it('computes independent stats per level', () => {
    const intermediate = statsFor('intermediate')
    expect(intermediate.levelId).toBe('intermediate')
    expect(intermediate.lessonsTotal).toBe(lessons.filter((l) => l.levelId === 'intermediate').length)
  })
})
