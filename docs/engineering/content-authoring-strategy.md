# Content Authoring Strategy — Markdown, and (maybe) a CMS

**Status:** Accepted. **Phases 1–4 implemented** — all curriculum content is now authored in
`content/`. Phases 5 (content polish) and 6 (optional CMS) outstanding.
**Date:** 2026-07-25
**Related branch:** `claude/content-management-strategy-itoz4j`
**Question asked:** *Can we write content in Markdown? Can we use a CMS?*

## TL;DR

**Yes to Markdown. Not yet to a CMS — and never to a runtime-fetched one.**

1. **Move prose to Markdown files in the repo**, compiled to HTML at build time by a small
   Vite plugin. Zero runtime parser, zero new production dependencies, content stays in git,
   review stays in PRs, and the existing data-integrity tests keep working.
2. **Keep structured data structured.** Quizzes and drill metadata go to YAML (frontmatter or
   standalone), *not* Markdown prose. Markdown is for paragraphs; it is a bad database.
3. **Add a CMS later, on top of those same files** — a git-backed one (Sveltia/Decap) that
   commits Markdown back to GitHub — and only when a non-technical author actually needs it.
4. **Do not put curriculum content in Supabase or a hosted headless CMS.** It would make a
   static, local-first, offline-capable app depend on a network round-trip for its core
   content, and would throw away the type safety and invariants that currently protect it.

---

## 1. Where we are today

| Collection | Count | File | Lines |
| --- | --- | --- | --- |
| Levels | 3 | `src/data/levels.ts` | 30 |
| Lessons | 32 | `src/data/curriculum.ts` | 624 |
| Drills | 39 | `src/data/drills.ts` | 594 |
| Quizzes | 8 (44 questions) | `src/data/quizzes.ts` | 554 |

Prose is modelled as `content: string[]` — an array of paragraph strings — and rendered by
`src/pages/LessonDetail.tsx:39` as a flat list of `<p>` elements. Shapes live in
`src/data/types.ts`; integrity is guarded by 30-odd invariants in `src/data/data.test.ts`
(unique ids, referential integrity for `drillIds`, `correctIndex` bounds, footwork coverage).

## 2. What actually hurts

- **No formatting.** The lesson body can only be paragraphs. No bold, no lists, no headings,
  no tables (scoring!), no links between lessons, and — the big one — **no images, diagrams or
  video**. The usability backlog's top request is "Bea needs to *see* technique". The current
  content model has nowhere to put a picture.
- **Prose lives inside code syntax.** Authors escape apostrophes (`index finger\'s` in
  `curriculum.ts:30`), balance quotes, and mind trailing commas. A typo is a build failure in
  a 624-line TypeScript literal rather than a typo in a paragraph.
- **Long-form editing is hostile.** The step-by-step Eastern forehand lesson is eight numbered
  steps expressed as eight sibling strings in an array. It reads as a wall of quoted text.
- **Everything is one file per collection.** Two people (or two agents) editing different
  lessons collide in `curriculum.ts`. One file per lesson would not conflict.
- **Agents author badly here too.** Editing a specific lesson inside a large TS literal is
  error-prone for Claude for the same reason it is for a human — the surrounding syntax is
  noise. `content/lessons/b-grip.md` is a much better editing target.

## 3. What today's setup gets *right* (do not lose this)

Any migration must preserve all four of these, or it is a downgrade:

1. **Compile-time type safety.** `Lesson`, `Drill`, `Quiz` are checked by `tsc`.
2. **Referential integrity, tested.** `data.test.ts` proves every `drillIds` entry exists *and*
   belongs to the same level, that ids are globally unique, and that `correctIndex` points at a
   real option. That last one is the single most damaging possible content bug.
3. **Zero runtime cost and zero network.** Content is in the bundle. The app works offline and
   renders instantly; it is a static asset deploy on Cloudflare.
4. **Content is versioned and reviewable.** Every wording change is a diff in a PR, gated by CI,
   with history and one-command rollback.

## 4. Options considered

### Option 0 — Keep TypeScript literals, add nothing

Cheapest. Solves none of §2. Rejected: the image/video gap alone blocks the product roadmap.

### Option A — Markdown + frontmatter in the repo, compiled at build time ✅ recommended

Content becomes `content/lessons/*.md`: YAML frontmatter for structured fields, Markdown body
for prose. A small Vite plugin parses and validates them at build time and hands the app plain
data. Nothing new ships to the browser.

- ✅ Solves every point in §2: rich formatting, images, one file per lesson, natural prose editing.
- ✅ Preserves every point in §3: still static, still typed at the boundary, still tested, still git.
- ✅ No production dependency — `gray-matter` + `markdown-it` are devDependencies used at build time.
- ⚠️ New build-pipeline code (the plugin) that itself needs tests.
- ⚠️ Ordering and ids move from "array position" to "filesystem convention" — see §5.4/§5.5.

### Option B — Git-backed CMS on top of Option A (Sveltia CMS / Decap CMS)

A static `/admin` page that authenticates against GitHub and **commits Markdown back to the
repo**. The build pipeline, tests and deploy are unchanged — the CMS is just a nicer editor.

- ✅ Non-technical authoring, media uploads, live preview, no database.
- ✅ Free; Sveltia is Decap-compatible with a much better editor and a published Cloudflare
  Worker for the GitHub OAuth handshake — a natural fit for this deploy target.
- ✅ Reversible: it edits files. Delete the admin page and nothing else changes.
- ⚠️ Needs an OAuth proxy Worker and a `config.yml` that mirrors the frontmatter schema (drift risk).
- ⚠️ Content edited outside a PR can bypass review unless it commits to a branch (Sveltia and
  Decap both support an editorial-workflow mode that opens PRs — use it).
- **Verdict: worth doing, but only once someone who won't touch a git client is authoring.**
  It is strictly additive on top of Option A, so deferring costs nothing.

### Option C — Hosted headless CMS (Sanity / Contentful / Storyblok / Strapi / Payload)

- **Fetched at runtime:** breaks offline, adds latency and a failure mode to the core reading
  experience, defeats the local-first architecture, and makes `data.test.ts` invariants
  unenforceable in CI without network. **Rejected.**
- **Fetched at build time:** output stays static, but you inherit a hosted dependency, an API
  token in CI, webhook-triggered deploys, and content history that lives outside git. All that
  for an editor UI that Option B provides for free. **Rejected at this scale** (32 lessons,
  effectively one author). Revisit only with a real editorial team or i18n across many locales.

### Option D — Content in Supabase (it's already there)

Tempting because the project already has Supabase. Same fatal shape as C-at-runtime, plus:
content edits stop being reviewable, the anon-key read path becomes load-bearing for the whole
app, and preview/rollback disappear. Supabase's job here is *user progress*, which is genuinely
per-user mutable state. Curriculum is neither. **Rejected.**

## 5. Design for Option A

### 5.1 Layout

```
content/
  lessons/
    beginner/
      010-grip.md
      020-grip-selection.md
      030-ready-position.md
      ...
    intermediate/…
    advanced/…
  drills/
    beginner/
      grip-shadow.md
      ...
  quizzes/
    beginner/
      rules.yml
      ...
  levels.yml
src/
  content/            # the pipeline (logic — coverage applies)
    compileLesson.ts  # frontmatter validation + markdown render
    orderLessons.ts   # curriculum order from filename prefixes
  data/               # unchanged public API: `lessons`, `drills`, `quizzes`, `levels`
plugins/
  aceContent.ts       # Vite plugin: runs the compile at build time (node-side)
```

`src/data/*` keeps exporting the same arrays with the same types, so **no page, hook or
component changes** except `LessonDetail` (which renders HTML instead of mapping paragraphs).

### 5.2 A lesson file

```markdown
---
category: Fundamentals
title: The Grip
summary: How you hold the racquet shapes every shot you will ever hit.
drills: [grip-shadow]
tips:
  - Practice switching grips off the court until it becomes automatic.
  - A relaxed grip (about 4–5 out of 10 tightness) produces more power than a tense one.
---

Grip is the foundation of every stroke. The most common beginner-friendly grip is the
**Continental** grip for serves and volleys, and the **Eastern forehand** grip for groundstrokes.

## Finding the Eastern forehand grip

1. Hold the racquet like you are shaking hands with it.
2. Place your palm flat against the strings, then slide your hand down to the handle.
3. The base knuckle of your index finger should sit on the **third bevel**.

![Base knuckle on bevel 3](/img/lessons/eastern-grip.jpg)

> Grip pressure matters as much as grip style — hold it like a small bird, not a hammer.
```

Note what became possible: headings, an ordered list, an emphasis, an image, a callout.

### 5.3 Pipeline

`vite.config.ts` gets one plugin. `vitest.config.ts` already merges the Vite config, so tests,
dev, `vite build` and the Playwright preview all use the identical pipeline — no codegen step,
no generated files to commit, no drift.

```ts
// plugins/aceContent.ts (as implemented)
export function aceContent(): Plugin {
  return {
    name: 'ace-content',
    enforce: 'pre',
    transform(code, id) {
      const path = id.split('?')[0]!
      if (!path.endsWith('.md') || !path.includes('/content/lessons/')) return null
      return { code: `export default ${JSON.stringify(compileLesson(code, path))}`, map: null }
    },
  }
}
```

`src/data/curriculum.ts` collects them with
`import.meta.glob('/content/lessons/**/*.md', { eager: true, import: 'default' })`
and hands them to `orderLessons`.

**Validation runs in the plugin, on the node side.** Invalid frontmatter fails `vite build`,
`vitest` and `npm run dev` with a file path and a reason — and no validator ships to the browser.

### 5.4 Ordering

Today, lesson order = array order, and `LessonDetail` derives prev/next from it. Glob results
are alphabetical, so ordering becomes a **filename convention**: zero-padded numeric prefixes
(`010-b-grip.md`), stripped when deriving the id. Gaps of 10 make inserting a lesson a one-file
change. A data test asserts prefixes are unique within a level and that every level's sequence
is strictly increasing.

### 5.5 Ids are a public contract — the one real risk

Lesson/drill/quiz ids are persisted in `localStorage` under `tennis-coach-progress` **and** in
the Supabase `progress` row. Deriving ids from filenames means *renaming a file silently
destroys that item's completion state for every existing user.*

Mitigation, now implemented in `src/data/lessonIds.test.ts`: derive the id from the filename
(minus the numeric prefix), and check in a snapshot of the full id set (`toMatchFileSnapshot`).
Any rename then shows up as a red diff that a reviewer must consciously accept, instead of
slipping through as "just a file rename".

### 5.6 Quizzes deserve better than an index

Quizzes are structured data, so they become YAML — and the migration is a chance to delete an
entire bug class. Instead of `correctIndex: 1`, author the answer:

```yaml
id: b-quiz-rules
topic: Rules & Scoring
questions:
  - id: q1
    question: What is the score called when both players have 40 points?
    options: [Match point, Deuce, Tiebreak, Advantage]
    answer: Deuce
    explanation: When both players reach 40 the score is deuce…
```

The loader resolves `answer` → `correctIndex` and **fails the build if the text doesn't match an
option exactly**. The runtime type is unchanged; the off-by-one that `data.test.ts` was written
to catch simply becomes unrepresentable. (Keep the existing test anyway — it now guards the loader.)

### 5.7 Rendering

`LessonDetail` switches from `lesson.content.map(...)` to `dangerouslySetInnerHTML` on
build-time HTML. Acceptable because the content is first-party and compiled from files in the
repo. **If Option B (CMS) lands, add `rehype-sanitize`/DOMPurify to the plugin at that point** —
a CMS means content can arrive from a GitHub account, not only from a reviewed PR.

Testing conventions survive: rendered Markdown produces real `<h2>`, `<ul>`, `<strong>`, so
role-based queries keep working — `getByRole('heading', { name: 'Finding the Eastern grip' })`
is a *better* assertion than the current "every paragraph string is present" check.

### 5.8 Bundle size

All content is currently in the main JS chunk. Compiled HTML is comparable in size. Optionally,
lesson bodies can be code-split (`import.meta.glob` without `eager`) so the initial bundle
carries only titles and summaries — but that trades away instant offline access to every lesson.
**Recommendation: stay eager until there's a service worker**; the total content is small.

## 6. Migration plan (test-driven, incremental, always shippable)

Each phase is a standalone PR that leaves `npm run verify` green. The public API of `src/data`
never changes, so the UI is untouched between phases.

| # | Phase | What lands | Effort |
| --- | --- | --- | --- |
| 1 | ✅ **Pipeline, no content moved** | `plugins/aceContent.ts` + `src/content/compileLesson.ts` + `src/content/orderLessons.ts`, with unit tests. Nothing user-visible. | S |
| 2 | ✅ **Lessons → Markdown** | One-shot codemod emitted 32 `.md` files from `curriculum.ts`; a *migration test* proved the compiled output matched the old array field-by-field and paragraph-by-paragraph before the TS file was deleted. `LessonDetail` renders HTML; `index.css` gained styles for the block elements Markdown can now produce. | M |
| 3 | ✅ **Drills → Markdown** | `instructions` became an ordered list in the body. The shared compiler primitives moved to `src/content/compile.ts` and `orderLessons` became the generic `orderContent`. | S |
| 4 | ✅ **Quizzes → YAML** | `answer:` replaces `correctIndex`, resolved and validated in `compileQuiz`. The compiler also took over the question-shape invariants, so they fail at authoring time. | S |
| 5 | **Content polish** | Now cash in the win: headings, images, diagrams, cross-links in the lessons that need them. | ongoing |
| 6 | *(optional)* **CMS** | Sveltia `/admin` + OAuth Worker + `config.yml` mirroring the schema, in editorial-workflow mode so edits open PRs. | M |

### Notes from the phases 1–2 implementation

- **Prose is emitted one paragraph per line, unwrapped.** Hard-wrapping would make diffs
  nicer, but markdown-it renders a soft line break as `\n` inside the paragraph, which would
  have made the migration's text comparison inexact. Correctness won; revisit if diffs annoy.
- **`tsconfig.node.json` moved from `nodenext` to `esnext` + `bundler` resolution.** The Vite
  config now imports the plugin, which imports the compiler from `src/`, and `nodenext`
  demands explicit file extensions the rest of the codebase does not use.
- **The compiled prose is read back through the DOM in tests** (`src/test/lessonText.ts`), so
  the content invariants in `data.test.ts` still assert on the words a reader sees. They now
  survive a lesson being rewritten with headings or lists, which the old `string[]` checks
  would not have.
- **A scan of all 32 lessons found zero Markdown-sensitive characters** in the prose (no
  `*`, `_`, backticks, leading list markers, `<`, `&`, `|`), so the migration needed no
  escaping and the round trip is exact. The same scan over the 39 drills found `&` in three
  titles only — frontmatter values, where YAML quoting handles it.
- **`instructions: string[]` carried an unwritten invariant**: a drill is a numbered routine,
  not an essay. Free-form Markdown would have dropped it, so `compileDrill` fails the build
  on a body with no ordered list. Steps gained emphasis and links in exchange.
- **Vite transforms `.yml` through the same plugin hook as `.md`** — no extra loader was
  needed for the quiz files.
- **`js-yaml` v5 ships its own types**, so no `@types/js-yaml`.
- **The compilers now enforce most of what `data.test.ts` asserted.** Those tests were kept
  rather than deleted: they are cheap, they guard the compilers, and the invariants they
  encode (footwork at every level, the Continental grip always on bevel 2) are curriculum
  rules that no per-file compiler can see.

**The TDD hinge is phase 2's migration test.** Deep-equality against the current in-memory data
(modulo prose → HTML) is what makes a 32-file mechanical migration verifiable rather than a
hope. It is written first, fails, then the codemod makes it pass, and it is deleted along with
`curriculum.ts` at the end of the phase.

Coverage note: `vitest.config.ts` excludes `src/data/**` because it is content. The new loader
and schema are **logic**, which is why they live in `src/content/` — the 90% thresholds should
apply to them. Only the `content/` directory (data) stays out.

## 7. Open questions for you

1. **Who authors, realistically?** If it's you and Claude for the foreseeable future, phases 1–5
   are the whole answer and phase 6 never needs to happen.
2. **Is video/imagery imminent?** If yes, phase 2 jumps the queue — it's the blocker.
3. **MDX instead of Markdown?** MDX would let a lesson embed a live React component (an
   interactive court diagram, an inline quiz). It's a heavier toolchain and it's hostile to any
   future CMS. Recommendation: plain Markdown now; revisit if interactive lesson widgets become
   a real requirement.
4. **Do we want editorial-workflow PRs from the CMS**, or is committing straight to `main`
   acceptable for content? (Straight to `main` means content bypasses CI review but still
   triggers the gated deploy.)
