import { describe, it, expect } from 'vitest'
import { findContainingArray } from '../depthUtils'
import { SchedulerColumn } from '../../types'

describe('findContainingArray', () => {
  const mockColumns: SchedulerColumn[] = [
    {
      id: 'monday',
      title: 'Monday',
      children: [
        {
          id: 'plonge',
          title: 'Plonge',
          children: [
            {
              id: 'charles',
              title: 'Charles',
            },
            {
              id: 'nick',
              title: 'Nick',
            },
          ],
        },
        {
          id: 'chaud',
          title: 'Chaud',
          children: [
            {
              id: 'guillaume',
              title: 'Guillaume',
            },
          ],
        },
      ],
    },
  ]

  it('should find top-level array', () => {
    const result = findContainingArray(mockColumns, 'monday')
    expect(result).toEqual({
      array: mockColumns,
      parentId: null,
    })
  })

  it('should find second-level array with correct parent', () => {
    const result = findContainingArray(mockColumns, 'plonge')
    expect(result).toEqual({
      array: mockColumns[0].children,
      parentId: 'monday',
    })
  })

  it('should find third-level array with correct parent', () => {
    const result = findContainingArray(mockColumns, 'charles')
    expect(result).toEqual({
      array: mockColumns[0].children![0].children,
      parentId: 'plonge',
    })
  })

  it('should return null for non-existent id', () => {
    const result = findContainingArray(mockColumns, 'nonexistent')
    expect(result).toBeNull()
  })

  it('should handle empty array', () => {
    const result = findContainingArray([], 'any')
    expect(result).toBeNull()
  })
})
