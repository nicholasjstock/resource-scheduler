import React from 'react'
import { render } from 'vitest-browser-react'
import { describe, it, expect, vi } from 'vitest'
import { ResourceScheduler } from '../index'
import { dayColumns, TestEvent } from '../test-utils/fixtures'

const event: TestEvent = {
  id: '1',
  title: 'Morning',
  start: new Date('2024-01-01T10:00:00'),
  end: new Date('2024-01-01T11:00:00'),
}

const baseProps = {
  columns: dayColumns(new Date('2024-01-01')),
  events: [event],
  columnWidth: 200,
  slotHeight: 30,
  timeAxis: { startHour: 8, endHour: 12, slotMinutes: 60 },
  renderEvent: (e: TestEvent) => <div>{e.title}</div>,
}

describe('ResourceScheduler', () => {
  it('lays out the grid from timeAxis', async () => {
    await render(
      <div style={{ height: '600px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} />
      </div>
    )

    // 08:00–12:00 in one-hour slots
    expect(document.querySelectorAll('[data-testid^="time-slot-monday-"]').length).toBe(4)
    const card = document.querySelector<HTMLElement>('[data-testid="event-card-1"]')!
    const column = card.closest<HTMLElement>('[data-column-id]')!
    expect(Math.round(card.getBoundingClientRect().top - column.getBoundingClientRect().top)).toBe(60)
  })

  it('renders the corner slot', async () => {
    const page = await render(
      <div style={{ height: '600px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} corner={<span>Week 1</span>} />
      </div>
    )

    const corner = await page.getByTestId('calendar-header-left-slot').element()
    expect(corner.textContent).toBe('Week 1')
  })

  it('lets renderColumnHeader extend or replace a header cell', async () => {
    const renderColumnHeader = vi.fn(
      (column: { id: string }, { depth, defaultContent }: { depth: number; defaultContent: React.ReactNode }) =>
        column.id === 'monday' ? (
          <>
            {defaultContent}
            <span data-testid="monday-extra">depth {depth}</span>
          </>
        ) : (
          <span>custom {column.id}</span>
        )
    )

    const page = await render(
      <div style={{ height: '600px', width: '1200px' }}>
        <ResourceScheduler {...baseProps} renderColumnHeader={renderColumnHeader} />
      </div>
    )

    const monday = await page.getByTestId('header-cell-monday').element()
    expect(monday.textContent).toContain('monday')
    expect((await page.getByTestId('monday-extra').element()).textContent).toBe('depth 0')
    const tuesday = await page.getByTestId('header-cell-tuesday').element()
    expect(tuesday.textContent).toBe('custom tuesday')
  })

  it('reports the visible date through onVisibleDateChange', async () => {
    const onVisibleDateChange = vi.fn()
    const page = await render(
      <div style={{ height: '600px', width: '500px' }}>
        <ResourceScheduler
          {...baseProps}
          scrollToDate={new Date('2024-01-01')}
          onVisibleDateChange={onVisibleDateChange}
        />
      </div>
    )

    const viewport = (await page.getByTestId('calendar-content-viewport').element()) as HTMLElement
    // Let layout and the initial scroll-to-date settle first: scroll events during that
    // programmatic scroll are ignored, and each new scroll restarts the 150ms debounce.
    await vi.waitFor(() => expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth))
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    await nextFrame()
    await nextFrame()

    viewport.scrollLeft = 800
    viewport.dispatchEvent(new Event('scroll'))

    await vi.waitFor(() => expect(onVisibleDateChange).toHaveBeenCalled(), { timeout: 3000 })
    expect(onVisibleDateChange.mock.calls.at(-1)![0]).toBeInstanceOf(Date)
  })
})
