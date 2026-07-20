import { createContext } from 'react'

export interface QuizAttempt {
  score: number
  total: number
  date: string
}

export interface ProgressContextValue {
  completedLessons: string[]
  completedDrills: string[]
  quizAttempts: Record<string, QuizAttempt>
  isLessonComplete: (id: string) => boolean
  isDrillComplete: (id: string) => boolean
  toggleLesson: (id: string) => void
  toggleDrill: (id: string) => void
  recordQuizAttempt: (quizId: string, score: number, total: number) => void
  bestQuizAttempt: (quizId: string) => QuizAttempt | undefined
  resetProgress: () => void
}

export const ProgressContext = createContext<ProgressContextValue | null>(null)
