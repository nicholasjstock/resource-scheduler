import { render } from 'vitest-browser-react'
import { describe, it, expect, vi } from 'vitest'
import { ResourceScheduler } from '../index'
import { dayColumns } from '../test-utils/fixtures'
import type { EventRenderContext } from '../types/CalendarProps'

const columns = dayColumns(new Date('2024-01-01'))

// Offset and height of a card relative to its column.
const placement = (card: HTMLElement) => {
  const column = card.closest<HTMLElement>('[data-column-id]')!
  const cardRect = card.getBoundingClientRect()
  return {
    top: Math.round(cardRect.top - column.getBoundingClientRect().top),
    height: Math.round(cardRect.height),
  }
}

const sharedProps = {
  columns,
  columnWidth: 200,
  slotHeight: 30,
  timeAxis: { startHour: 9, endHour: 17, slotMinutes: 30 },
  scrollToDate: new Date('2024-01-01'),
  onEventResize: vi.fn(),
}

describe('event accessors', () => {
  it('reads id, start and end by default', async () => {
    const event = {
      id: 'e1',
      label: 'Default shape',
      start: new Date('2024-01-01T10:00:00'),
      end: new Date('2024-01-01T11:00:00'),
    }

    const page = await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler
          {...sharedProps}
          events={[event]}
          onEventMove={vi.fn()}
          renderEvent={(e) => <div>{e.label}</div>}
        />
      </div>
    )

    const card = (await page.getByTestId('event-card-e1').element()) as HTMLElement
    // 10:00 is two 30px slots below 09:00; one hour is two slots tall (plus the 1px borders).
    expect(placement(card).top).toBe(60)
    expect(placement(card).height).toBeGreaterThanOrEqual(60)
    expect(placement(card).height).toBeLessThanOrEqual(62)
    expect(card.textContent).toContain('Default shape')
  })

  it('uses custom accessors and hands the original record to callbacks', async () => {
    type Booking = { key: string; from: string; to: string; locked: boolean }
    const booking: Booking = {
      key: 'b1',
      from: '2024-01-01T09:00:00',
      to: '2024-01-01T10:30:00',
      locked: true,
    }
    const renderEvent = vi.fn((b: Booking, _ctx: EventRenderContext) => <div>{b.key}</div>)

    const page = await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler
          {...sharedProps}
          events={[booking]}
          accessors={{
            getId: (b) => b.key,
            getStart: (b) => new Date(b.from),
            getEnd: (b) => new Date(b.to),
            isEditable: (b) => !b.locked,
          }}
          onEventMove={vi.fn()}
          renderEvent={renderEvent}
        />
      </div>
    )

    const card = (await page.getByTestId('event-card-b1').element()) as HTMLElement
    expect(placement(card).top).toBe(0)
    expect(placement(card).height).toBeGreaterThanOrEqual(90)
    expect(placement(card).height).toBeLessThanOrEqual(92)
    expect(card.dataset.editable).toBe('false')

    const [renderedEvent, ctx] = renderEvent.mock.calls.at(-1)!
    expect(renderedEvent).toBe(booking)
    expect(ctx.editable).toBe(false)
  })
})
