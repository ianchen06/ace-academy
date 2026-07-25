import { describe, expect, it } from 'vitest'
import { compileDrill } from './compileDrill'

const PATH = '/repo/content/drills/beginner/010-b-drill-grip-shadow.md'

const VALID = `skill: Fundamentals
title: Grip Shadow Swings
duration: 5 minutes
equipment: Racquet only
goal: Build muscle memory for switching grips.`

const STEPS = '1. Find the Eastern forehand grip.\n2. Take 10 slow shadow swings.'

function source(frontmatter: string, body = STEPS) {
  return `---\n${frontmatter}\n---\n\n${body}\n`
}

describe('compileDrill', () => {
  it('derives id and level from the file path', () => {
    const drill = compileDrill(source(VALID), PATH)
    expect(drill.id).toBe('b-drill-grip-shadow')
    expect(drill.levelId).toBe('beginner')
  })

  it('carries the structured fields through', () => {
    const drill = compileDrill(source(VALID), PATH)
    expect(drill.skill).toBe('Fundamentals')
    expect(drill.title).toBe('Grip Shadow Swings')
    expect(drill.duration).toBe('5 minutes')
    expect(drill.equipment).toBe('Racquet only')
    expect(drill.goal).toBe('Build muscle memory for switching grips.')
  })

  it('renders the steps as an ordered list', () => {
    const { html } = compileDrill(source(VALID), PATH)
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>Find the Eastern forehand grip.</li>')
  })

  it('allows formatting inside a step, which the string[] model could not express', () => {
    const { html } = compileDrill(source(VALID, '1. Hit **ten** in a row.'), PATH)
    expect(html).toContain('<strong>ten</strong>')
  })

  for (const field of ['skill', 'title', 'duration', 'equipment', 'goal']) {
    it(`rejects a missing ${field}`, () => {
      const without = VALID.split('\n')
        .filter((line) => !line.startsWith(`${field}:`))
        .join('\n')
      expect(() => compileDrill(source(without), PATH)).toThrow(new RegExp(field))
    })
  }

  it('rejects an unknown frontmatter key', () => {
    expect(() => compileDrill(source(`${VALID}\nequipmnet: Racquet`), PATH)).toThrow(/equipmnet/)
  })

  // A drill is a numbered routine you run on court. This is the invariant that
  // `instructions.length > 0` used to carry: prose alone is not a drill.
  it('rejects a body with no numbered steps', () => {
    const prose = 'Just swing the racquet around a bit and see how it feels.'
    expect(() => compileDrill(source(VALID, prose), PATH)).toThrow(/numbered steps/)
  })

  it('allows a lead-in paragraph before the steps', () => {
    const body = `Set up on the baseline first.\n\n${STEPS}`
    const { html } = compileDrill(source(VALID, body), PATH)
    expect(html).toContain('<p>Set up on the baseline first.</p>')
    expect(html).toContain('<ol>')
  })

  it('names the offending file in its errors', () => {
    expect(() => compileDrill(source('title: Only a title'), PATH)).toThrow(
      /010-b-drill-grip-shadow\.md/,
    )
  })
})
