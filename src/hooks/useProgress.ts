import { useContext } from 'react'
import { ProgressContext } from '../context/progressContextDef'

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider')
  return ctx
}
