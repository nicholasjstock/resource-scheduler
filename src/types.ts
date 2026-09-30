import type { ReactNode } from 'react'

export interface TimeSlot {
  id: string
  start: Date
  end: Date
  label?: string
}

export interface CalendarEvent {
  id: string
  startTime: Date | string
  endTime: Date | string
  editable?: boolean
  color?: string
  title?: string
}

/**
 * A column in the scheduler's header tree. Leaf columns hold the time grid;
 * parents group them (e.g. day → area → person).
 */
export interface SchedulerColumn<T = unknown, C = unknown> {
  id: string
  title: ReactNode
  /** Day shown by this column; descendants without their own date inherit it. */
  date?: Date
  children?: SchedulerColumn<T, C>[]
  /** Narrows the events passed down from the parent (receives the original records). */
  filterEvents?(events: T[]): T[]
  /** App payload, handed back in callbacks (e.g. which person the column is for). */
  data?: C
  /** DOM id for the column and its header cell (`header-${domId}`). */
  domId?: string
}

export interface TimeRange {
  start: number
  end: number
  interval?: number
}

export interface ResizingState {
  isResizing: boolean
  eventId: string | null
  originalEnd: Date | null
}
