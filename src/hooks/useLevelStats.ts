import { useMemo } from 'react'
import type { LevelId } from '../data/types'
import { lessons } from '../data/curriculum'
import { drills } from '../data/drills'
import { quizzes } from '../data/quizzes'
import { useProgress } from './useProgress'

export interface LevelStats {
  levelId: LevelId
  lessonsTotal: number
  lessonsDone: number
  drillsTotal: number
  drillsDone: number
  quizzesTotal: number
  quizzesAttempted: number
  overallPercent: number
}

export function useLevelStats(levelId: LevelId): LevelStats {
  const { completedLessons, completedDrills, quizAttempts } = useProgress()

  return useMemo(() => {
    const levelLessons = lessons.filter((l) => l.levelId === levelId)
    const levelDrills = drills.filter((d) => d.levelId === levelId)
    const levelQuizzes = quizzes.filter((q) => q.levelId === levelId)

    const lessonsDone = levelLessons.filter((l) => completedLessons.includes(l.id)).length
    const drillsDone = levelDrills.filter((d) => completedDrills.includes(d.id)).length
    const quizzesAttempted = levelQuizzes.filter((q) => quizAttempts[q.id]).length

    const totalItems = levelLessons.length + levelDrills.length + levelQuizzes.length
    const doneItems = lessonsDone + drillsDone + quizzesAttempted
    const overallPercent = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100)

    return {
      levelId,
      lessonsTotal: levelLessons.length,
      lessonsDone,
      drillsTotal: levelDrills.length,
      drillsDone,
      quizzesTotal: levelQuizzes.length,
      quizzesAttempted,
      overallPercent,
    }
  }, [levelId, completedLessons, completedDrills, quizAttempts])
}
