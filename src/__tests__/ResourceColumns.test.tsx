import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { describe, it, expect, vi } from 'vitest'
import { ResourceScheduler } from '../index'
import type { SchedulerColumn } from '../types'
import type { TestEvent } from '../test-utils/fixtures'

type Booking = TestEvent & { resourceId: string }
type ResourceData = { resourceId: string }

const monday = new Date('2024-01-01')

const resourceColumn = (resourceId: string): SchedulerColumn<Booking, ResourceData> => ({
  id: `monday-${resourceId}`,
  title: resourceId,
  data: { resourceId },
  filterEvents: (events) => events.filter((event) => event.resourceId === resourceId),
})

const columns: SchedulerColumn<Booking, ResourceData>[] = [
  {
    id: 'monday',
    title: 'Monday',
    date: monday,
    children: [resourceColumn('alice'), resourceColumn('bob')],
  },
]

const booking: Booking = {
  id: 'b1',
  title: 'Alice 9-11',
  resourceId: 'alice',
  start: new Date('2024-01-01T09:00:00'),
  end: new Date('2024-01-01T11:00:00'),
}

const baseProps = {
  columns,
  events: [booking],
  columnWidth: 200,
  slotHeight: 30,
  timeAxis: { startHour: 9, endHour: 17, slotMinutes: 30 },
  scrollToDate: monday,
  renderEvent: (event: Booking) => <div>{event.title}</div>,
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

describe('resource columns', () => {
  it('only shows each resource its own events', async () => {
    await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} />
      </div>
    )

    const alice = document.querySelector('[data-column-id="monday-alice"]')!
    const bob = document.querySelector('[data-column-id="monday-bob"]')!
    expect(alice.querySelector('[data-testid="event-card-b1"]')).not.toBeNull()
    expect(bob.querySelector('[data-testid="event-card-b1"]')).toBeNull()
  })

  it('reports the source and target columns, with their data, when an event is moved', async () => {
    const onEventMove = vi.fn()
    const page = await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} onEventMove={onEventMove} />
      </div>
    )

    const card = (await page.getByTestId('event-card-b1').element()) as HTMLElement
    const bob = document.querySelector<HTMLElement>('[data-column-id="monday-bob"]')!
    const rect = card.getBoundingClientRect()
    const target = bob.getBoundingClientRect()

    card.dispatchEvent(pointer('pointerdown', rect.left + 5, rect.top + 5, 1))
    document.dispatchEvent(pointer('pointermove', rect.left + 5, rect.top + 19, 1))
    await flush()
    // Same time of day (grab point 5px below the card top), one column to the right.
    document.dispatchEvent(pointer('pointermove', target.left + 20, target.top + 2 * 30 + 5, 1))
    await flush()
    document.dispatchEvent(pointer('pointerup', target.left + 20, target.top + 2 * 30 + 5, 0))
    await flush(50)

    expect(onEventMove).toHaveBeenCalledOnce()
    const [move] = onEventMove.mock.calls[0]
    expect(move.event).toBe(booking)
    expect(move.fromColumn.data).toEqual({ resourceId: 'alice' })
    expect(move.toColumn.data).toEqual({ resourceId: 'bob' })
    expect(move.start.getHours()).toBe(10)
    expect(move.end.getHours()).toBe(12)
  })

  it('lets empty slots be clicked in a column that also has events', async () => {
    const onSlotClick = vi.fn()
    await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} onSlotClick={onSlotClick} />
      </div>
    )

    // Alice has a 09:00–11:00 booking; 13:00 is free.
    const alice = document.querySelector<HTMLElement>('[data-column-id="monday-alice"]')!
    const slots = alice.querySelectorAll<HTMLElement>('[data-testid^="time-slot-monday-alice-"]')
    await userEvent.click(slots[8], { timeout: 2000 })

    expect(onSlotClick).toHaveBeenCalledOnce()
    const [slot] = onSlotClick.mock.calls[0]
    expect(slot.start.getHours()).toBe(13)
  })

  it('rolls back a rejected move without logging an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onEventMove = vi.fn(() => Promise.reject(new Error('not allowed')))
    const page = await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} onEventMove={onEventMove} />
      </div>
    )

    const card = (await page.getByTestId('event-card-b1').element()) as HTMLElement
    const bob = document.querySelector<HTMLElement>('[data-column-id="monday-bob"]')!
    const rect = card.getBoundingClientRect()
    const target = bob.getBoundingClientRect()

    card.dispatchEvent(pointer('pointerdown', rect.left + 5, rect.top + 5, 1))
    document.dispatchEvent(pointer('pointermove', rect.left + 5, rect.top + 19, 1))
    await flush()
    document.dispatchEvent(pointer('pointermove', target.left + 20, target.top + 2 * 30 + 5, 1))
    await flush()
    document.dispatchEvent(pointer('pointerup', target.left + 20, target.top + 2 * 30 + 5, 0))
    await flush(50)

    expect(onEventMove).toHaveBeenCalledOnce()
    const alice = document.querySelector('[data-column-id="monday-alice"]')!
    expect(alice.querySelector('[data-testid="event-card-b1"]')).not.toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('reports the clicked slot and its column', async () => {
    const onSlotClick = vi.fn()
    await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} onSlotClick={onSlotClick} />
      </div>
    )

    const bob = document.querySelector<HTMLElement>('[data-column-id="monday-bob"]')!
    const slots = bob.querySelectorAll<HTMLElement>('[data-testid^="time-slot-monday-bob-"]')
    await userEvent.click(slots[4])

    expect(onSlotClick).toHaveBeenCalledOnce()
    const [slot] = onSlotClick.mock.calls[0]
    expect(slot.column.data).toEqual({ resourceId: 'bob' })
    expect(slot.start.getHours()).toBe(11)
    expect(slot.end.getHours()).toBe(11)
    expect(slot.end.getMinutes()).toBe(30)
  })
})
