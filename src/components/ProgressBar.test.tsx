import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes the percentage to assistive tech', () => {
    render(<ProgressBar percent={42} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders the percentage as text', () => {
    render(<ProgressBar percent={42} />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('clamps values above 100', () => {
    render(<ProgressBar percent={150} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('clamps negative values to zero', () => {
    render(<ProgressBar percent={-20} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('applies the clamped width to the fill element', () => {
    const { container } = render(<ProgressBar percent={150} />)
    expect(container.querySelector('.progress-bar-fill')).toHaveStyle({ width: '100%' })
  })

  it('applies the supplied colour to the fill element', () => {
    const { container } = render(<ProgressBar percent={50} color="#4caf7d" />)
    expect(container.querySelector('.progress-bar-fill')).toHaveStyle({ backgroundColor: '#4caf7d' })
  })

  it('uses the label as its accessible name when given one', () => {
    render(<ProgressBar percent={10} label="Beginner progress" />)
    expect(screen.getByRole('progressbar', { name: 'Beginner progress' })).toBeInTheDocument()
  })
})
