import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import App from './App'
import { levels } from './data/levels'
import { lessons } from './data/curriculum'
import { quizzes } from './data/quizzes'
import { renderWithProviders, seedProgress } from './test/renderWithProviders'

function renderApp(route = '/') {
  return renderWithProviders(<App />, { route })
}

const beginnerLessons = lessons.filter((l) => l.levelId === 'beginner')

describe('routing', () => {
  it('renders the dashboard at /', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: /Learn tennis, one level at a time/ })).toBeInTheDocument()
  })

  it('renders the curriculum overview', () => {
    renderApp('/curriculum')
    expect(screen.getByRole('heading', { level: 1, name: 'Curriculum' })).toBeInTheDocument()
  })

  it('renders a level page', () => {
    renderApp('/curriculum/beginner')
    expect(screen.getByRole('heading', { level: 1, name: 'Beginner Curriculum' })).toBeInTheDocument()
  })

  it('renders a lesson page', () => {
    renderApp(`/curriculum/beginner/${beginnerLessons[0].id}`)
    expect(screen.getByRole('heading', { level: 1, name: beginnerLessons[0].title })).toBeInTheDocument()
  })

  it('renders the drills page', () => {
    renderApp('/drills')
    expect(screen.getByRole('heading', { level: 1, name: 'Drills' })).toBeInTheDocument()
  })

  it('renders the quizzes page', () => {
    renderApp('/quizzes')
    expect(screen.getByRole('heading', { level: 1, name: 'Quizzes' })).toBeInTheDocument()
  })

  it('renders a quiz page', () => {
    renderApp(`/quizzes/${quizzes[0].id}`)
    expect(screen.getByRole('heading', { level: 1, name: quizzes[0].title })).toBeInTheDocument()
  })

  it('renders the account page', () => {
    renderApp('/account')
    expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument()
  })

  it('renders a 404 for an unknown route', () => {
    renderApp('/nope')
    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute('href', '/')
  })

  it('redirects an unknown level back to the curriculum', () => {
    renderApp('/curriculum/expert')
    expect(screen.getByRole('heading', { level: 1, name: 'Curriculum' })).toBeInTheDocument()
  })

  it('redirects an unknown quiz back to the quiz list', () => {
    renderApp('/quizzes/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Quizzes' })).toBeInTheDocument()
  })

  it('keeps the nav and footer on every page', () => {
    renderApp('/drills')
    expect(screen.getByRole('link', { name: /Ace Academy/ })).toBeInTheDocument()
    expect(screen.getByText(/practice with purpose/i)).toBeInTheDocument()
  })

  it('navigates from the dashboard into a level', async () => {
    const { user } = renderApp('/')
    await user.click(screen.getByRole('link', { name: /Beginner/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Beginner Curriculum' })).toBeInTheDocument()
  })

  it('navigates from a level into a lesson', async () => {
    const { user } = renderApp('/curriculum/beginner')
    await user.click(screen.getByRole('link', { name: new RegExp(beginnerLessons[0].title) }))
    expect(screen.getByRole('heading', { level: 1, name: beginnerLessons[0].title })).toBeInTheDocument()
  })

  it('navigates from the quiz list into a quiz', async () => {
    const { user } = renderApp('/quizzes')
    await user.click(screen.getByRole('link', { name: new RegExp(quizzes[0].title) }))
    expect(screen.getByRole('heading', { level: 1, name: quizzes[0].title })).toBeInTheDocument()
  })
})

describe('Home', () => {
  it('shows a card for every level', () => {
    renderApp('/')
    for (const level of levels) {
      expect(screen.getByRole('heading', { level: 3, name: level.name })).toBeInTheDocument()
    }
  })

  it('shows zero progress for a new visitor', () => {
    renderApp('/')
    expect(screen.getAllByRole('progressbar', { name: /progress/ })[0]).toHaveAttribute('aria-valuenow', '0')
  })

  it('reflects stored progress in the level card', () => {
    seedProgress({ completedLessons: [beginnerLessons[0].id] })
    renderApp('/')
    expect(screen.getByRole('progressbar', { name: 'Beginner progress' })).not.toHaveAttribute('aria-valuenow', '0')
  })

  it('shows per-category counts', () => {
    renderApp('/')
    const beginnerCount = lessons.filter((l) => l.levelId === 'beginner').length
    expect(screen.getByText(`0/${beginnerCount} lessons`)).toBeInTheDocument()
  })

  it('offers quick links to the main sections', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 3, name: 'Full Curriculum' })).toBeInTheDocument()
  })
})

describe('CurriculumOverview', () => {
  it('lists every level with its description', () => {
    renderApp('/curriculum')
    for (const level of levels) {
      expect(screen.getByRole('heading', { level: 2, name: level.name })).toBeInTheDocument()
      expect(screen.getByText(level.description)).toBeInTheDocument()
    }
  })

  it('links each level to its lesson list', () => {
    renderApp('/curriculum')
    const viewLinks = screen.getAllByRole('link', { name: 'View lessons' })
    expect(viewLinks).toHaveLength(levels.length)
    expect(viewLinks[0]).toHaveAttribute('href', `/curriculum/${levels[0].id}`)
  })

  it('shows the categories present in each level', () => {
    renderApp('/curriculum')
    const beginnerCategories = new Set(beginnerLessons.map((l) => l.category))
    for (const category of beginnerCategories) {
      expect(screen.getAllByText(category).length).toBeGreaterThan(0)
    }
  })
})

describe('LevelLessons', () => {
  it('groups lessons under their category headings', () => {
    renderApp('/curriculum/beginner')
    const categories = new Set(beginnerLessons.map((l) => l.category))
    for (const category of categories) {
      expect(screen.getByRole('heading', { level: 2, name: category })).toBeInTheDocument()
    }
  })

  it('lists every lesson in the level', () => {
    renderApp('/curriculum/beginner')
    for (const lesson of beginnerLessons) {
      expect(screen.getByRole('heading', { level: 3, name: lesson.title })).toBeInTheDocument()
    }
  })

  it('does not list lessons from other levels', () => {
    renderApp('/curriculum/beginner')
    const advanced = lessons.find((l) => l.levelId === 'advanced')!
    expect(screen.queryByRole('heading', { level: 3, name: advanced.title })).not.toBeInTheDocument()
  })

  it('offers tabs to the other levels', () => {
    renderApp('/curriculum/beginner')
    for (const level of levels) {
      expect(screen.getByRole('link', { name: level.name })).toHaveAttribute('href', `/curriculum/${level.id}`)
    }
  })

  it('marks completed lessons with a done indicator', () => {
    seedProgress({ completedLessons: [beginnerLessons[0].id] })
    const { container } = renderApp('/curriculum/beginner')
    expect(container.querySelectorAll('.check-dot.done')).toHaveLength(1)
  })
})

describe('Quizzes', () => {
  it('groups quizzes by level', () => {
    renderApp('/quizzes')
    for (const level of levels) {
      expect(screen.getByRole('heading', { level: 2, name: level.name })).toBeInTheDocument()
    }
  })

  it('shows the question count for each quiz', () => {
    renderApp('/quizzes')
    expect(screen.getAllByText(`${quizzes[0].questions.length} questions`).length).toBeGreaterThan(0)
  })

  it('hides the best score before any attempt', () => {
    renderApp('/quizzes')
    expect(screen.queryByText(/^Best:/)).not.toBeInTheDocument()
  })

  it('shows the best score once recorded', () => {
    seedProgress({ quizAttempts: { [quizzes[0].id]: { score: 3, total: 5, date: '2026-01-01T00:00:00Z' } } })
    renderApp('/quizzes')
    expect(screen.getByText('Best: 3/5')).toBeInTheDocument()
  })
})
