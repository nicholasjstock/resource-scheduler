import { SchedulerColumn } from '../types'

// Vertical dividers get heavier the higher the column is in the header tree.
// Colours come from the --rs-grid-line* custom properties.

// Vertical borders for header
export const getBorderStyle = (
  _column: SchedulerColumn,
  depth: number,
  isLastInGroup: boolean
): string => {
  if (isLastInGroup) {
    return 'none'
  }

  switch (depth) {
    case 0: // Date level (strongest)
      return '3px solid var(--rs-grid-line-strong)'
    case 1: // Perimeter level (medium)
      return '2px solid var(--rs-grid-line-medium)'
    default: // Employee/leaf level (lightest)
      return '1px solid var(--rs-grid-line)'
  }
}

// Vertical borders for grid (leaf nodes only)
export const getGridBorderStyle = (depth: number): string => {
  switch (depth) {
    case 0: // Date level (strongest)
      return '3px solid var(--rs-grid-line-strong)'
    case 1: // Perimeter level
      return '2px solid var(--rs-grid-line-medium)'
    case 2: // Employee/leaf level
      return '1px solid var(--rs-grid-line)'
    default:
      return '1px solid var(--rs-grid-line)'
  }
}
