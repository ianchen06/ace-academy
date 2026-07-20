import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ProgressContext, type ProgressContextValue, type QuizAttempt } from './progressContextDef'

const STORAGE_KEY = 'tennis-coach-progress'

interface ProgressState {
  completedLessons: string[]
  completedDrills: string[]
  quizAttempts: Record<string, QuizAttempt>
}

const defaultState: ProgressState = {
  completedLessons: [],
  completedDrills: [],
  quizAttempts: {},
}

function loadState(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    return {
      completedLessons: parsed.completedLessons ?? [],
      completedDrills: parsed.completedDrills ?? [],
      quizAttempts: parsed.quizAttempts ?? {},
    }
  } catch {
    return defaultState
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const toggleLesson = useCallback((id: string) => {
    setState((prev) => {
      const has = prev.completedLessons.includes(id)
      return {
        ...prev,
        completedLessons: has
          ? prev.completedLessons.filter((l) => l !== id)
          : [...prev.completedLessons, id],
      }
    })
  }, [])

  const toggleDrill = useCallback((id: string) => {
    setState((prev) => {
      const has = prev.completedDrills.includes(id)
      return {
        ...prev,
        completedDrills: has
          ? prev.completedDrills.filter((d) => d !== id)
          : [...prev.completedDrills, id],
      }
    })
  }, [])

  const recordQuizAttempt = useCallback((quizId: string, score: number, total: number) => {
    setState((prev) => {
      const existing = prev.quizAttempts[quizId]
      const isBetter = !existing || score > existing.score
      return {
        ...prev,
        quizAttempts: {
          ...prev.quizAttempts,
          [quizId]: isBetter ? { score, total, date: new Date().toISOString() } : existing,
        },
      }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setState(defaultState)
  }, [])

  const value = useMemo<ProgressContextValue>(() => {
    const isLessonComplete = (id: string) => state.completedLessons.includes(id)
    const isDrillComplete = (id: string) => state.completedDrills.includes(id)
    const bestQuizAttempt = (quizId: string) => state.quizAttempts[quizId]

    return {
      completedLessons: state.completedLessons,
      completedDrills: state.completedDrills,
      quizAttempts: state.quizAttempts,
      isLessonComplete,
      isDrillComplete,
      toggleLesson,
      toggleDrill,
      recordQuizAttempt,
      bestQuizAttempt,
      resetProgress,
    }
  }, [state, toggleLesson, toggleDrill, recordQuizAttempt, resetProgress])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}
