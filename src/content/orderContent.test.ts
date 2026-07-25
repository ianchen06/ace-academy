import { describe, expect, it } from 'vitest'
import { orderContent } from './orderContent'
import type { Lesson } from '../data/types'

function lesson(id: string, levelId: Lesson['levelId']): Lesson {
  return { id, levelId, category: 'C', title: id, summary: 'S', html: '<p>x</p>', tips: ['t'] }
}

describe('orderContent', () => {
  // Glob keys arrive alphabetically, which would put "advanced" first and make
  // the curriculum read backwards. Level order comes from `levels`, not the disk.
  it('orders levels the way the curriculum does, not alphabetically', () => {
    const ordered = orderContent({
      '/content/lessons/advanced/010-a.md': lesson('a', 'advanced'),
      '/content/lessons/beginner/010-b.md': lesson('b', 'beginner'),
      '/content/lessons/intermediate/010-i.md': lesson('i', 'intermediate'),
    })
    expect(ordered.map((l) => l.id)).toEqual(['b', 'i', 'a'])
  })

  it('orders lessons within a level by their filename prefix', () => {
    const ordered = orderContent({
      '/content/lessons/beginner/030-third.md': lesson('third', 'beginner'),
      '/content/lessons/beginner/010-first.md': lesson('first', 'beginner'),
      '/content/lessons/beginner/020-second.md': lesson('second', 'beginner'),
    })
    expect(ordered.map((l) => l.id)).toEqual(['first', 'second', 'third'])
  })

  // Zero padding is what makes this work: unpadded, "100" would sort before "20".
  it('keeps a two-digit prefix ahead of a three-digit one', () => {
    const ordered = orderContent({
      '/content/lessons/beginner/100-tenth.md': lesson('tenth', 'beginner'),
      '/content/lessons/beginner/020-second.md': lesson('second', 'beginner'),
    })
    expect(ordered.map((l) => l.id)).toEqual(['second', 'tenth'])
  })

  it('rejects two lessons sharing an ordering prefix within a level', () => {
    expect(() =>
      orderContent({
        '/content/lessons/beginner/010-one.md': lesson('one', 'beginner'),
        '/content/lessons/beginner/010-two.md': lesson('two', 'beginner'),
      }),
    ).toThrow(/010/)
  })

  it('allows the same prefix in different levels', () => {
    const ordered = orderContent({
      '/content/lessons/beginner/010-b.md': lesson('b', 'beginner'),
      '/content/lessons/advanced/010-a.md': lesson('a', 'advanced'),
    })
    expect(ordered.map((l) => l.id)).toEqual(['b', 'a'])
  })
})
