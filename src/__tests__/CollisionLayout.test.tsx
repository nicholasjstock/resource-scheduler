import { render } from 'vitest-browser-react'
import { describe, it, expect, vi } from 'vitest'
import { ResourceScheduler } from '../index'
import { dayColumns, TestEvent } from '../test-utils/fixtures'

const renderCalendar = async (events: TestEvent[]) => {
  const columns = dayColumns(new Date('2024-01-01'))
  const page = await render(
    <div style={{ height: '800px', width: '1200px', position: 'relative' }}>
      <ResourceScheduler
        columns={columns}
        events={events}
        columnWidth={200}
        slotHeight={30}
        timeAxis={{ startHour: 9, endHour: 17, slotMinutes: 30 }}
        scrollToDate={new Date('2024-01-01')}
        onEventMove={vi.fn()}
        onEventResize={vi.fn()}
        renderEvent={(event) => <div>{event.title}</div>}
      />
    </div>
  )
  const rectOf = async (id: string) =>
    (await page.getByTestId(`event-card-${id}`).element()).getBoundingClientRect()
  return { page, rectOf }
}

// Cards have a 1px border outside their computed box, so ignore overlaps of a
// couple of pixels and only flag cards that are genuinely drawn over each other.
const BORDER_TOLERANCE = 2
const intersects = (a: DOMRect, b: DOMRect) =>
  a.left < b.right - BORDER_TOLERANCE &&
  b.left < a.right - BORDER_TOLERANCE &&
  a.top < b.bottom - BORDER_TOLERANCE &&
  b.top < a.bottom - BORDER_TOLERANCE

const event = (id: string, start: string, end: string): TestEvent => ({
  id,
  title: id,
  start: new Date(`2024-01-01T${start}:00`),
  end: new Date(`2024-01-01T${end}:00`),
})

describe('Calendar collision layout', () => {
  it('does not draw chained overlapping events on top of each other', async () => {
    const { rectOf } = await renderCalendar([
      event('a', '09:00', '12:00'),
      event('b', '11:00', '13:00'),
      event('c', '12:30', '14:00'),
    ])

    const [a, b, c] = [await rectOf('a'), await rectOf('b'), await rectOf('c')]

    expect(intersects(a, b)).toBe(false)
    expect(intersects(b, c)).toBe(false)
    expect(intersects(a, c)).toBe(false)
  })

  it('reuses a lane once the earlier event in it has ended', async () => {
    const { rectOf } = await renderCalendar([
      event('a', '09:00', '12:00'),
      event('b', '11:00', '13:00'),
      event('c', '12:30', '14:00'),
    ])

    const [a, b, c] = [await rectOf('a'), await rectOf('b'), await rectOf('c')]

    // Two lanes are enough: C fits back into A's lane.
    expect(c.left).toBeCloseTo(a.left, 0)
    expect(c.width).toBeCloseTo(a.width, 0)
    expect(b.width).toBeCloseTo(a.width, 0)
  })

  it('gives non-overlapping events the full column width', async () => {
    const { rectOf } = await renderCalendar([
      event('a', '09:00', '10:00'),
      event('b', '10:00', '11:00'),
    ])

    const [a, b] = [await rectOf('a'), await rectOf('b')]

    expect(b.left).toBeCloseTo(a.left, 0)
    expect(b.width).toBeCloseTo(a.width, 0)
    expect(intersects(a, b)).toBe(false)
  })
})
