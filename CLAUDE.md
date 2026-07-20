# Ace Academy — working agreement

A React 19 + TypeScript + Vite tennis learning app. Static curriculum content,
local-first progress, optional Supabase accounts for cross-device sync.
Deployed to GitHub Pages under the base path `/ace-academy/`.

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
lessons and drills, and `correctIndex` pointing at a real option. An off-by-one there
would silently mark correct quiz answers wrong for every user.

**Unit + component** (`src/**/*.test.tsx`, Vitest + Testing Library, jsdom) — contexts,
hooks, components and pages. Coverage thresholds are **90%** on lines, branches, functions
and statements; `src/data/**` is excluded because it is content, not logic.

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
- The app uses `HashRouter`, so e2e navigation is `page.goto('#/drills')`, not `/drills`.

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

## Architecture notes

- `src/data/` — static curriculum: levels, lessons, drills, quizzes. Pure content.
- `src/context/` — `AuthContext` (Supabase session) and `ProgressContext` (local-first
  progress with cloud merge). Context objects live in separate `*ContextDef.ts` files so the
  provider modules stay fast-refresh friendly.
- `src/hooks/` — `useAuth`, `useProgress` (both throw outside their provider) and
  `useLevelStats` (derives per-level completion percentages).
- Progress is stored in `localStorage` under `tennis-coach-progress` and merged with the
  cloud row on sign-in: completions union, quiz attempts keep the higher score.
