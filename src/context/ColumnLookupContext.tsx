import { createContext, useContext } from 'react'
import { SchedulerColumn } from '../types'

export const ColumnLookupContext = createContext<(id: string) => SchedulerColumn | null>(
  () => null
)

export const useColumnLookup = () => useContext(ColumnLookupContext)

export function findColumnById(columns: SchedulerColumn[], id: string): SchedulerColumn | null {
  for (const col of columns) {
    if (col.id === id) return col
    if (col.children) {
      const found = findColumnById(col.children, id)
      if (found) return found
    }
  }
  return null
}
