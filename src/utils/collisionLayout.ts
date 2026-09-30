import { CalendarEvent } from '../types'

const startOf = (event: CalendarEvent) => new Date(event.startTime).getTime()
const endOf = (event: CalendarEvent) => new Date(event.endTime).getTime()

const byStartThenLongest = (a: CalendarEvent, b: CalendarEvent) =>
  startOf(a) - startOf(b) || endOf(b) - endOf(a)

// Groups events into clusters of transitively overlapping events: if A overlaps B
// and B overlaps C, all three share a cluster even when A and C don't touch.
// Events that merely touch (one ends when the next starts) do not overlap.
export function getCollisionGroups<T extends CalendarEvent>(events: T[]): T[][] {
  const groups: T[][] = []
  let current: T[] = []
  let currentEnd = -Infinity

  ;[...events].sort(byStartThenLongest).forEach((event) => {
    if (current.length > 0 && startOf(event) >= currentEnd) {
      groups.push(current)
      current = []
      currentEnd = -Infinity
    }
    current.push(event)
    currentEnd = Math.max(currentEnd, endOf(event))
  })

  if (current.length > 0) groups.push(current)
  return groups
}

// Assigns each event in a cluster to the first lane that is free at its start
// time. laneCount is the number of lanes the cluster needs, so every event in
// the cluster gets the same width.
export function assignLanes<T extends CalendarEvent>(
  events: T[]
): { event: T; lane: number; laneCount: number }[] {
  const laneEnds: number[] = []
  const placed = [...events].sort(byStartThenLongest).map((event) => {
    let lane = laneEnds.findIndex((end) => end <= startOf(event))
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = endOf(event)
    return { event, lane }
  })
  return placed.map((p) => ({ ...p, laneCount: laneEnds.length }))
}
