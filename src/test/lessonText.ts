import type { Lesson } from '../data/types'

/**
 * Reads the prose back out of a compiled lesson.
 *
 * Lesson content used to be a `string[]` of paragraphs that tests could inspect
 * directly; it is now build-time HTML. These helpers keep the content invariants
 * in `data.test.ts` asserting on the words a reader actually sees, rather than on
 * markup — so they survive a lesson being rewritten with headings or lists.
 */
function parse(lesson: Lesson | undefined): HTMLDivElement {
  const host = document.createElement('div')
  host.innerHTML = lesson?.html ?? ''
  return host
}

/** Every prose block — paragraphs and list items alike — as plain text. */
export function lessonBlocks(lesson: Lesson | undefined): string[] {
  return [...parse(lesson).querySelectorAll('p, li')].map((el) => el.textContent ?? '')
}

/** Just the paragraphs, for assertions about how the page is rendered. */
export function lessonParagraphs(lesson: Lesson | undefined): string[] {
  return [...parse(lesson).querySelectorAll('p')].map((el) => el.textContent ?? '')
}

/** The whole lesson as one searchable string. */
export function lessonText(lesson: Lesson | undefined): string {
  return parse(lesson).textContent ?? ''
}
