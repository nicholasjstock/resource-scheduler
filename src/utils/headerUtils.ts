import { SchedulerColumn } from '../types'

export const getFontSize = (depth: number): number => {
  switch (depth) {
    case 0: // Day level
      return 32
    case 1: // Perimeter level
      return 24
    case 2: // Worker level
      return 14
    default:
      return 14
  }
}

export const getLevelHeight = (depth: number): number => {
  const fontSize = getFontSize(depth)
  const padding = 20 // Increased padding (16px top + 16px bottom)
  return fontSize + padding
}

export const getHeaderHeight = (structure: SchedulerColumn): number => {
  let totalHeight = 0

  const calculateHeight = (column: SchedulerColumn, depth: number) => {
    if (depth === 0) {
      totalHeight = getLevelHeight(0)
    }
    if (column.children?.length) {
      totalHeight += getLevelHeight(depth + 1)
      if (column.children[0].children?.length) {
        calculateHeight(column.children[0], depth + 1)
      }
    }
  }

  calculateHeight(structure, 0)
  return totalHeight
}
