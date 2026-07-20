import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { lessons } from '../data/curriculum'
import { drills } from '../data/drills'
import { readStoredProgress, renderWithProviders, seedProgress } from '../test/renderWithProviders'
import { LessonDetail } from './LessonDetail'

const beginnerLessons = lessons.filter((l) => l.levelId === 'beginner')
const first = beginnerLessons[0]
const second = beginnerLessons[1]
const last = beginnerLessons[beginnerLessons.length - 1]
const withDrills = lessons.find((l) => (l.drillIds?.length ?? 0) > 0)!

function renderLesson(levelId: string, lessonId: string) {
  return renderWithProviders(<LessonDetail />, {
    route: `/curriculum/${levelId}/${lessonId}`,
    path: '/curriculum/:levelId/:lessonId',
  })
}

describe('LessonDetail', () => {
  it('renders the lesson title, category and summary', () => {
    renderLesson('beginner', first.id)
    expect(screen.getByRole('heading', { level: 1, name: first.title })).toBeInTheDocument()
    expect(screen.getByText(first.category)).toBeInTheDocument()
    expect(screen.getByText(first.summary)).toBeInTheDocument()
  })

  it('renders every content paragraph', () => {
    renderLesson('beginner', first.id)
    for (const para of first.content) {
      expect(screen.getByText(para)).toBeInTheDocument()
    }
  })

  it('renders the coaching tips', () => {
    renderLesson('beginner', first.id)
    expect(screen.getByRole('heading', { name: 'Coaching tips' })).toBeInTheDocument()
    for (const tip of first.tips) {
      expect(screen.getByText(tip)).toBeInTheDocument()
    }
  })

  it('links the related drills', () => {
    renderLesson(withDrills.levelId, withDrills.id)
    const related = drills.filter((d) => withDrills.drillIds?.includes(d.id))
    expect(screen.getByRole('heading', { name: 'Practice this with' })).toBeInTheDocument()
    for (const drill of related) {
      expect(screen.getByRole('heading', { name: drill.title })).toBeInTheDocument()
    }
  })

  it('redirects when the lesson id is unknown', () => {
    renderLesson('beginner', 'no-such-lesson')
    expect(screen.queryByRole('heading', { level: 1, name: first.title })).not.toBeInTheDocument()
  })

  it('redirects when the level id is unknown', () => {
    renderLesson('no-such-level', first.id)
    expect(screen.queryByRole('heading', { level: 1, name: first.title })).not.toBeInTheDocument()
  })

  it('redirects when the lesson exists but belongs to another level', () => {
    const advanced = lessons.find((l) => l.levelId === 'advanced')!
    renderLesson('beginner', advanced.id)
    expect(screen.queryByRole('heading', { level: 1, name: advanced.title })).not.toBeInTheDocument()
  })

  it('marks a lesson complete and stores it', async () => {
    const { user } = renderLesson('beginner', first.id)
    await user.click(screen.getByRole('button', { name: 'Mark as complete' }))

    expect(screen.getByRole('button', { name: /Marked complete/ })).toBeInTheDocument()
    expect(readStoredProgress().completedLessons).toContain(first.id)
  })

  it('undoes a completion', async () => {
    seedProgress({ completedLessons: [first.id] })
    const { user } = renderLesson('beginner', first.id)
    await user.click(screen.getByRole('button', { name: /Marked complete/ }))

    expect(screen.getByRole('button', { name: 'Mark as complete' })).toBeInTheDocument()
    expect(readStoredProgress().completedLessons).not.toContain(first.id)
  })

  it('reflects a stored completion on first render', () => {
    seedProgress({ completedLessons: [first.id] })
    renderLesson('beginner', first.id)
    expect(screen.getByRole('button', { name: /Marked complete/ })).toBeInTheDocument()
  })

  it('offers breadcrumbs back to the curriculum and level', () => {
    renderLesson('beginner', first.id)
    expect(screen.getByRole('link', { name: 'Curriculum' })).toHaveAttribute('href', '/curriculum')
    expect(screen.getByRole('link', { name: 'Beginner' })).toHaveAttribute('href', '/curriculum/beginner')
  })

  it('links to the next lesson but not a previous one on the first lesson', () => {
    renderLesson('beginner', first.id)
    expect(screen.getByRole('link', { name: `${second.title} →` })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^←/ })).not.toBeInTheDocument()
  })

  it('links to the previous lesson but not a next one on the last lesson', () => {
    renderLesson('beginner', last.id)
    expect(screen.getByRole('link', { name: new RegExp('^←') })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /→$/ })).not.toBeInTheDocument()
  })

  it('links both ways in the middle of a level', () => {
    renderLesson('beginner', second.id)
    expect(screen.getByRole('link', { name: `← ${first.title}` })).toHaveAttribute(
      'href',
      `/curriculum/beginner/${first.id}`,
    )
    expect(screen.getByRole('link', { name: `${beginnerLessons[2].title} →` })).toBeInTheDocument()
  })
})
