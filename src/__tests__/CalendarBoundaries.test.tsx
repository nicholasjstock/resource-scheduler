import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { describe, it, expect, vi } from 'vitest'
import { ResourceScheduler } from '../index'
import { dayColumns, TestEvent } from '../test-utils/fixtures'
import { ResourceSchedulerProps } from '../types/CalendarProps'

const columns = dayColumns(new Date('2024-01-01'))

const morningEvent: TestEvent = {
  id: '1',
  title: 'Morning',
  start: new Date('2024-01-01T09:00:00'),
  end: new Date('2024-01-01T12:00:00'),
}

const baseProps: ResourceSchedulerProps<TestEvent> = {
  columns,
  events: [morningEvent],
  columnWidth: 200,
  slotHeight: 30,
  timeAxis: { startHour: 9, endHour: 17, slotMinutes: 30 },
  scrollToDate: new Date('2024-01-01'),
  onEventMove: vi.fn(),
  onEventResize: vi.fn(),
  renderEvent: (event) => <div>{event.title}</div>,
}

const pointer = (type: string, x: number, y: number, buttons: number) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    buttons,
  })

const flush = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

// Drives dnd-kit's PointerSensor with native events: press on the card,
// nudge past the activation distance, move to the target, release.
async function dragCardTo(card: HTMLElement, x: number, y: number, grabOffsetY = 5) {
  const rect = card.getBoundingClientRect()
  const startX = rect.left + 5
  const startY = rect.top + grabOffsetY
  card.dispatchEvent(pointer('pointerdown', startX, startY, 1))
  document.dispatchEvent(pointer('pointermove', startX, startY + 14, 1))
  await flush()
  document.dispatchEvent(pointer('pointermove', x, y, 1))
  await flush()
  document.dispatchEvent(pointer('pointerup', x, y, 0))
  await flush(50)
}

const findVerticalScroller = (from: HTMLElement): HTMLElement => {
  let el: HTMLElement | null = from
  while (el && window.getComputedStyle(el).overflowY !== 'auto') el = el.parentElement
  if (!el) throw new Error('no vertical scroll container')
  return el
}

describe('Calendar time range', () => {
  it('only renders slots up to timeAxis.endHour', async () => {
    const page = await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} />
      </div>
    )

    const slots = document.querySelectorAll('[data-testid^="time-slot-monday-"]')
    // 09:00–17:00 at 30 minutes
    expect(slots.length).toBe(16)

    const column = document.querySelector<HTMLElement>('[data-column-id="monday"]')!
    const timeColumn = (await page.getByTestId('time-column').element()) as HTMLElement
    expect(column.getBoundingClientRect().height).toBe(timeColumn.getBoundingClientRect().height)
  })

  it('keeps a dropped event inside timeAxis.endHour', async () => {
    const onEventMove = vi.fn()
    const page = await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} onEventMove={onEventMove} />
      </div>
    )

    const card = (await page.getByTestId('event-card-1').element()) as HTMLElement
    const column = document.querySelector<HTMLElement>('[data-column-id="monday"]')!
    const colRect = column.getBoundingClientRect()

    // Drop on the 16:30 slot: a 3-hour event can't start there without running past 17:00.
    await dragCardTo(card, colRect.left + 20, colRect.top + 15 * 30 + 5)

    expect(onEventMove).toHaveBeenCalledOnce()
    const [{ start: newStart, end: newEnd }] = onEventMove.mock.calls[0]
    expect(newEnd.getTime()).toBeLessThanOrEqual(new Date('2024-01-01T17:00:00').getTime())
    expect(newStart.getHours()).toBe(14)
  })
})

describe('Calendar drop position', () => {
  it('moves the event by how far it was dragged, wherever the card was grabbed', async () => {
    const onEventMove = vi.fn()
    const page = await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} onEventMove={onEventMove} />
      </div>
    )

    const card = (await page.getByTestId('event-card-1').element()) as HTMLElement
    const rect = card.getBoundingClientRect()

    // Grab the 09:00–12:00 card 5 slots below its top and drag it down 2 slots (1 hour).
    const grabOffsetY = 5 * 30 + 5
    await dragCardTo(card, rect.left + 20, rect.top + grabOffsetY + 2 * 30, grabOffsetY)

    expect(onEventMove).toHaveBeenCalledOnce()
    const [{ start: newStart, end: newEnd }] = onEventMove.mock.calls[0]
    expect(newStart.getHours()).toBe(10)
    expect(newStart.getMinutes()).toBe(0)
    expect(newEnd.getHours()).toBe(13)
  })
})

describe('Calendar isolation', () => {
  it('does not drop an event onto a column of another calendar on the page', async () => {
    const onDropA = vi.fn()
    const onDropB = vi.fn()
    const page = await render(
      <div style={{ display: 'flex', height: '800px', width: '1200px' }}>
        <div data-testid="calendar-a" style={{ width: '600px', height: '100%' }}>
          <ResourceScheduler {...baseProps} onEventMove={onDropA} />
        </div>
        <div data-testid="calendar-b" style={{ width: '600px', height: '100%' }}>
          <ResourceScheduler {...baseProps} events={[]} onEventMove={onDropB} />
        </div>
      </div>
    )

    const card = (await page.getByTestId('calendar-a').getByTestId('event-card-1').element()) as HTMLElement
    const calendarB = (await page.getByTestId('calendar-b').element()) as HTMLElement
    const columnInB = calendarB.querySelector<HTMLElement>('[data-column-id="monday"]')!
    const rect = columnInB.getBoundingClientRect()

    await dragCardTo(card, rect.left + 20, rect.top + 4 * 30 + 5)

    expect(onDropA).not.toHaveBeenCalled()
    expect(onDropB).not.toHaveBeenCalled()
  })

  it('only scrolls with the arrow keys when focus is inside the calendar', async () => {
    const page = await render(
      <div style={{ height: '600px', width: '1200px' }}>
        <button type="button">Outside</button>
        <div style={{ height: '500px' }}>
          <ResourceScheduler {...baseProps} slotHeight={60} timeAxis={{ startHour: 9, endHour: 23, slotMinutes: 30 }} />
        </div>
      </div>
    )

    const viewport = (await page.getByTestId('calendar-content-viewport').element()) as HTMLElement
    const scroller = findVerticalScroller(viewport)
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)

    await userEvent.click(page.getByRole('button', { name: 'Outside' }))
    await userEvent.keyboard('{ArrowDown}')
    await flush(400)
    expect(scroller.scrollTop).toBe(0)

    await userEvent.click(document.querySelector<HTMLElement>('[data-testid^="time-slot-tuesday-"]')!)
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(0))
  })
})
