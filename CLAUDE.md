# Ace Academy — working agreement

A React 19 + TypeScript + Vite tennis learning app. Static curriculum content,
local-first progress, optional Supabase accounts for cross-device sync.
Deployed to Cloudflare Workers static assets at the root path `/`, served from the
custom domain `acetennis.academy`.

## Development is test-driven

Every behaviour change starts with a failing test. The cycle is red → green → refactor:

1. **Red** — write the test first and watch it fail for the right reason. A test that
   passes before the change is not testing the change.
2. **Green** — write the smallest amount of code that makes it pass.
3. **Refactor** — clean up with the test as your safety net.

Rules that follow from this:

- **No production change lands without a test that would fail without it.** Bug fixes start
  with a regression test reproducing the bug.
- **Never weaken a test to make it pass.** If a test fails, either the code is wrong or the
  test's expectation was wrong — decide which, deliberately, and say so.
- **Never delete or skip a failing test to get green.** Use `test.fixme` (e2e) or an
  explicitly-named documenting test (unit) with a comment explaining the known defect.
- **Mocks must model reality.** A mock that is more permissive than the real dependency
  hides bugs — see the `pushToCloud` note below for a case where exactly that happened.

## Commands

| Command | What it does |
| --- | --- |
| `npm run verify` | The full gate: typecheck → lint → unit+coverage → e2e. Run before pushing. |
| `npm run test:watch` | Vitest in watch mode — the inner TDD loop. |
| `npm test` | Unit + component tests once. |
| `npm run test:coverage` | Unit tests with coverage thresholds enforced. |
| `npm run test:e2e` | Playwright end-to-end suite. |
| `npm run test:e2e:ui` | Playwright UI mode, for debugging a spec interactively. |
| `npm run typecheck` | `tsc -b` across app, node and e2e projects. |
| `npm run lint` | oxlint, warnings treated as errors. |

## The test suite

Three layers, all gating deploys via `.github/workflows/test.yml`:

**Data integrity** (`src/data/data.test.ts`) — the curriculum is static content, so it is
guarded by invariants rather than coverage: unique ids, referential integrity between
lessons and drills, and `correctIndex` pointing at a real option. Most of these are now
*also* enforced by the content compilers, which fail the build at the point of authoring;
the tests stay as defence in depth and to guard the compilers themselves.

**Unit + component** (`src/**/*.test.tsx`, Vitest + Testing Library, jsdom) — contexts,
hooks, components and pages. Coverage thresholds are **90%** on lines, branches, functions
and statements; `src/data/**` is excluded because it is content, not logic. The content
*pipeline* in `src/content/**` is logic and is covered like everything else.

**End-to-end** (`e2e/`, Playwright + Chromium) — real user journeys against a production
build served by `vite preview`.

### Conventions

- Prefer role- and label-based queries (`getByRole`, `getByLabelText`) over test ids, so
  tests break when the accessible UI breaks.
- Render through `src/test/renderWithProviders.tsx` rather than stubbing context by hand —
  tests then exercise real routing, auth and progress wiring.
- Seed state with `seedProgress()` and assert persisted state with `readStoredProgress()`.
- In e2e, `locator.count()` does **not** auto-wait. Always `await expect(locator.first())
  .toBeVisible()` before counting, or you will get flaky zero-counts.
- The app uses `BrowserRouter`, so e2e navigation is `page.goto('/drills')`. Deep links work
  because Cloudflare's `not_found_handling: single-page-application` (see `wrangler.jsonc`)
  serves `index.html` with a 200 for unmatched paths; `vite preview` does the same locally.

### Supabase in tests

Never hit a real Supabase project from tests.

- **Unit** — `vi.mock('../lib/supabaseClient')` with getters, plus the fake client in
  `src/test/supabaseMock.ts`.
- **E2E** — the app is built against a stub project (`https://stub.supabase.co`) and every
  request is intercepted by the fixture in `e2e/fixtures.ts`, which implements the auth and
  PostgREST endpoints in memory. Responses need CORS headers and `OPTIONS` preflight
  handling, since the stub is a different origin from the preview server.

## Sync invariants (both were once bugs — keep them covered)

1. **A PostgREST builder is lazy.** It only issues its request when awaited or `.then()`-ed.
   `pushToCloud` originally did `void supabase.from('progress').upsert(...)` and therefore
   never wrote anything. If you touch that code, keep the `.then()`.

   The unit mock in `src/test/supabaseMock.ts` deliberately reproduces this laziness and
   records executed payloads in `upsertRequests`. **Assert on `upsertRequests`, not on the
   `upsert` spy** — the spy only proves the query was built, not sent. The original eager
   mock is precisely why this bug survived the first round of unit tests.

2. **Never mark a user synced after a failed cloud read.** Doing so lets the next local edit
   upsert local-only state over a cloud row that was never merged in, destroying progress
   from another device. On read failure the provider stays unsynced and edits remain local.
   Covered by "never overwrites the cloud row after a failed read" and the e2e
   "the app stays usable when the backend read fails".

## Authoring content

All curriculum content lives under `content/`, one file per item, named
`<level>/<order>-<id>.<ext>`. Lessons and drills are Markdown; quizzes are YAML. The
strategy and the remaining phase (an optional git-backed CMS) are in
`docs/engineering/content-authoring-strategy.md`.

### Lessons — `content/lessons/<level>/<order>-<id>.md`

```markdown
---
category: Fundamentals          # required
title: The Grip                 # required
summary: One line for the card. # required
tips:                           # required, at least one
  - Coaching tip shown in the tips box.
drills: [b-drill-grip-shadow]   # optional, must be drills from the same level
---

Body is Markdown: headings, lists, **bold**, links, images, tables, blockquotes.
```

### Drills — `content/drills/<level>/<order>-<id>.md`

```markdown
---
skill: Fundamentals             # required, drives the skill filter chips
title: Grip Shadow Swings       # required
duration: 5 minutes             # required
equipment: Racquet only         # required
goal: One line on what it builds. # required
---

1. The steps, as a Markdown ordered list.
2. A drill body without one fails the build — a drill is a numbered routine.
```

### Quizzes — `content/quizzes/<level>/<order>-<id>.yml`

```yaml
topic: Rules & Scoring          # required, shown as the section heading
title: Rules & Scoring Basics   # required
description: One line for the card. # required
questions:                      # required, at least one
  - id: q1
    question: What is the score when both players have 40?
    options: [Match point, Deuce, Tiebreak, Advantage]
    answer: Deuce               # the text, not an index — must match an option exactly
    explanation: Shown after the question is answered.
```

**Author the answer, never the index.** `correctIndex` is derived at build time from
`answer`, and an answer matching no option fails the build. A hand-written index is a
number nobody can proofread, and an off-by-one silently marks correct answers wrong for
every user who takes the quiz.

### Rules the pipeline enforces, and why

- **The filename is the identity.** `010-b-grip.md` means order `010`, id `b-grip`. Ids are
  persisted in user progress, so **renaming a file wipes that lesson's completions for every
  existing user** — `contentIds.test.ts` snapshots the id set for lessons, drills and
  quizzes alike, so a rename is a visible, deliberate diff rather than an accident.
- **Order is the numeric prefix**, in steps of 10 so a lesson can be inserted without
  renaming its neighbours. Duplicate prefixes within a level fail the build.
- **Unknown frontmatter keys fail the build.** A typo'd `tip:` would otherwise silently
  publish a lesson with no coaching tips.
- **Markdown is rendered at build time** by the `ace-content` Vite plugin, never in the
  browser, with `html: false` — raw tags in a file are escaped, not passed through. If
  content ever arrives from outside a reviewed PR (a CMS), sanitise in the plugin, because
  `LessonDetail` and `Drills` inject the compiled HTML.
- **Validation runs on the node side**, inside the plugin, so bad content fails `dev`,
  `build` and `vitest` with the file path and a reason — and no parser or validator reaches
  the browser bundle.
- **Cross-links are absolute app paths**: `[the grip](/curriculum/beginner/b-grip)`. They go
  through the router via `CompiledContent`, so they navigate without reloading the app, and
  `data.test.ts` fails if one points at a route that does not exist. Compilers see one file
  at a time, so link integrity is necessarily a test rather than a build check.

## Architecture notes

- `content/` — all curriculum content, one file per item: `lessons/` and `drills/` as
  Markdown with YAML frontmatter, `quizzes/` as YAML. See "Authoring content" above.
- `src/content/` — the content pipeline: `compile.ts` (shared path identity, frontmatter
  and field validation, Markdown rendering), `compileLesson` / `compileDrill` /
  `compileQuiz`, and `orderContent` (curriculum order from filename prefixes). Logic, not
  content.
- `plugins/aceContent.ts` — the Vite plugin that runs the right compiler per collection at
  build time.
- `src/data/` — what the app consumes: `levels` (still TypeScript, three of them) plus
  `lessons`, `drills` and `quizzes`, each a glob of `content/` handed to `orderContent`.
- `src/context/` — `AuthContext` (Supabase session) and `ProgressContext` (local-first
  progress with cloud merge). Context objects live in separate `*ContextDef.ts` files so the
  provider modules stay fast-refresh friendly.
- `src/hooks/` — `useAuth`, `useProgress` (both throw outside their provider) and
  `useLevelStats` (derives per-level completion percentages).
- Progress is stored in `localStorage` under `tennis-coach-progress` and merged with the
  cloud row on sign-in: completions union, quiz attempts keep the higher score.
