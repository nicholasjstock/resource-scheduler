import { SchedulerColumn } from '../types'

const DAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/** One column per day of the week starting at `weekStart` (a Monday). */
// Typed as SchedulerColumn<never> so they fit a scheduler of any event type.
export function dayColumns(weekStart: Date): SchedulerColumn<never>[] {
  return DAY_IDS.map((id, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return { id, title: id, date }
  })
}

/** Event in the scheduler's default shape. */
export interface TestEvent {
  id: string
  title?: string
  color?: string
  start: Date
  end: Date
  editable?: boolean
}

/** Day columns, each split into `groups`, each optionally split into `leaves`. */
export function nestedDayColumns(
  weekStart: Date,
  groups: string[],
  leaves: string[] = []
): SchedulerColumn<never>[] {
  return dayColumns(weekStart).map((day) => ({
    ...day,
    children: groups.map((group) => ({
      id: `${day.id}-${group}`,
      title: group,
      children: leaves.length
        ? leaves.map((leaf) => ({ id: `${day.id}-${group}-${leaf}`, title: leaf }))
        : undefined,
    })),
  }))
}
