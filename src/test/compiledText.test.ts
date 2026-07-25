import { describe, expect, it } from 'vitest'
import { renderedBlocks, renderedParagraphs, renderedText } from './compiledText'

/**
 * Content is authored with semantic line breaks — one sentence per source line
 * — so a typo fix is a one-line diff instead of a rewritten paragraph. Those
 * breaks survive into the compiled HTML as newlines inside the `<p>`, where the
 * browser collapses them to a single space and the reader never sees them.
 *
 * These helpers exist to read back "the words a reader actually sees", so they
 * have to collapse that whitespace too. If they hand back the raw `textContent`
 * instead, every `getByText(paragraph)` assertion in the component tests breaks:
 * Testing Library normalises the element's text but not the string it is
 * matched against, so `"One.\nTwo."` never matches a paragraph reading
 * `"One. Two."`.
 */
const SOFT_WRAPPED = '<p>One sentence.\nA second sentence.</p>'

describe('compiledText helpers', () => {
  it('reads a soft-wrapped paragraph as the reader sees it, on one line', () => {
    expect(renderedParagraphs(SOFT_WRAPPED)).toEqual(['One sentence. A second sentence.'])
  })

  it('collapses soft wrapping in whole-body text', () => {
    expect(renderedText(SOFT_WRAPPED)).toBe('One sentence. A second sentence.')
  })

  it('collapses soft wrapping in list items as well as paragraphs', () => {
    const html = '<ol>\n<li>Step one.\nStill step one.</li>\n</ol>'
    expect(renderedBlocks(html)).toEqual(['Step one. Still step one.'])
  })

  it('trims the leading and trailing whitespace a block-level tag leaves behind', () => {
    expect(renderedParagraphs('<p>\n  Indented prose.\n</p>')).toEqual(['Indented prose.'])
  })

  it('leaves single-spaced prose untouched', () => {
    expect(renderedText('<p>Already on one line.</p>')).toBe('Already on one line.')
  })
})
