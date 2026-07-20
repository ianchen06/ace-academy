# Ace Academy — Learn Tennis

A web app for learning tennis, from complete beginner to advanced competitive player.

## Features

- **Curriculum** — structured lessons across Beginner, Intermediate, and Advanced levels, covering grip, footwork, strokes, serve, net play, tactics, doubles, and the mental game.
- **Drills** — practice routines tied to lessons, filterable by level and skill.
- **Quizzes** — multiple-choice quizzes on rules, scoring, strokes, and strategy with instant feedback and explanations.
- **Progress tracking** — completed lessons, drills, and best quiz scores are saved to `localStorage`, and sync to a Supabase-backed account when signed in so progress follows you across devices.

## Stack

React + TypeScript + Vite, `react-router-dom` for routing. Content (lessons/drills/quizzes) is static data. Accounts and cross-device progress sync are powered by [Supabase](https://supabase.com) (Postgres + Auth) — the app works fine without it configured, falling back to local-only progress.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run lint     # run oxlint
```

## Backend setup (Supabase)

Accounts and cloud progress sync are optional — without them, the app just uses `localStorage` as before. To enable them:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open the **SQL Editor** and run the migration in [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql). This creates the `progress` table with Row Level Security so each user can only read/write their own row.
3. Go to **Project Settings → API** and copy the **Project URL** and **anon public** key.
4. For local development, copy `.env.example` to `.env` and fill in those two values.
5. For the deployed site, add them as GitHub Actions secrets on this repo (**Settings → Secrets and variables → Actions**): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The deploy workflow (`.github/workflows/deploy.yml`) picks them up automatically on the next push.

The anon key is safe to expose in client code — access to data is enforced by the Row Level Security policies in the migration, not by keeping the key secret.
