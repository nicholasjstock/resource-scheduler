import { useMemo } from 'react'
import { CalendarEvent } from '../types'
import { getCollisionGroups } from '../utils/collisionLayout'

export function useCollisionGroups<T extends CalendarEvent>(events: T[]): T[][] {
  return useMemo(() => getCollisionGroups(events), [events])
}
