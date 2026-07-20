# Ace Academy — Usability & Content Backlog

**Status:** Draft for product review
**Author:** Usability review (hands-on walkthrough of the deployed build)
**Date:** 2026-07-20
**Related branch:** `claude/ace-academy-usability-bk6shu`

## Purpose & how to use this document

This backlog turns the findings from a hands-on usability review into implementation-ready
user stories. It is written for a two-stage workflow:

1. **Product managers** review, refine, re-prioritise, and accept/park each story. Every story
   has a **Definition of Ready** checklist to help decide whether it's groomed enough to build.
2. **Software engineers** implement accepted stories one at a time. Every story lists concrete
   **acceptance criteria** and **technical notes** (affected modules) to shorten spin-up.

Nothing here is a code change yet — these are proposals. Stories are grouped into **epics** and
tagged with a **priority** and a rough **effort** estimate for triage.

### Legend

| Field | Values |
| --- | --- |
| **Priority** | `P0` must-fix (correctness/accessibility defect) · `P1` high value · `P2` valuable · `P3` polish |
| **Effort** | `S` ≈ ≤1 day · `M` ≈ 2–4 days · `L` ≈ 1+ week / needs design |
| **Type** | `Bug` · `Feature` · `Content` · `Tech-debt` |

### Personas (referenced by the stories)

- **Bea — Absolute Beginner.** Has never played. Learning grip, stance, and rules from zero.
  Needs to *see* technique, not just read about it, and always know what to do next.
- **Raj — Returning Learner.** A few sessions in, switches between phone and laptop. Wants to
  pick up where he left off and trust that his progress is safe.
- **Pat — Courtside Practicer.** Opens the app on their phone at the court to run drills. Wants
  fast access to a concrete practice plan, hands busy, screen glanceable.
- **Sam — Assistive-Tech User.** Uses a screen reader and/or has colour-vision deficiency.
  Needs information conveyed by more than colour and full keyboard operability.

### Definition of Ready (PM → Eng handoff)

A story is ready to build when: persona & value are clear, acceptance criteria are testable,
any content or visual assets are attached/specified, dependencies are resolved, and the effort
estimate is agreed.

### Definition of Done (applies to every story)

Per the repo's working agreement (`CLAUDE.md`), development is **test-driven**:

- A failing test is written first and fails for the right reason (red → green → refactor).
- Unit/component coverage stays **≥ 90%** (lines, branches, functions, statements).
- New user journeys get **Playwright e2e** coverage; use `renderWithProviders`, `seedProgress()`,
  and `readStoredProgress()` rather than hand-stubbing context.
- `npm run verify` (typecheck → lint → unit+coverage → e2e) passes before merge.
- No regression to the sync invariants documented in `CLAUDE.md`.

---

## EPIC A — Accessibility & Correctness

> Small, high-confidence fixes that remove defects blocking some users entirely. Recommended
> first sprint.

### US-A1 — Quiz results must not rely on colour alone
**Type:** Bug · **Priority:** P0 · **Effort:** S

> **As** Sam (assistive-tech / colour-vision-deficient user),
> **I want** each graded quiz answer to show a text/icon indicator of correct vs. incorrect,
> **so that** I can tell how I did without depending on green/red colour.

**Context:** After submitting a quiz, correct answers get a green highlight and the user's wrong
pick gets a red highlight — but there is no icon or text label. This fails WCAG 2.1 SC 1.4.1
(Use of Colour). Colour-blind users cannot distinguish the states.

**Acceptance criteria**
- Each option in a graded quiz shows a non-colour indicator: a ✓ / ✗ icon **and** an accessible
  label (e.g. "Correct answer", "Your answer — incorrect").
- The correct answer and the user's selection are both programmatically identifiable to a screen
  reader (e.g. `aria-label`/visually-hidden text), not just visually.
- Indicators pass a greyscale check (screenshot in greyscale is still unambiguous).
- Colour contrast of text/borders meets WCAG AA.

**Technical notes:** `src/pages/QuizPlay.tsx` (graded state rendering). Add a unit test asserting
the label/icon renders on correct vs. selected-wrong options.

---

### US-A2 — Quiz options are operable and announced as a single-choice group
**Type:** Bug · **Priority:** P1 · **Effort:** S

> **As** Sam,
> **I want** each quiz question's options to behave as a labelled single-select group,
> **so that** I can answer using a keyboard and my screen reader announces the question and my
> choices correctly.

**Context:** Options are rendered as buttons. Confirm they are fully keyboard operable and
grouped so assistive tech understands "pick one of four for question N."

**Acceptance criteria**
- Each question is a labelled group (`role="radiogroup"` + accessible name, or fieldset/legend),
  options are `role="radio"`/radio inputs with correct `aria-checked`/checked state.
- All options reachable and selectable via keyboard; visible focus indicator on each.
- Selecting an option updates the group state and the submit-gate ("Answer all N questions").
- e2e covers keyboard-only completion of a quiz.

**Technical notes:** `src/pages/QuizPlay.tsx`. May be delivered together with US-A1.

---

### US-A3 — Site-wide accessibility audit & remediation
**Type:** Tech-debt · **Priority:** P2 · **Effort:** M

> **As** Sam,
> **I want** the whole app to meet WCAG 2.1 AA,
> **so that** every page is usable with a keyboard and screen reader.

**Acceptance criteria**
- Progress bars expose value to assistive tech (`role="progressbar"` + `aria-valuenow/min/max`
  or equivalent text).
- Visible focus states on all interactive elements (nav, cards, buttons, links).
- Landmark structure (header/nav/main/footer) and a "skip to content" link.
- Automated axe scan on key pages in e2e reports zero critical violations.

**Technical notes:** `src/components/{NavBar,ProgressBar}.tsx`, `src/App.tsx`, page components.
Consider adding `@axe-core/playwright` to the e2e suite.

---

## EPIC B — Visual & Rich Learning Content

> The single biggest lever on the app's teaching value. Today all curriculum content is text.
> Physical technique (grips, split step, swing path, serve toss, court geometry) is very hard to
> learn from prose alone. Requires a content-model change first, then asset production.

### US-B0 — Extend the content model to support media
**Type:** Feature · **Priority:** P1 · **Effort:** M · **Blocks:** B1, B2, B3

> **As** the product team,
> **I want** lessons (and optionally drills) to support images/diagrams and captions,
> **so that** we can add visual instruction without one-off hacks.

**Acceptance criteria**
- `types.ts` supports an optional ordered list of media blocks on a lesson: type
  (`image` | `diagram` | `video`), source, alt text (required), and caption.
- Renderer displays media responsively (`max-width:100%`), lazy-loads below the fold, and
  requires non-empty `alt` (enforced by a data-integrity test in `data.test.ts`).
- Assets are bundled/served under the `/ace-academy/` base path and work offline-friendly.
- Backwards compatible: text-only lessons render unchanged.

**Technical notes:** `src/data/types.ts`, `src/data/curriculum.ts`, `src/pages/LessonDetail.tsx`,
`src/data/data.test.ts`. Decide asset pipeline (in-repo SVG/PNG vs. hosted) with design.

---

### US-B1 — Technique diagrams on foundational lessons
**Type:** Content · **Priority:** P1 · **Effort:** L · **Depends on:** B0

> **As** Bea (beginner),
> **I want** diagrams showing grips, stance, and swing path,
> **so that** I can copy the technique instead of interpreting text like "base knuckle on the
> third bevel."

**Acceptance criteria**
- Grip lessons show a labelled bevel/hand diagram; ready-position and stroke lessons show a
  stance/swing illustration.
- Every image has descriptive alt text and a caption.
- Prioritised list of lessons agreed with product (start: Grip, Ready Position, Forehand,
  Backhand, Serve, Court & Rules).

**Technical notes:** Content + asset production task; renders via B0. Coordinate with design for
diagram style consistent with the existing court-green theme.

---

### US-B2 — Short demonstration clips for strokes and the serve
**Type:** Content · **Priority:** P2 · **Effort:** L · **Depends on:** B0

> **As** Bea,
> **I want** a short looping clip/GIF of each stroke and the serve motion,
> **so that** I can see the timing and rhythm a still image can't convey.

**Acceptance criteria**
- Stroke/serve lessons can embed a muted, looping, captioned clip that respects
  `prefers-reduced-motion` (pauses/first-frame when reduced motion is set).
- Media is lightweight enough not to regress load performance budgets.

**Technical notes:** Extends B0 media model with the `video` type. Sourcing/licensing of footage
is a product/legal precondition.

---

### US-B3 — Court & scoring diagram for the rules lessons
**Type:** Content · **Priority:** P2 · **Effort:** M · **Depends on:** B0

> **As** Bea,
> **I want** a labelled court diagram alongside the scoring/rules lessons,
> **so that** terms like service box, baseline, and "in/out on the line" are concrete.

**Acceptance criteria**
- "The Court & Basic Rules" and "How Tennis Scoring Works" lessons include a labelled court SVG.
- Diagram is legible in both light and dark themes.

---

## EPIC C — Personalized Dashboard & Progress Clarity

> The landing page is labelled "Dashboard" but is identical for a first-timer and someone 60%
> through. This epic makes it personal and makes progress legible.

### US-C1 — Resume where you left off
**Type:** Feature · **Priority:** P1 · **Effort:** M

> **As** Raj (returning learner),
> **I want** the dashboard to surface my next/most-recent lesson with a one-click resume,
> **so that** I don't have to hunt back to where I stopped.

**Acceptance criteria**
- When progress exists, the dashboard shows a prominent "Continue" card linking to the next
  incomplete lesson (or most-recently-viewed).
- When no progress exists, a first-run state points to the recommended starting lesson.
- Resume target is derived from stored progress and updates as lessons are completed.

**Technical notes:** `src/pages/Home.tsx`, `src/hooks/useProgress.ts`,
`src/context/ProgressContext.tsx`, `src/data/curriculum.ts`. Consider persisting a
`lastViewedLessonId` (schema addition — keep backward compatible with existing stored shape).

---

### US-C2 — Dashboard progress summary
**Type:** Feature · **Priority:** P1 · **Effort:** M

> **As** Raj,
> **I want** an at-a-glance summary of what I've completed across the whole app,
> **so that** I feel my progress and momentum.

**Acceptance criteria**
- Dashboard shows totals (e.g. lessons X/21, drills Y/25, quizzes Z/5) and overall %.
- Optional lightweight engagement signal (e.g. last-active date or a streak) — scope with product.
- Values come from stored progress and are covered by unit tests.

**Technical notes:** `src/pages/Home.tsx`, `src/hooks/useLevelStats.ts` (may need an
app-wide-stats companion), `src/context/ProgressContext.tsx`.

---

### US-C3 — Make level progress math legible
**Type:** Feature · **Priority:** P2 · **Effort:** S

> **As** Bea,
> **I want** the level progress indicator to make sense when I finish something,
> **so that** completing a whole lesson doesn't look like it "barely moved" the bar.

**Context:** Completing one lesson moved Beginner 0%→6% because the bar blends lessons + drills +
quizzes (1 of 17 items). This under-rewards visible effort.

**Acceptance criteria**
- Product decides the model: (a) show component sub-progress ("Lessons 1/8 · Drills 0/7 ·
  Quizzes 0/2") as the primary readout, and/or (b) weight lessons more heavily.
- The chosen model is reflected on the dashboard cards and the level page, and unit-tested in
  `useLevelStats`.

**Technical notes:** `src/hooks/useLevelStats.ts`, `src/pages/{Home,LevelLessons}.tsx`,
`src/components/ProgressBar.tsx`. Update `useLevelStats.test.tsx` first (red).

---

### US-C4 — Surface drill completion in progress views
**Type:** Feature · **Priority:** P2 · **Effort:** S

> **As** Pat,
> **I want** to see which drills I've already completed on the dashboard and level pages,
> **so that** I can track practice, not just reading.

**Acceptance criteria**
- Completed-drill counts appear on the dashboard and level pages, consistent with US-C2/C3.
- Drill completion state (already stored as `completedDrills`) is the source of truth.

**Technical notes:** `completedDrills` already exists in `ProgressContext`. Wire into stats/UI.

---

## EPIC D — Navigation & Discoverability

### US-D1 — "Practice this with" links to the specific drill
**Type:** Bug · **Priority:** P1 · **Effort:** M

> **As** Bea,
> **I want** the practice-drill card on a lesson to take me to that exact drill,
> **so that** I'm not dumped on the full drills list to hunt for it.

**Context:** In `LessonDetail.tsx` the related-drill card links to `/drills` (the whole list),
not the drill. There is no per-drill route.

**Acceptance criteria**
- Clicking a lesson's related-drill card lands the user on that specific drill's content.
- Delivery option A: add a `/drills/:drillId` detail route. Option B: deep-link to `/drills` with
  the target drill scrolled into view and highlighted. (Product picks; A is preferred for
  shareable links and per-drill completion.)
- e2e: from a lesson, clicking the practice card shows the intended drill.

**Technical notes:** `src/pages/LessonDetail.tsx` (~line 60), `src/App.tsx` routing,
`src/pages/Drills.tsx`, `src/data/drills.ts`.

---

### US-D2 — Global search across lessons, drills, and quizzes
**Type:** Feature · **Priority:** P2 · **Effort:** M

> **As** Raj,
> **I want** to search the whole catalogue by keyword,
> **so that** I can jump straight to a topic instead of browsing.

**Acceptance criteria**
- A search entry point (nav or dashboard) returns matching lessons, drills, and quizzes by
  title/summary/skill, grouped by type, each linking to its destination.
- Sensible empty-state ("No results for …").
- Works client-side over the static content (no backend).

**Technical notes:** New search component + index over `src/data/*`. Lessons currently have no
filter UI (drills do); this also covers lesson/quiz discovery.

---

### US-D3 — Per-page browser titles
**Type:** Feature · **Priority:** P2 · **Effort:** S

> **As** Raj,
> **I want** each page to set a descriptive browser tab title,
> **so that** bookmarks, history, and screen-reader page changes are meaningful.

**Context:** Every route currently shows the same `<title>` ("Ace Academy — Learn Tennis").
Hurts bookmarking, browser history, screen-reader announcements, and SEO for a public site.

**Acceptance criteria**
- Each route sets `document.title` (e.g. "The Grip — Ace Academy", "Quizzes — Ace Academy").
- Title updates on client-side navigation (HashRouter).
- Optional: basic per-page meta description for SEO.

**Technical notes:** A small `useDocumentTitle` hook invoked per page, or a title effect in
`App.tsx` keyed on route/content.

---

### US-D4 — Navigation & wayfinding polish
**Type:** Feature · **Priority:** P3 · **Effort:** S

> **As** Bea,
> **I want** small wayfinding cues while learning,
> **so that** I always know pacing and where I am.

**Acceptance criteria (bundle — split if needed)**
- Lessons show an estimated time (drills already show `duration`; lessons have none).
- Drill view offers previous/next navigation within a level/skill.
- Quiz shows lightweight progress ("3 of 6 answered") before submission.

**Technical notes:** `src/data/types.ts` (add optional lesson time), `LessonDetail.tsx`,
`Drills.tsx`, `QuizPlay.tsx`.

---

## EPIC E — Content Depth & Assessment

### US-E1 — "Common mistakes" and "How to know you're doing it right"
**Type:** Content · **Priority:** P2 · **Effort:** M

> **As** Bea,
> **I want** each technique lesson to call out common mistakes and a success check,
> **so that** I can self-correct without a coach watching.

**Acceptance criteria**
- Lesson content model supports optional "Common mistakes" and "Success check" sections.
- Foundational lessons are authored with these sections (prioritised list agreed with product).
- Data-integrity test tolerates their optionality.

**Technical notes:** `src/data/types.ts`, `curriculum.ts`, `LessonDetail.tsx`, `data.test.ts`.
Complements the existing "Coaching tips" callout.

---

### US-E2 — Per-lesson self-check
**Type:** Feature · **Priority:** P3 · **Effort:** M

> **As** Bea,
> **I want** a short self-check ("Can you find the grip without looking?") on a lesson,
> **so that** I can gauge readiness before moving on.

**Acceptance criteria**
- Lessons can carry a small self-check list the learner can tick (local, non-scored).
- State persists with existing progress storage; no backend.

---

### US-E3 — Skill self-assessment (exploratory)
**Type:** Feature · **Priority:** P3 · **Effort:** L

> **As** Raj,
> **I want** a way to reflect on skill progress (not just rules knowledge),
> **so that** the app measures improvement, not only recall.

**Context:** Quizzes assess *knowledge* only. There's no signal on whether a user's *strokes*
are improving. This is a discovery/spike story — validate the concept before committing.

**Acceptance criteria**
- Spike: propose 1–2 lightweight approaches (e.g. self-rating after drills, technique checklists)
  with mockups for product review. No production commitment until validated.

---

## EPIC F — Durability, Sync & Practice Experience

### US-F1 — Make local-only vs. synced state explicit
**Type:** Feature · **Priority:** P2 · **Effort:** S

> **As** Raj,
> **I want** the app to tell me clearly whether my progress is only on this device or synced,
> **so that** I understand the risk of losing it and how to protect it.

**Context:** Guest progress is device-local (`localStorage` key `tennis-coach-progress`); clearing
browser data wipes it. Cloud sync only exists when Supabase is configured on the deployment.
Confirm the production deploy's mode and communicate it.

**Acceptance criteria**
- Confirm whether the live GitHub Pages deploy has Supabase configured; document the answer.
- UI clearly states current mode (e.g. a persistent "saved on this device" indicator that becomes
  "synced to your account" when signed in), with a prompt to sign in when sync is available.

**Technical notes:** `src/pages/Account.tsx`, `src/components/NavBar.tsx`,
`src/context/{AuthContext,ProgressContext}.tsx`. Do **not** regress the "never mark synced after a
failed cloud read" invariant.

---

### US-F2 — Export / import progress
**Type:** Feature · **Priority:** P2 · **Effort:** M

> **As** Raj,
> **I want** to export my progress and import it elsewhere,
> **so that** I have a backup and can move devices even without an account.

**Acceptance criteria**
- Export produces a portable file of the stored progress shape
  (`completedLessons`, `completedDrills`, `quizAttempts`).
- Import validates and merges using the same rules as cloud merge (completions union; quiz
  attempts keep the higher score) and never silently discards existing progress.
- Round-trip covered by unit tests; e2e covers the happy path.

**Technical notes:** `src/context/ProgressContext.tsx`. Reuse the documented merge semantics.

---

### US-F3 — "Today's practice" courtside view
**Type:** Feature · **Priority:** P2 · **Effort:** M

> **As** Pat (courtside practicer),
> **I want** a glanceable practice plan I can work through on my phone,
> **so that** I can run drills at the court without digging through the catalogue.

**Acceptance criteria**
- A focused view assembles a short set of drills (by chosen level/skill, or "recommended next")
  as a checklist with durations, optimised for one-handed phone use.
- Ticking a drill marks it complete (feeds C4) and the list shows remaining time.
- Optional print/share-friendly layout.

**Technical notes:** New page/route over `src/data/drills.ts` + `completedDrills` progress. Aligns
with the strong existing drill content (concrete, numbered, timed).

---

## Prioritisation summary (for PM triage)

| ID | Title | Epic | Type | Priority | Effort |
| --- | --- | --- | --- | --- | --- |
| US-A1 | Non-colour quiz feedback | A | Bug | P0 | S |
| US-A2 | Accessible quiz option group | A | Bug | P1 | S |
| US-A3 | Site-wide a11y audit | A | Tech-debt | P2 | M |
| US-B0 | Media content model | B | Feature | P1 | M |
| US-B1 | Technique diagrams | B | Content | P1 | L |
| US-B2 | Stroke/serve clips | B | Content | P2 | L |
| US-B3 | Court & scoring diagram | B | Content | P2 | M |
| US-C1 | Resume where you left off | C | Feature | P1 | M |
| US-C2 | Dashboard progress summary | C | Feature | P1 | M |
| US-C3 | Legible level progress math | C | Feature | P2 | S |
| US-C4 | Drill completion in progress | C | Feature | P2 | S |
| US-D1 | Fix "Practice this with" links | D | Bug | P1 | M |
| US-D2 | Global search | D | Feature | P2 | M |
| US-D3 | Per-page browser titles | D | Feature | P2 | S |
| US-D4 | Wayfinding polish bundle | D | Feature | P3 | S |
| US-E1 | Common mistakes / success check | E | Content | P2 | M |
| US-E2 | Per-lesson self-check | E | Feature | P3 | M |
| US-E3 | Skill self-assessment (spike) | E | Feature | P3 | L |
| US-F1 | Explicit local vs. synced state | F | Feature | P2 | S |
| US-F2 | Export / import progress | F | Feature | P2 | M |
| US-F3 | "Today's practice" courtside view | F | Feature | P2 | M |

### Suggested first slice (recommendation, not a decision)

- **Sprint 1 — correctness & quick wins:** US-A1, US-A2, US-D1, US-D3, US-C3.
- **Sprint 2 — engagement:** US-C1, US-C2, US-C4, US-F1.
- **Then — the big lever:** US-B0 → US-B1 (visual content), sequenced with design.

## Out of scope / explicitly not proposed

- The content that exists is **accurate and well-pitched** (grip cues, rules, tiebreak/deuce/let,
  "line is in"). No correction stories are needed — preserve the current voice.
- Core flows already work well: responsive layout + mobile hamburger, dark mode, local progress
  persistence with undo, sensible 404, and graceful degradation when Supabase isn't configured.
  These are strengths to protect during refactors, not items to rebuild.
