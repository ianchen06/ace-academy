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

/** Every prose block — paragraphs and list items alike — as plain text. */
export function renderedBlocks(html: string | undefined): string[] {
  return [...parse(html).querySelectorAll('p, li')].map((el) => el.textContent ?? '')
}

/** Just the paragraphs, for assertions about how a page is rendered. */
export function renderedParagraphs(html: string | undefined): string[] {
  return [...parse(html).querySelectorAll('p')].map((el) => el.textContent ?? '')
}

/** The whole body as one searchable string. */
export function renderedText(html: string | undefined): string {
  return parse(html).textContent ?? ''
}
