import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { ProgressContext, type ProgressContextValue, type QuizAttempt } from './progressContextDef'

const STORAGE_KEY = 'tennis-coach-progress'

interface ProgressState {
  completedLessons: string[]
  completedDrills: string[]
  quizAttempts: Record<string, QuizAttempt>
}

interface CloudProgressRow {
  completed_lessons: string[]
  completed_drills: string[]
  quiz_attempts: Record<string, QuizAttempt>
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

function mergeProgress(local: ProgressState, cloud: CloudProgressRow | null): ProgressState {
  if (!cloud) return local

  const completedLessons = Array.from(new Set([...local.completedLessons, ...cloud.completed_lessons]))
  const completedDrills = Array.from(new Set([...local.completedDrills, ...cloud.completed_drills]))

  const quizAttempts: Record<string, QuizAttempt> = { ...cloud.quiz_attempts }
  for (const [quizId, attempt] of Object.entries(local.quizAttempts)) {
    const existing = quizAttempts[quizId]
    if (!existing || attempt.score > existing.score) {
      quizAttempts[quizId] = attempt
    }
  }

  return { completedLessons, completedDrills, quizAttempts }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<ProgressState>(loadState)
  const syncedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const pushToCloud = useCallback(
    (next: ProgressState, userId: string) => {
      if (!supabase) return
      void supabase.from('progress').upsert({
        user_id: userId,
        completed_lessons: next.completedLessons,
        completed_drills: next.completedDrills,
        quiz_attempts: next.quizAttempts,
      })
    },
    [],
  )

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return
    if (syncedUserIdRef.current === user.id) return

    let cancelled = false

    async function sync() {
      if (!supabase || !user) return
      const { data, error } = await supabase
        .from('progress')
        .select('completed_lessons, completed_drills, quiz_attempts')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        console.error('Failed to load cloud progress', error)
        syncedUserIdRef.current = user.id
        return
      }

      setState((prev) => {
        const merged = mergeProgress(prev, data)
        pushToCloud(merged, user.id)
        return merged
      })
      syncedUserIdRef.current = user.id
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [user, pushToCloud])

  const mutate = useCallback(
    (updater: (prev: ProgressState) => ProgressState) => {
      setState((prev) => {
        const next = updater(prev)
        if (user && syncedUserIdRef.current === user.id) {
          pushToCloud(next, user.id)
        }
        return next
      })
    },
    [user, pushToCloud],
  )

  const toggleLesson = useCallback(
    (id: string) => {
      mutate((prev) => ({
        ...prev,
        completedLessons: prev.completedLessons.includes(id)
          ? prev.completedLessons.filter((l) => l !== id)
          : [...prev.completedLessons, id],
      }))
    },
    [mutate],
  )

  const toggleDrill = useCallback(
    (id: string) => {
      mutate((prev) => ({
        ...prev,
        completedDrills: prev.completedDrills.includes(id)
          ? prev.completedDrills.filter((d) => d !== id)
          : [...prev.completedDrills, id],
      }))
    },
    [mutate],
  )

  const recordQuizAttempt = useCallback(
    (quizId: string, score: number, total: number) => {
      mutate((prev) => {
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
    },
    [mutate],
  )

  const resetProgress = useCallback(() => {
    setState(defaultState)
  }, [])

  const value: ProgressContextValue = {
    completedLessons: state.completedLessons,
    completedDrills: state.completedDrills,
    quizAttempts: state.quizAttempts,
    isLessonComplete: (id: string) => state.completedLessons.includes(id),
    isDrillComplete: (id: string) => state.completedDrills.includes(id),
    toggleLesson,
    toggleDrill,
    recordQuizAttempt,
    bestQuizAttempt: (quizId: string) => state.quizAttempts[quizId],
    resetProgress,
  }

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}
