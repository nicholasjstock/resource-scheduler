import { SchedulerColumn } from '../types'

interface DepthInfo {
  depth: number
}

interface ContainingArrayInfo {
  array: SchedulerColumn[]
  parentId: string | null
}

export const findContainingArray = (
  cols: SchedulerColumn[],
  targetId: string
): ContainingArrayInfo | null => {
  // Check if target is in current level
  if (cols.some((col) => col.id === targetId)) {
    return { array: cols, parentId: null }
  }

  // Check children recursively
  for (const col of cols) {
    if (col.children?.some((child) => child.id === targetId)) {
      return { array: col.children, parentId: col.id }
    }

    if (col.children) {
      const result = findContainingArray(col.children, targetId)
      if (result) {
        return result
      }
    }
  }

  return null
}

export const getEffectiveBorderDepth = (
  columns: SchedulerColumn[],
  targetColumn: SchedulerColumn
): DepthInfo => {
  // Calculate total depth of the calendar structure
  const getTotalDepth = (cols: SchedulerColumn[]): number => {
    let max = 0
    cols.forEach((col) => {
      if (col.children?.length) {
        max = Math.max(max, 1 + getTotalDepth(col.children))
      }
    })
    return max
  }

  const totalDepth = getTotalDepth(columns)

  // Default depth for leaf nodes depends on total depth
  const DEFAULT_DEPTH = totalDepth

  // Then recursively check if it's last in each level
  const countConsecutiveLastItems = (
    cols: SchedulerColumn[],
    columnId: string,
    depth: number = DEFAULT_DEPTH
  ): DepthInfo => {
    const result = findContainingArray(cols, columnId)
    if (!result) {
      return { depth: DEFAULT_DEPTH }
    }

    const { array: containingArray, parentId } = result
    const index = containingArray.findIndex((col) => col.id === columnId)
    const isLast = index === containingArray.length - 1

    if (!isLast) {
      return { depth }
    }

    // If we're last but have no parent, we're at the top
    if (!parentId) {
      return { depth: 0 }
    }

    // Check if our parent is also last
    const parentResult = findContainingArray(cols, parentId)
    if (!parentResult) {
      return { depth: depth - 1 }
    }

    const parentIndex = parentResult.array.findIndex((col) => col.id === parentId)
    const isParentLast = parentIndex === parentResult.array.length - 1

    // Only recurse if parent is also last
    if (isParentLast) {
      return countConsecutiveLastItems(cols, parentId, depth - 1)
    }

    // Otherwise just reduce depth by 1
    return { depth: depth - 1 }
  }

  return countConsecutiveLastItems(columns, targetColumn.id)
}
