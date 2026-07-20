export type LevelId = 'beginner' | 'intermediate' | 'advanced'

export interface Level {
  id: LevelId
  name: string
  tagline: string
  description: string
  color: string
}

export interface Lesson {
  id: string
  levelId: LevelId
  category: string
  title: string
  summary: string
  content: string[]
  tips: string[]
  drillIds?: string[]
}

export interface Drill {
  id: string
  levelId: LevelId
  skill: string
  title: string
  duration: string
  equipment: string
  goal: string
  instructions: string[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Quiz {
  id: string
  levelId: LevelId
  topic: string
  title: string
  description: string
  questions: QuizQuestion[]
}
