/**
 * Reads the prose back out of compiled content.
 *
 * Lesson and drill bodies used to be `string[]`s that tests could inspect
 * directly; they are now build-time HTML. These helpers keep the content
 * invariants in `data.test.ts` asserting on the words a reader actually sees
 * rather than on markup — so they survive content being rewritten with
 * headings or lists.
 */
function parse(html: string | undefined): HTMLDivElement {
  const host = document.createElement('div')
  host.innerHTML = html ?? ''
  return host
}

/**
 * Collapses runs of whitespace the way a browser lays them out, so these
 * helpers report the words on screen rather than the shape of the source.
 * Content is authored with semantic line breaks — one sentence per line, so a
 * typo fix is a one-line diff — and markdown-it carries those breaks into the
 * `<p>` as newlines. Handing back the raw `textContent` would make every
 * `getByText(paragraph)` assertion fail against prose the reader sees as
 * perfectly ordinary single-spaced sentences.
 */
function asRead(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** The text of every element matching `selector`, in document order. */
export function renderedElements(html: string | undefined, selector: string): string[] {
  return [...parse(html).querySelectorAll(selector)].map((el) => asRead(el.textContent))
}

/** Every prose block — paragraphs and list items alike — as plain text. */
export function renderedBlocks(html: string | undefined): string[] {
  return renderedElements(html, 'p, li')
}

/** Every in-app link target in the content, as an absolute app path. */
export function internalLinks(html: string | undefined): string[] {
  return [...parse(html).querySelectorAll('a[href^="/"]')].map((el) => el.getAttribute('href')!)
}

/** Just the paragraphs, for assertions about how a page is rendered. */
export function renderedParagraphs(html: string | undefined): string[] {
  return renderedElements(html, 'p')
}

/** The whole body as one searchable string. */
export function renderedText(html: string | undefined): string {
  return asRead(parse(html).textContent)
}
