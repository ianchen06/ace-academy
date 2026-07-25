import { describe, expect, it } from 'vitest'
import { drills } from './drills'
import { legacyDrills } from './drillsLegacy'
import { renderedBlocks } from '../test/compiledText'

/**
 * TEMPORARY — the gate on the drills Markdown migration, mirroring the one used
 * for lessons. Delete this file and `drillsLegacy.ts` together once reviewed.
 */
describe('drill markdown migration', () => {
  it('produces the same drills in the same order', () => {
    expect(drills.map((d) => d.id)).toEqual(legacyDrills.map((d) => d.id))
  })

  it('preserves every structured field', () => {
    for (const [index, drill] of drills.entries()) {
      const legacy = legacyDrills[index]!
      expect(drill.levelId, legacy.id).toBe(legacy.levelId)
      expect(drill.skill, legacy.id).toBe(legacy.skill)
      expect(drill.title, legacy.id).toBe(legacy.title)
      expect(drill.duration, legacy.id).toBe(legacy.duration)
      expect(drill.equipment, legacy.id).toBe(legacy.equipment)
      expect(drill.goal, legacy.id).toBe(legacy.goal)
    }
  })

  it('preserves every instruction step, in order', () => {
    for (const drill of drills) {
      const legacy = legacyDrills.find((d) => d.id === drill.id)!
      expect(renderedBlocks(drill.html), `drill ${drill.id}`).toEqual(legacy.instructions)
    }
  })
})
