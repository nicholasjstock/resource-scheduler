import { useMemo, useState } from 'react'
import { ResourceScheduler, type EventMove, type EventResize, type SlotClick } from '../src/index'
import { BookingCard, colors, demoBookings, demoColumns, demoWeekStart, type Booking } from './scene'

type Theme = 'light' | 'dark' | 'auto'

// Pretend to save to a server, so the optimistic (pending) state is visible.
const save = () => new Promise<void>((resolve) => setTimeout(resolve, 400))

const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) =>
  a.start < b.end && b.start < a.end

export function App() {
  const weekStart = useMemo(() => demoWeekStart(), [])
  const columns = useMemo(() => demoColumns(weekStart, 5), [weekStart])
  const [bookings, setBookings] = useState<Booking[]>(() => demoBookings(weekStart))
  const [theme, setTheme] = useState<Theme>('light')
  const [log, setLog] = useState<string[]>(['Drag a booking to move it to another time or room.'])

  const note = (line: string) => setLog((lines) => [line, ...lines].slice(0, 5))

  const onEventMove = async ({ event, start, end, toColumn }: EventMove<Booking, { room: string }>) => {
    const room = toColumn?.data?.room ?? event.room
    const blocked = bookings.some(
      (other) => other.room === room && other.editable === false && overlaps(other, { start, end })
    )
    await save()
    if (blocked) {
      note(`Rejected: ${room} is closed for maintenance then — the booking snaps back.`)
      throw new Error('room unavailable')
    }
    setBookings((all) => all.map((b) => (b.id === event.id ? { ...b, room, start, end } : b)))
    note(`Moved “${event.title}” to ${room}.`)
  }

  const onEventResize = async ({ event, end }: EventResize<Booking>) => {
    await save()
    setBookings((all) => all.map((b) => (b.id === event.id ? { ...b, end } : b)))
    note(`Resized “${event.title}”.`)
  }

  const onSlotClick = ({ start, column }: SlotClick<Booking, { room: string }>) => {
    const room = column.data?.room
    if (!room) return
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    setBookings((all) => [
      ...all,
      { id: String(Date.now()), room, title: 'New booking', start, end, color: colors.meeting },
    ])
    note(`Booked ${room}.`)
  }

  return (
    <div className="demo" data-theme={theme}>
      <header className="demo-header">
        <div>
          <h1>resource-scheduler</h1>
          <p>
            A React time grid with a column per resource — here, meeting rooms. Drag a booking to
            move it or change room, drag its bottom edge to resize, click an empty slot to book. Grey
            maintenance blocks are locked, and moves onto them are rejected.
          </p>
        </div>
        <label>
          Theme{' '}
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </label>
      </header>

      <main className="demo-scheduler">
        <ResourceScheduler
          theme={theme}
          columns={columns}
          events={bookings}
          columnWidth={120}
          slotHeight={22}
          timeAxis={{ startHour: 7, endHour: 19, slotMinutes: 30 }}
          scrollToDate={weekStart}
          corner={<span className="demo-corner">This week</span>}
          renderEvent={(booking, ctx) => <BookingCard booking={booking} ctx={ctx} />}
          onEventMove={onEventMove}
          onEventResize={onEventResize}
          onSlotClick={onSlotClick}
        />
      </main>

      <footer className="demo-log" aria-live="polite">
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </footer>
    </div>
  )
}
