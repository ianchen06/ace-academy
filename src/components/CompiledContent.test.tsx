import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { renderWithProviders } from '../test/renderWithProviders'
import { CompiledContent } from './CompiledContent'

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

function renderContent(html: string) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/curriculum/beginner/b-grip"
        element={
          <>
            <CompiledContent html={html} className="lesson-content" />
            <Location />
          </>
        }
      />
      <Route path="/curriculum/beginner/b-forehand" element={<Location />} />
    </Routes>,
    { route: '/curriculum/beginner/b-grip' },
  )
}

const INTERNAL = '<p>See the <a href="/curriculum/beginner/b-forehand">forehand</a>.</p>'

describe('CompiledContent', () => {
  it('renders the compiled html as markup', () => {
    renderContent('<p>Some <strong>prose</strong>.</p>')
    expect(screen.getByText('prose').tagName).toBe('STRONG')
  })

  it('applies the class name it is given', () => {
    const { container } = renderContent('<p>x</p>')
    expect(container.querySelector('.lesson-content')).toBeInTheDocument()
  })

  // A cross-link between lessons is the payoff of authoring in Markdown, but an
  // injected <a href> is a plain browser navigation: it would reload the whole
  // SPA, discarding React state and re-downloading the bundle. Content links
  // have to go through the router like every <Link> in the app does.
  it('navigates internal links through the router', async () => {
    const { user } = renderContent(INTERNAL)
    await user.click(screen.getByRole('link', { name: 'forehand' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/curriculum/beginner/b-forehand')
  })

  it('leaves external links to the browser', () => {
    renderContent('<p><a href="https://itftennis.com/rules">the rules</a></p>')
    const link = screen.getByRole('link', { name: 'the rules' })
    // jsdom refuses to navigate, so the assertion is that we did not intercept:
    // the click is left with its default action intact.
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(screen.getByTestId('location')).toHaveTextContent('/curriculum/beginner/b-grip')
  })

  // Modifier clicks mean "open somewhere else". Swallowing them would break
  // opening a linked lesson in a new tab.
  it('leaves modifier-clicked internal links to the browser', () => {
    renderContent(INTERNAL)
    const link = screen.getByRole('link', { name: 'forehand' })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true })
    link.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(screen.getByTestId('location')).toHaveTextContent('/curriculum/beginner/b-grip')
  })

  it('leaves links that opt into a new tab to the browser', () => {
    renderContent('<p><a href="/drills" target="_blank">drills</a></p>')
    const link = screen.getByRole('link', { name: 'drills' })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores clicks that are not on a link', () => {
    renderContent('<p>Just prose.</p>')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    screen.getByText('Just prose.').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
