// Demo scene shared by the live demo (demo/App.tsx) and the README screenshots
// (scripts/readme-screenshot.test.tsx): meeting rooms booked across a week.
import type { EventRenderContext, SchedulerColumn } from '../src/index'

export type Booking = {
  id: string
  room: string
  title: string
  start: Date
  end: Date
  color: string
  editable?: boolean
}

export type RoomColumn = SchedulerColumn<Booking, { room: string }>

export const rooms = ['Board', 'Studio', 'Huddle']
const dayNames = ['Monday', 'Tuesday', 'Wednesday']
export const colors = {
  meeting: '#2563eb',
  workshop: '#0d9488',
  interview: '#9333ea',
  maintenance: '#6b7280',
}

/** Monday of the week the demo shows (the current week, so the demo never looks stale). */
export function demoWeekStart(today = new Date()): Date {
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export function demoBookings(weekStart: Date): Booking[] {
  const at = (day: number, h: number, m = 0) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + day)
    d.setHours(h, m, 0, 0)
    return d
  }
  return [
    { id: '1', room: 'Board', title: 'All-hands', start: at(0, 8), end: at(0, 12), color: colors.meeting },
    { id: '2', room: 'Board', title: 'Client', start: at(0, 11), end: at(0, 13), color: colors.interview },
    { id: '3', room: 'Board', title: 'Design sync', start: at(0, 12, 30), end: at(0, 16), color: colors.meeting },
    { id: '4', room: 'Studio', title: 'Onboarding workshop', start: at(0, 9), end: at(0, 15), color: colors.workshop },
    { id: '5', room: 'Huddle', title: 'Maintenance', start: at(0, 8), end: at(0, 18), color: colors.maintenance, editable: false },
    { id: '6', room: 'Board', title: 'Board meeting', start: at(1, 10), end: at(1, 17), color: colors.meeting },
    { id: '7', room: 'Studio', title: 'Hackathon', start: at(1, 8), end: at(1, 13), color: colors.workshop },
    { id: '8', room: 'Huddle', title: 'Interviews', start: at(1, 12), end: at(1, 18), color: colors.interview },
    { id: '9', room: 'Studio', title: 'Training', start: at(2, 9), end: at(2, 14), color: colors.workshop },
    { id: '10', room: 'Huddle', title: 'Interview', start: at(2, 8, 30), end: at(2, 12), color: colors.interview },
    { id: '11', room: 'Huddle', title: 'Planning', start: at(2, 11), end: at(2, 15, 30), color: colors.meeting },
  ]
}

export function demoColumns(weekStart: Date, dayCount = dayNames.length): RoomColumn[] {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return names.slice(0, dayCount).map((day, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return {
      id: day.toLowerCase(),
      title: day,
      date,
      children: rooms.map((room) => ({
        id: `${day.toLowerCase()}-${room}`,
        title: room,
        data: { room },
        filterEvents: (events: Booking[]) => events.filter((booking) => booking.room === room),
      })),
    }
  })
}

const time = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

/** Card body for a booking; the bottom strip is the resize handle. */
export function BookingCard({ booking, ctx }: { booking: Booking; ctx: EventRenderContext<Booking> }) {
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        padding: '4px 6px',
        boxSizing: 'border-box',
        borderRadius: 5,
        background: ctx.editable || ctx.isPending ? booking.color : 'transparent',
        opacity: ctx.isPending ? 0.7 : 1,
        fontSize: 11,
        lineHeight: 1.3,
        overflow: 'hidden',
      }}
    >
      <strong>{booking.title}</strong>
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
