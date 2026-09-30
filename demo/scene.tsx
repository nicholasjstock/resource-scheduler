// Demo scene shared by the live demo (demo/App.tsx) and the README screenshots
// (scripts/readme-screenshot.test.tsx).
import type { EventRenderContext, SchedulerColumn } from '../src/index'

export type Shift = {
  id: string
  person: string
  title: string
  start: Date
  end: Date
  color: string
  editable?: boolean
}

export type PersonColumn = SchedulerColumn<Shift, { person: string }>

export const people = ['Alice', 'Bruno', 'Chloé']
const dayNames = ['Monday', 'Tuesday', 'Wednesday']
export const colors = { floor: '#2563eb', stock: '#0d9488', till: '#9333ea', leave: '#6b7280' }

/** Monday of the week the demo shows (the current week, so the demo never looks stale). */
export function demoWeekStart(today = new Date()): Date {
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export function demoShifts(weekStart: Date): Shift[] {
  const at = (day: number, h: number, m = 0) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + day)
    d.setHours(h, m, 0, 0)
    return d
  }
  return [
    { id: '1', person: 'Alice', title: 'Shop floor', start: at(0, 8), end: at(0, 12), color: colors.floor },
    { id: '2', person: 'Alice', title: 'Delivery', start: at(0, 11), end: at(0, 13), color: colors.stock },
    { id: '3', person: 'Alice', title: 'Till', start: at(0, 12, 30), end: at(0, 16), color: colors.till },
    { id: '4', person: 'Bruno', title: 'Stockroom', start: at(0, 9), end: at(0, 15), color: colors.stock },
    { id: '5', person: 'Chloé', title: 'Annual leave', start: at(0, 8), end: at(0, 18), color: colors.leave, editable: false },
    { id: '6', person: 'Alice', title: 'Till', start: at(1, 10), end: at(1, 17), color: colors.till },
    { id: '7', person: 'Bruno', title: 'Shop floor', start: at(1, 8), end: at(1, 13), color: colors.floor },
    { id: '8', person: 'Chloé', title: 'Stockroom', start: at(1, 12), end: at(1, 18), color: colors.stock },
    { id: '9', person: 'Bruno', title: 'Shop floor', start: at(2, 9), end: at(2, 14), color: colors.floor },
    { id: '10', person: 'Chloé', title: 'Till', start: at(2, 8, 30), end: at(2, 12), color: colors.till },
    { id: '11', person: 'Chloé', title: 'Shop floor', start: at(2, 11), end: at(2, 15, 30), color: colors.floor },
  ]
}

export function demoColumns(weekStart: Date, dayCount = dayNames.length): PersonColumn[] {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return names.slice(0, dayCount).map((day, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return {
      id: day.toLowerCase(),
      title: day,
      date,
      children: people.map((person) => ({
        id: `${day.toLowerCase()}-${person}`,
        title: person,
        data: { person },
        filterEvents: (events: Shift[]) => events.filter((shift) => shift.person === person),
      })),
    }
  })
}

const time = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

/** Card body for a shift; the bottom strip is the resize handle. */
export function ShiftCard({ shift, ctx }: { shift: Shift; ctx: EventRenderContext<Shift> }) {
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        padding: '4px 6px',
        boxSizing: 'border-box',
        borderRadius: 5,
        background: ctx.editable || ctx.isPending ? shift.color : 'transparent',
        opacity: ctx.isPending ? 0.7 : 1,
        fontSize: 11,
        lineHeight: 1.3,
        overflow: 'hidden',
      }}
    >
      <strong>{shift.title}</strong>
      <div style={{ opacity: 0.85 }}>
        {time(ctx.displayStart)}–{time(ctx.displayEnd)}
      </div>
      {ctx.editable && !ctx.isDragOverlay && (
        <div
          {...ctx.resizeHandleProps}
          title="Drag to resize"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, cursor: 'ns-resize' }}
        />
      )}
    </div>
  )
}
