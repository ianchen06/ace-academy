---
name: authoring-content
description: Add, edit, restructure or remove Ace Academy curriculum content — tennis lessons, drills and quizzes under content/. Use whenever the request is about the curriculum itself ("write a lesson on the kick serve", "add a beginner volley drill", "this quiz question is wrong", "what do we teach about footwork?", "split this lesson in two"), as opposed to app code. Covers picking the id and ordering prefix, the frontmatter schema per collection, and the checks that must pass.
---

# Authoring curriculum content

Content is static files under `content/`, compiled to plain data at build time. There
is no CMS and no database: a lesson is a Markdown file, and shipping it is a commit.

## Before writing: read the map

`docs/curriculum-map.md` is the whole curriculum on one page — every lesson, drill and
quiz with its ordering prefix, id, title and summary. Read it first. It answers "do we
already cover this?", "what is the next free slot?" and "which drill should this lesson
link to?" without opening 79 files.

It is generated. Never edit it by hand; `npm run check:content` rewrites it.

## Naming: the filename *is* the identity

```
content/<collection>/<level>/<order>-<id>.<ext>
         lessons        beginner      010-b-grip.md
         drills         intermediate  040-i-drill-federer-take-rise.md
         quizzes        advanced      020-a-quiz-strategy.yml
```

- **`<order>`** is a zero-padded numeric prefix, in steps of 10, unique within the level
  directory. To insert between `010` and `020`, use `015` — never renumber neighbours.
- **`<id>`** starts with the level's initial: `b-` beginner, `i-` intermediate, `a-`
  advanced. The build fails if it disagrees with the directory.
- Ids must be unique **across all three collections**, not just within one.

### Renaming a file destroys user progress

Ids are the keys under which completions are stored in `localStorage` and in Supabase.
Renaming `010-b-grip.md` wipes that lesson's completion for every existing user, and
turns every cross-link pointing at it into a dead link. `contentIds.test.ts` will fail
with a snapshot diff — that failure is the point. **Never rename a file to tidy it up.**
Only rename when the user has asked for something that genuinely requires it, and say
out loud that existing progress for that item will be lost.

Changing a *title* is free. Changing a *filename* is not.

## Schemas

Full field-by-field reference with examples is in `CLAUDE.md` ("Authoring content").
In brief:

| Collection | Format | Required frontmatter | Body must contain |
| --- | --- | --- | --- |
| Lesson | Markdown | `category`, `title`, `summary`, `tips` (≥1); `drills` optional | prose |
| Drill | Markdown | `skill`, `title`, `duration`, `equipment`, `goal` | a numbered list |
| Quiz | YAML | `topic`, `title`, `description`, `questions` | — |

Three rules the compilers enforce, worth knowing before you write:

- **Unknown frontmatter keys fail the build.** `tip:` for `tips:` is an error, not a
  silently empty tips box.
- **Quiz answers are authored as text, never as an index.** `answer: Deuce` must match
  one of `options` exactly; `correctIndex` is derived. Never hand-write an index.
- **A drill body without an ordered list fails the build.** A drill is a routine.

## House style

- **One sentence per line** in prose bodies, blank line between paragraphs. Markdown
  joins them for the reader; git diffs them per sentence.
- **One value per line** in frontmatter and quiz YAML. No `>-` folded scalars.
- **Cross-links are absolute app paths**: `[the grip](/curriculum/beginner/b-grip)`,
  `[the rules quiz](/quizzes/b-quiz-rules)`. A link to a route that does not exist fails
  `data.test.ts`. Never link a lesson to itself.
- `drills:` on a lesson may only reference drills **from the same level**.
- Raw HTML in a body is escaped, not rendered. Use Markdown.

## The loop

```
npm run check:content     # ~4s: compilers + curriculum invariants + regenerates the map
```

Run it after every file you write. It is the whole feedback loop for content — the
compilers report `<file path>: <what is wrong>`, so a failure usually tells you the fix.

Before pushing, run the full gate once: `npm run verify`.

If `check:content` rewrites `docs/curriculum-map.md`, **commit that change with the
content** — CI fails on a stale map.

## Curriculum invariants that outlive any single file

`src/data/data.test.ts` encodes editorial policy no per-file compiler can see. Changing
content can break them from a distance:

- Every level teaches footwork (a lesson in "Footwork & Movement", a drill with skill
  "Footwork") and has a grip-or-footwork quiz.
- Any sentence naming the Continental grip and a numbered bevel must say **bevel 2** —
  the lessons must not contradict each other.
- The three step-by-step forehand guides (`b-forehand-eastern`, `i-forehand-semi-western`,
  `a-forehand-western`) number their steps `Step 1 —`, `Step 2 —`, … with no gaps, and
  each links at least one drill.
- The grip-selection and grip-effects lessons must name all four grips.

If one of these fails, the content is wrong — not the test. Fix the content, or, if the
user is deliberately changing curriculum policy, change the invariant *and* say so.

## Adding a lesson, end to end

1. Read `docs/curriculum-map.md` — check the topic is not already covered, pick the level.
2. Pick the slot: next free prefix in that level, id prefixed with the level initial.
3. Write the file: frontmatter, then prose, one sentence per line.
4. Wire it up: `drills:` for drills from the same level, and cross-links to related lessons.
5. `npm run check:content`.
6. Commit the content file **and** the regenerated map together.
