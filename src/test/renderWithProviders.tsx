import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ProgressProvider } from '../context/ProgressContext'

const STORAGE_KEY = 'tennis-coach-progress'

export interface StoredProgress {
  completedLessons?: string[]
  completedDrills?: string[]
  quizAttempts?: Record<string, { score: number; total: number; date: string }>
}

/** Seed the localStorage the ProgressProvider reads on mount. Call before rendering. */
export function seedProgress(progress: StoredProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function readStoredProgress(): StoredProgress {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
}

export interface RenderOptions {
  /** Initial URL. Defaults to '/'. */
  route?: string
  /**
   * Route pattern to mount `ui` at, e.g. '/quizzes/:quizId'. When omitted the
   * component renders directly without a route match (fine for param-less pages).
   */
  path?: string
}

/**
 * Render a component inside the same provider stack `main.tsx` uses, so tests
 * exercise real routing, auth and progress rather than hand-stubbed context.
 */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const { route = '/', path } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <ProgressProvider>
            {path ? <Routes><Route path={path} element={children} /></Routes> : children}
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    )
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper }),
  }
}
