import type { Level } from './types'

export const levels: Level[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    tagline: 'First steps on the court',
    description:
      'Learn the grip, stance, and basic strokes. Get comfortable rallying, understand the rules, and build confidence with the ball.',
    color: '#4caf7d',
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    tagline: 'Building consistency and control',
    description:
      'Refine your strokes, add spin and placement, learn the serve toss and volley, and start thinking tactically during points.',
    color: '#3d8bff',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    tagline: 'Competing with power and strategy',
    description:
      'Sharpen weapons like the topspin serve and approach shots, master singles/doubles tactics, and train the mental game to win matches.',
    color: '#a340ff',
  },
]

export const levelById = (id: string) => levels.find((l) => l.id === id)
