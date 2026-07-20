# Ace Academy — Learn Tennis

A web app for learning tennis, from complete beginner to advanced competitive player.

## Features

- **Curriculum** — structured lessons across Beginner, Intermediate, and Advanced levels, covering grip, footwork, strokes, serve, net play, tactics, doubles, and the mental game.
- **Drills** — practice routines tied to lessons, filterable by level and skill.
- **Quizzes** — multiple-choice quizzes on rules, scoring, strokes, and strategy with instant feedback and explanations.
- **Progress tracking** — completed lessons, drills, and best quiz scores are saved to `localStorage` and reflected in per-level progress bars on the dashboard.

## Stack

React + TypeScript + Vite, `react-router-dom` for routing, no backend — all content is static data and progress is stored client-side.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run lint     # run oxlint
```
