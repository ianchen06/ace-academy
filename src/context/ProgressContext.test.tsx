import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createSupabaseMock, makeSession, type ProgressRow } from '../test/supabaseMock'
import { readStoredProgress, seedProgress } from '../test/renderWithProviders'

// The provider reads `supabase` as a module binding, so the mock exposes getters
// that each test can repoint before rendering.
const mockState: { client: unknown; configured: boolean } = { client: null, configured: false }

vi.mock('../lib/supabaseClient', () => ({
  get supabase() {
    return mockState.client
  },
  get isSupabaseConfigured() {
    return mockState.configured
  },
}))

const { ProgressProvider } = await import('./ProgressContext')
const { AuthProvider } = await import('./AuthContext')
const { useProgress } = await import('../hooks/useProgress')

function Probe() {
  const {
    completedLessons,
    completedDrills,
    quizAttempts,
    isLessonComplete,
    isDrillComplete,
    toggleLesson,
    toggleDrill,
    recordQuizAttempt,
    bestQuizAttempt,
    resetProgress,
  } = useProgress()

  const best = bestQuizAttempt('quiz-1')

  return (
    <div>
      <span data-testid="lessons">{completedLessons.join(',')}</span>
      <span data-testid="drills">{completedDrills.join(',')}</span>
      <span data-testid="attempt-count">{Object.keys(quizAttempts).length}</span>
      <span data-testid="lesson-1-complete">{String(isLessonComplete('lesson-1'))}</span>
      <span data-testid="drill-1-complete">{String(isDrillComplete('drill-1'))}</span>
      <span data-testid="best">{best ? `${best.score}/${best.total}` : 'none'}</span>
      <button onClick={() => toggleLesson('lesson-1')}>toggle lesson</button>
      <button onClick={() => toggleDrill('drill-1')}>toggle drill</button>
      <button onClick={() => recordQuizAttempt('quiz-1', 3, 5)}>score 3</button>
      <button onClick={() => recordQuizAttempt('quiz-1', 5, 5)}>score 5</button>
      <button onClick={() => recordQuizAttempt('quiz-1', 1, 5)}>score 1</button>
      <button onClick={resetProgress}>reset</button>
    </div>
  )
}

function renderProbe(children: ReactNode = <Probe />) {
  return {
    user: userEvent.setup(),
    ...render(
      <AuthProvider>
        <ProgressProvider>{children}</ProgressProvider>
      </AuthProvider>,
    ),
  }
}

beforeEach(() => {
  mockState.client = null
  mockState.configured = false
})

describe('ProgressProvider — local only', () => {
  it('starts empty when there is nothing stored', () => {
    renderProbe()
    expect(screen.getByTestId('lessons')).toHaveTextContent('')
    expect(screen.getByTestId('best')).toHaveTextContent('none')
  })

  it('rehydrates progress from localStorage', () => {
    seedProgress({ completedLessons: ['lesson-1'], completedDrills: ['drill-1'] })
    renderProbe()
    expect(screen.getByTestId('lesson-1-complete')).toHaveTextContent('true')
    expect(screen.getByTestId('drill-1-complete')).toHaveTextContent('true')
  })

  it('falls back to empty state when stored JSON is corrupt', () => {
    localStorage.setItem('tennis-coach-progress', '{not json')
    renderProbe()
    expect(screen.getByTestId('lessons')).toHaveTextContent('')
  })

  it('tolerates a stored object missing individual keys', () => {
    localStorage.setItem('tennis-coach-progress', JSON.stringify({ completedLessons: ['lesson-1'] }))
    renderProbe()
    expect(screen.getByTestId('lesson-1-complete')).toHaveTextContent('true')
    expect(screen.getByTestId('attempt-count')).toHaveTextContent('0')
  })

  it('toggles a lesson on and back off', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))
    expect(screen.getByTestId('lesson-1-complete')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))
    expect(screen.getByTestId('lesson-1-complete')).toHaveTextContent('false')
  })

  it('toggles a drill on and back off', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'toggle drill' }))
    expect(screen.getByTestId('drill-1-complete')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'toggle drill' }))
    expect(screen.getByTestId('drill-1-complete')).toHaveTextContent('false')
  })

  it('persists every change to localStorage', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))
    await waitFor(() => expect(readStoredProgress().completedLessons).toEqual(['lesson-1']))
  })

  it('records a quiz attempt', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'score 3' }))
    expect(screen.getByTestId('best')).toHaveTextContent('3/5')
  })

  it('keeps the higher score when a later attempt is better', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'score 3' }))
    await user.click(screen.getByRole('button', { name: 'score 5' }))
    expect(screen.getByTestId('best')).toHaveTextContent('5/5')
  })

  it('keeps the earlier score when a later attempt is worse', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'score 3' }))
    await user.click(screen.getByRole('button', { name: 'score 1' }))
    expect(screen.getByTestId('best')).toHaveTextContent('3/5')
  })

  it('keeps the earlier score when a later attempt ties it', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'score 3' }))
    const first = readStoredProgress().quizAttempts?.['quiz-1']
    await user.click(screen.getByRole('button', { name: 'score 3' }))
    await waitFor(() => expect(readStoredProgress().quizAttempts?.['quiz-1']).toEqual(first))
  })

  it('stamps attempts with an ISO date', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'score 3' }))
    await waitFor(() => {
      const date = readStoredProgress().quizAttempts?.['quiz-1'].date
      expect(date).toBeDefined()
      expect(Number.isNaN(Date.parse(date!))).toBe(false)
    })
  })

  it('clears everything on reset', async () => {
    seedProgress({ completedLessons: ['lesson-1'], completedDrills: ['drill-1'] })
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'reset' }))

    expect(screen.getByTestId('lessons')).toHaveTextContent('')
    expect(screen.getByTestId('drills')).toHaveTextContent('')
    await waitFor(() => expect(readStoredProgress().completedLessons).toEqual([]))
  })

  it('throws a helpful error when useProgress is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/ProgressProvider/i)
    spy.mockRestore()
  })
})

describe('ProgressProvider — signed in', () => {
  const cloudRow: ProgressRow = {
    completed_lessons: ['cloud-lesson'],
    completed_drills: ['cloud-drill'],
    quiz_attempts: { 'quiz-1': { score: 2, total: 5, date: '2026-01-01T00:00:00Z' } },
  }

  function signedIn(options: Parameters<typeof createSupabaseMock>[0] = {}) {
    const mock = createSupabaseMock({ session: makeSession(), ...options })
    mockState.client = mock.client
    mockState.configured = true
    return mock
  }

  it('unions local and cloud completions', async () => {
    seedProgress({ completedLessons: ['local-lesson'], completedDrills: ['local-drill'] })
    signedIn({ progressRow: cloudRow })
    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('lessons').textContent?.split(',').sort()).toEqual(['cloud-lesson', 'local-lesson'])
    })
    expect(screen.getByTestId('drills').textContent?.split(',').sort()).toEqual(['cloud-drill', 'local-drill'])
  })

  it('does not duplicate an id present both locally and in the cloud', async () => {
    seedProgress({ completedLessons: ['cloud-lesson'] })
    signedIn({ progressRow: cloudRow })
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('lessons')).toHaveTextContent('cloud-lesson'))
    expect(screen.getByTestId('lessons').textContent).toBe('cloud-lesson')
  })

  it('keeps the higher quiz score when merging', async () => {
    seedProgress({ quizAttempts: { 'quiz-1': { score: 4, total: 5, date: '2026-02-01T00:00:00Z' } } })
    signedIn({ progressRow: cloudRow })
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('best')).toHaveTextContent('4/5'))
  })

  it('keeps the cloud quiz score when it beats the local one', async () => {
    seedProgress({ quizAttempts: { 'quiz-1': { score: 1, total: 5, date: '2026-02-01T00:00:00Z' } } })
    signedIn({ progressRow: cloudRow })
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('best')).toHaveTextContent('2/5'))
  })

  it('keeps local state when the user has no cloud row yet', async () => {
    seedProgress({ completedLessons: ['local-lesson'] })
    const mock = signedIn({ progressRow: null })
    renderProbe()

    await waitFor(() => expect(mock.spies.maybeSingle).toHaveBeenCalled())
    expect(screen.getByTestId('lessons')).toHaveTextContent('local-lesson')
  })

  it('pushes the merged state back to the cloud after syncing', async () => {
    seedProgress({ completedLessons: ['local-lesson'] })
    const mock = signedIn({ progressRow: cloudRow })
    renderProbe()

    await waitFor(() => expect(mock.upsertRequests).toHaveLength(1))
    const payload = mock.upsertRequests[0] as { user_id: string; completed_lessons: string[] }
    expect(payload.user_id).toBe('user-1')
    expect([...payload.completed_lessons].sort()).toEqual(['cloud-lesson', 'local-lesson'])
  })

  it('pushes later mutations to the cloud', async () => {
    const mock = signedIn({ progressRow: cloudRow })
    const { user } = renderProbe()

    await waitFor(() => expect(mock.upsertRequests).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))

    await waitFor(() => expect(mock.upsertRequests).toHaveLength(2))
    expect((mock.upsertRequests[1] as { completed_lessons: string[] }).completed_lessons).toContain('lesson-1')
  })

  it('queries only the signed-in user’s row', async () => {
    const mock = signedIn({ progressRow: cloudRow })
    renderProbe()

    await waitFor(() => expect(mock.spies.eq).toHaveBeenCalledWith('user_id', 'user-1'))
    expect(mock.spies.from).toHaveBeenCalledWith('progress')
  })

  it('keeps local progress usable when the cloud read fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    seedProgress({ completedLessons: ['local-lesson'] })
    signedIn({ selectError: { message: 'network down' } })
    const { user } = renderProbe()

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(screen.getByTestId('lessons')).toHaveTextContent('local-lesson')

    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))
    expect(screen.getByTestId('lesson-1-complete')).toHaveTextContent('true')
    spy.mockRestore()
  })

  // Regression: a failed cloud read must not mark the user as synced, or the
  // next local edit would upsert local-only state over a cloud row that was
  // never merged in, destroying progress made on another device.
  it('never overwrites the cloud row after a failed read', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    seedProgress({ completedLessons: ['local-lesson'] })
    const mock = signedIn({ selectError: { message: 'network down' } })
    const { user } = renderProbe()

    await waitFor(() => expect(spy).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))

    // The edit is kept locally, but nothing is pushed over the unread row.
    expect(screen.getByTestId('lesson-1-complete')).toHaveTextContent('true')
    expect(mock.upsertRequests).toEqual([])
    spy.mockRestore()
  })

  it('syncs only once per user', async () => {
    const mock = signedIn({ progressRow: cloudRow })
    const { user } = renderProbe()

    await waitFor(() => expect(mock.spies.maybeSingle).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))
    expect(mock.spies.maybeSingle).toHaveBeenCalledTimes(1)
  })
})

describe('ProgressProvider — configured but signed out', () => {
  it('never touches the network', async () => {
    const mock = createSupabaseMock({ session: null })
    mockState.client = mock.client
    mockState.configured = true

    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'toggle lesson' }))

    expect(mock.spies.from).not.toHaveBeenCalled()
    expect(screen.getByTestId('lesson-1-complete')).toHaveTextContent('true')
  })
})
