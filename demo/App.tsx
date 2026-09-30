import { useMemo, useState } from 'react'
import { ResourceScheduler, type EventMove, type EventResize, type SlotClick } from '../src/index'
import { colors, demoColumns, demoShifts, demoWeekStart, ShiftCard, type Shift } from './scene'

type Theme = 'light' | 'dark' | 'auto'

// Pretend to save to a server, so the optimistic (pending) state is visible.
const save = () => new Promise<void>((resolve) => setTimeout(resolve, 400))

const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) =>
  a.start < b.end && b.start < a.end

export function App() {
  const weekStart = useMemo(() => demoWeekStart(), [])
  const columns = useMemo(() => demoColumns(weekStart, 5), [weekStart])
  const [shifts, setShifts] = useState<Shift[]>(() => demoShifts(weekStart))
  const [theme, setTheme] = useState<Theme>('light')
  const [log, setLog] = useState<string[]>(['Drag a shift to move it or give it to someone else.'])

  const note = (line: string) => setLog((lines) => [line, ...lines].slice(0, 5))

  const onEventMove = async ({ event, start, end, toColumn }: EventMove<Shift, { person: string }>) => {
    const person = toColumn?.data?.person ?? event.person
    const onLeave = shifts.some(
      (other) => other.person === person && other.editable === false && overlaps(other, { start, end })
    )
    await save()
    if (onLeave) {
      note(`Rejected: ${person} is on leave then — the shift snaps back.`)
      throw new Error('on leave')
    }
    setShifts((all) => all.map((s) => (s.id === event.id ? { ...s, person, start, end } : s)))
    note(`Moved “${event.title}” to ${person}.`)
  }

  const onEventResize = async ({ event, end }: EventResize<Shift>) => {
    await save()
    setShifts((all) => all.map((s) => (s.id === event.id ? { ...s, end } : s)))
    note(`Resized “${event.title}”.`)
  }

  const onSlotClick = ({ start, column }: SlotClick<Shift, { person: string }>) => {
    const person = column.data?.person
    if (!person) return
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    setShifts((all) => [
      ...all,
      { id: String(Date.now()), person, title: 'New shift', start, end, color: colors.floor },
    ])
    note(`Added a shift for ${person}.`)
  }

  return (
    <div className="demo" data-theme={theme}>
      <header className="demo-header">
        <div>
          <h1>resource-scheduler</h1>
          <p>
            A React time grid with a column per resource. Drag to move or reassign, drag the bottom
            edge to resize, click an empty slot to add a shift.
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
          events={shifts}
          columnWidth={120}
          slotHeight={22}
          timeAxis={{ startHour: 7, endHour: 19, slotMinutes: 30 }}
          scrollToDate={weekStart}
          corner={<span className="demo-corner">This week</span>}
          renderEvent={(shift, ctx) => <ShiftCard shift={shift} ctx={ctx} />}
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
