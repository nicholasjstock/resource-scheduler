import { useMemo, useRef } from 'react'
import type { EventAccessors, SchedulerEvent } from '../types/CalendarProps'

/**
 * The scheduler's internal view of an event. Layout, drag and collision code
 * only ever see this shape; `source` is the caller's original record, which is
 * what renderEvent and the callbacks receive.
 */
export interface SchedulerItem<T> {
  id: string
  startTime: Date
  endTime: Date
  editable: boolean
  source: T
}

const toDate = (value: Date | string | number) => (value instanceof Date ? value : new Date(value))

export const defaultAccessors: Required<EventAccessors<SchedulerEvent>> = {
  getId: (event) => event.id,
  getStart: (event) => toDate(event.start),
  getEnd: (event) => toDate(event.end),
  isEditable: (event) => event.editable !== false,
}

/** The original record behind an item; internal tests may pass plain events. */
export function sourceOf<T>(event: SchedulerItem<T> | T): T {
  return event !== null && typeof event === 'object' && 'source' in event
    ? (event as SchedulerItem<T>).source
    : (event as T)
}

/**
 * Normalises events once per render. Items are cached per source record and
 * reused while their id/start/end/editable are unchanged, so memoised event
 * cards keep a stable identity across parent re-renders.
 */
export function useNormalizedEvents<T>(
  events: T[],
  accessors: EventAccessors<T> | undefined
): SchedulerItem<T>[] {
  const cache = useRef(new WeakMap<object, SchedulerItem<T>>())
  const getId = accessors?.getId ?? (defaultAccessors.getId as unknown as (e: T) => string)
  const getStart = accessors?.getStart ?? (defaultAccessors.getStart as unknown as (e: T) => Date)
  const getEnd = accessors?.getEnd ?? (defaultAccessors.getEnd as unknown as (e: T) => Date)
  const isEditable =
    accessors?.isEditable ?? (defaultAccessors.isEditable as unknown as (e: T) => boolean)

  return useMemo(
    () =>
      events.map((source) => {
        const id = getId(source)
        const startTime = toDate(getStart(source))
        const endTime = toDate(getEnd(source))
        const editable = isEditable(source)
        const key = typeof source === 'object' && source !== null ? source : null
        const cached = key ? cache.current.get(key) : undefined
        if (
          cached &&
          cached.id === id &&
          cached.startTime.getTime() === startTime.getTime() &&
          cached.endTime.getTime() === endTime.getTime() &&
          cached.editable === editable
        ) {
          return cached
        }
        const item = { id, startTime, endTime, editable, source }
        if (key) cache.current.set(key, item)
        return item
      }),
    [events, getId, getStart, getEnd, isEditable]
  )
}
