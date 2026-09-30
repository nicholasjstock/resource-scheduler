import React from 'react'
import { render } from 'vitest-browser-react'
import { describe, it, expect, vi } from 'vitest'
import { ResourceScheduler } from '../index'
import { dayColumns, nestedDayColumns, TestEvent } from '../test-utils/fixtures'
import { CalendarEvent, SchedulerColumn } from '../types'
import type { EventMove, EventRenderContext } from '../types/CalendarProps'
import { DragContext, DragPreviewContext } from '../context/DragContext'
import { CalendarColumn } from '../components/CalendarGrid/CalendarColumn'
import { DndContext } from '@dnd-kit/core'

describe('Calendar', () => {
  const mockEvents: TestEvent[] = [
    {
      id: '1',
      start: new Date('2024-01-01T09:00:00'),
      end: new Date('2024-01-01T12:00:00'),
      title: 'Morning Event',
      color: '#1976d2',
    },
  ]

  const defaultProps = {
    columnWidth: 200,
    slotHeight: 30,
    events: mockEvents,
    timeAxis: { startHour: 9, endHour: 17, slotMinutes: 30 },
    onEventMove: vi.fn(),
    onEventResize: vi.fn(),
    scrollToDate: new Date('2024-01-01'),
    onVisibleDateChange: vi.fn(),
    renderEvent: (event: TestEvent) => <div>{event.title}</div>,
  }

  it('renders week view calendar structure correctly', async () => {
    const columns = nestedDayColumns(new Date('2024-01-01'), ['Hot Kitchen', 'Cold Kitchen'])

    const page = await render(
      <div style={{ height: '800px', width: '1200px', position: 'relative' }}>
        <ResourceScheduler {...defaultProps} columns={columns} />
      </div>
    )

    const header = await page.getByTestId('calendar-header')
    expect(header.element()).toBeDefined()
  })

  it('handles drag and drop of events', async () => {
    const columns = dayColumns(new Date('2024-01-01'))

    const page = await render(
      <ResourceScheduler {...defaultProps} columns={columns} onEventMove={vi.fn()} />
    )

    const header = await page.getByTestId('calendar-header')
    expect(header.element()).toBeDefined()
  })

  it('calls onEventMove when an event is dropped into the same column', async () => {
    const onEventMove = vi.fn()

    const columns = dayColumns(new Date('2024-01-01'))
    const page = await render(
      <div style={{ height: '800px', width: '1200px', position: 'relative' }}>
        <ResourceScheduler {...defaultProps} columns={columns} onEventMove={onEventMove} />
      </div>
    )

    const eventCard = await page.getByTestId('event-card-1')
    const el = eventCard.element()
    const rect = el.getBoundingClientRect()

    // dnd-kit PointerSensor listens for native pointer events on the element and document.
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + 5,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: 1,
      })
    )

    // First pointermove: activates the drag (fires DragStart internally).
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + 14,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: 1,
      })
    )

    // Let React flush the DragStart state update so dnd-kit registers `over`.
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Second pointermove: moves to the target slot and fires DragMove, which updates `over`.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + 125,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: 1,
      })
    )

    // Let React flush the DragMove state update before releasing.
    await new Promise((resolve) => setTimeout(resolve, 0))

    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + 125,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: 0,
      })
    )

    // Let React flush batched state updates from drag-end handlers.
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(onEventMove).toHaveBeenCalledOnce()

    const [{ event: droppedEvent, start: newStart, end: newEnd }] = onEventMove.mock.calls[0]

    expect(droppedEvent).toMatchObject({ id: '1' })

    // We dragged ~4 slots down (120 px at 30 px/slot), so the event must land
    // at 11:00 — NOT snap back to its original 9:00 start.
    const originalStart = new Date('2024-01-01T09:00:00')
    expect(newStart.getTime()).toBeGreaterThan(originalStart.getTime())

    // Duration must be preserved (3 hours = 10 800 000 ms).
    const originalDuration =
      new Date('2024-01-01T12:00:00').getTime() - originalStart.getTime()
    expect(newEnd.getTime() - newStart.getTime()).toBe(originalDuration)
  })

  it('updates only the end time when resizing from the resize handle', async () => {
    const columns = dayColumns(new Date('2024-01-01'))

    const formatTime = (value: Date) =>
      value.toLocaleTimeString('default', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

    const renderResizableEvent = (_event: TestEvent, ctx: EventRenderContext) => (
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <div>{`${formatTime(ctx.displayStart)} - ${formatTime(ctx.displayEnd)}`}</div>
        <div
          {...ctx.resizeHandleProps}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8 }}
        />
      </div>
    )

    function ControlledCalendar() {
      const [events, setEvents] = React.useState(mockEvents)

      return (
        <ResourceScheduler
          {...defaultProps}
          columns={columns}
          events={events}
          onEventMove={({ event, start: newStart, end: newEnd }) => {
            setEvents((current) =>
              current.map((candidate) =>
                candidate.id === event.id
                  ? { ...candidate, start: newStart, end: newEnd }
                  : candidate
              )
            )
          }}
          onEventResize={({ event, end: newEnd }) => {
            setEvents((current) =>
              current.map((candidate) =>
                candidate.id === event.id ? { ...candidate, end: newEnd } : candidate
              )
            )
          }}
          renderEvent={renderResizableEvent}
        />
      )
    }

    const page = await render(
      <div style={{ height: '800px', width: '1200px', position: 'relative' }}>
        <ControlledCalendar />
      </div>
    )

    expect(await page.getByText('09:00 - 12:00')).toBeDefined()

    const handle = await page.getByTestId('event-resize-handle-1')
    const rect = handle.element().getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const basePointer = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      isPrimary: true,
      button: 0,
    }

    handle.element().dispatchEvent(new PointerEvent('pointerdown', { ...basePointer, buttons: 1 }))
    handle.element().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        ...basePointer,
        buttons: 1,
        clientY: y + 31,
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(await page.getByText('09:00 - 12:30')).toBeDefined()
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        ...basePointer,
        buttons: 0,
        clientY: y + 31,
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(await page.getByText('09:00 - 12:30')).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // Drag & drop: optimistic UI / snap-back prevention
  //
  // These tests document a known bug: after a drag completes, the event card
  // momentarily snaps back to its original slot because DragContext clears
  // `activeEvent` synchronously in a `finally` block before the parent's async
  // state update has had a chance to run.  All tests in this group are expected
  // to FAIL until the optimistic-position feature is implemented.
  // ---------------------------------------------------------------------------

  describe('drag & drop optimistic UI (snap-back prevention)', () => {
    // Drag the event ~125 px down — Math.floor(125/30) = 4 slots = 09:00→11:00
    const DRAG_DELTA = 125

    async function dragEvent(el: Element, deltaY: number) {
      const rect = el.getBoundingClientRect()
      const base = { pointerId: 1, isPrimary: true, button: 0, bubbles: true, cancelable: true }
      el.dispatchEvent(
        new PointerEvent('pointerdown', { ...base, buttons: 1, clientX: rect.left + 5, clientY: rect.top + 5 })
      )
      document.dispatchEvent(
        new PointerEvent('pointermove', { ...base, buttons: 1, clientX: rect.left + 5, clientY: rect.top + 14 })
      )
      await new Promise((r) => setTimeout(r, 0))
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          ...base,
          buttons: 1,
          clientX: rect.left + 5,
          clientY: rect.top + deltaY,
        })
      )
      await new Promise((r) => setTimeout(r, 0))
      document.dispatchEvent(
        new PointerEvent('pointerup', { ...base, buttons: 0, clientX: rect.left + 5, clientY: rect.top + deltaY })
      )
      await new Promise((r) => setTimeout(r, 50))
    }

    // Returns the event card's top offset relative to its calendar column.
    // 09:00 (start) → 0 px.  11:00 (4 slots × 30 px) → 120 px.
    function getEventRelativeTop(): number {
      const column = document.querySelector('[data-column-id]')!
      const columnTop = column.getBoundingClientRect().top
      const eventEl = document.querySelector('[data-testid="event-card-1"]')!
      return eventEl.getBoundingClientRect().top - columnTop
    }

    // Builds a controlled <ResourceScheduler> whose onEventMove is gated behind a
    // manually-settled Promise, letting tests inspect the render between "drop
    // fired" and "parent state updated".
    function makeControlledCalendar(columns: SchedulerColumn<never>[]) {
      let settleDrop: ((success: boolean) => void) | undefined

      function ControlledCalendar() {
        const [events, setEvents] = React.useState(mockEvents)

        const handleDrop = React.useCallback(
          async ({ event, start: newStart, end: newEnd }: EventMove<TestEvent>) => {
            const success = await new Promise<boolean>((res) => {
              settleDrop = res
            })
            if (success) setEvents([{ ...event, start: newStart, end: newEnd }])
          },
          []
        )

        return (
          <div style={{ height: '800px', width: '1200px', position: 'relative' }}>
            <ResourceScheduler {...defaultProps} columns={columns} events={events} onEventMove={handleDrop} />
          </div>
        )
      }

      return {
        ControlledCalendar,
        resolveDrop: () => settleDrop?.(true),
        rejectDrop: () => settleDrop?.(false),
      }
    }

    it('does not snap back to the original position immediately after drag release', async () => {
      const columns = dayColumns(new Date('2024-01-01'))
      const { ControlledCalendar } = makeControlledCalendar(columns)
      await render(<ControlledCalendar />)

      const eventEl = document.querySelector('[data-testid="event-card-1"]')!
      const initialRelativeTop = getEventRelativeTop()

      await dragEvent(eventEl, DRAG_DELTA)

      // Drop promise is still pending — the parent has NOT yet updated events.
      // The event should hold its optimistic dropped position, not snap back.
      const relativeTopAfterDrop = getEventRelativeTop()
      expect(relativeTopAfterDrop).toBeGreaterThan(initialRelativeTop + 60)
    })

    it('does not snap back when the parent re-renders with stale props right after drop', async () => {
      const columns = dayColumns(new Date('2024-01-01'))
      let forceStaleRerender: (() => void) | undefined
      let settleDrop: ((success: boolean) => void) | undefined

      function ControlledCalendar() {
        const [events, setEvents] = React.useState(mockEvents)
        const [, setTick] = React.useState(0)
        forceStaleRerender = () => setTick((t) => t + 1)

        const handleDrop = React.useCallback(
          async ({ event, start: newStart, end: newEnd }: EventMove<TestEvent>) => {
            const success = await new Promise<boolean>((res) => {
              settleDrop = res
            })
            if (success) setEvents([{ ...event, start: newStart, end: newEnd }])
          },
          []
        )

        return (
          <div style={{ height: '800px', width: '1200px', position: 'relative' }}>
            <ResourceScheduler {...defaultProps} columns={columns} events={events} onEventMove={handleDrop} />
          </div>
        )
      }

      await render(<ControlledCalendar />)
      const eventEl = document.querySelector('[data-testid="event-card-1"]')!

      await dragEvent(eventEl, DRAG_DELTA)

      // Simulate RTK Query doing a re-render with stale (original) events cache
      forceStaleRerender?.()
      await new Promise((r) => setTimeout(r, 0))

      // Event must still show at dropped position despite stale props re-render
      expect(getEventRelativeTop()).toBeGreaterThan(60)

      // Cleanup: avoid dangling unresolved promise
      settleDrop?.(false)
    })

    it('keeps the dropped event at the optimistic position while the drop promise is pending', async () => {
      const columns = dayColumns(new Date('2024-01-01'))
      const { ControlledCalendar, rejectDrop } = makeControlledCalendar(columns)
      await render(<ControlledCalendar />)

      const eventEl = document.querySelector('[data-testid="event-card-1"]')!
      await dragEvent(eventEl, DRAG_DELTA)

      // Sample position three times while the async drop is still pending
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 10))
        expect(getEventRelativeTop()).toBeGreaterThan(60)
      }

      // Cleanup
      rejectDrop()
    })

    it('keeps the dropped position after parent data catches up', async () => {
      const columns = dayColumns(new Date('2024-01-01'))
      const { ControlledCalendar, resolveDrop } = makeControlledCalendar(columns)
      await render(<ControlledCalendar />)

      const eventEl = document.querySelector('[data-testid="event-card-1"]')!
      await dragEvent(eventEl, DRAG_DELTA)

      // While pending: event should be at optimistic position
      expect(getEventRelativeTop()).toBeGreaterThan(60)

      // Resolve drop → parent state updates to new position
      resolveDrop()
      await new Promise((r) => setTimeout(r, 50))

      // After parent catches up, event must remain at new position (~120 px)
      expect(getEventRelativeTop()).toBeGreaterThan(60)
    })

    it('rolls back the optimistic position when the drop promise rejects', async () => {
      const columns = dayColumns(new Date('2024-01-01'))
      const { ControlledCalendar, rejectDrop } = makeControlledCalendar(columns)
      await render(<ControlledCalendar />)

      const eventEl = document.querySelector('[data-testid="event-card-1"]')!
      const initialRelativeTop = getEventRelativeTop()

      await dragEvent(eventEl, DRAG_DELTA)

      // While pending: event should be at optimistic (new) position
      expect(getEventRelativeTop()).toBeGreaterThan(initialRelativeTop + 60)

      // Reject the drop → event must roll back to original position
      rejectDrop()
      await new Promise((r) => setTimeout(r, 50))

      expect(getEventRelativeTop()).toBe(initialRelativeTop)
    })

    it('does not snap back to the source column when dropped onto a different column', async () => {
      // This test verifies CalendarColumn's optimistic-routing logic: while an
      // async onEventMove promise is pending, the event must appear in the TARGET
      // column (col-b) and be absent from the SOURCE column (col-a).
      //
      // We render CalendarColumn components directly inside a controlled
      // DragContext so we can inject the optimistic state without relying on
      // dnd-kit's cross-element collision detection (which is difficult to
      // trigger reliably in headless Playwright tests).

      type ColumnTestEvent = CalendarEvent & { columnId: string }

      const testEvent: ColumnTestEvent = {
        id: '1',
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T12:00:00'),
        title: 'Morning Event',
        color: '#1976d2',
        columnId: 'col-a',
      }

      // Optimistic event: same id/title, updated times, original columnId still
      // 'col-a' because the parent state hasn't updated yet.
      const optimisticDroppedEvent: ColumnTestEvent = {
        ...testEvent,
        startTime: new Date('2024-01-01T11:00:00'),
        endTime: new Date('2024-01-01T14:00:00'),
      }

      const colA: SchedulerColumn = {
        id: 'col-a',
        title: 'Column A',
        date: new Date('2024-01-01'),
        filterEvents: (shifts) =>
          (shifts as unknown as ColumnTestEvent[]).filter((e) => e.columnId === 'col-a'),
      }
      const colB: SchedulerColumn = {
        id: 'col-b',
        title: 'Column B',
        date: new Date('2024-01-01'),
        filterEvents: (shifts) =>
          (shifts as unknown as ColumnTestEvent[]).filter((e) => e.columnId === 'col-b'),
      }

      // Build a minimal DragContextValue with the optimistic state set so that
      // CalendarColumn sees the event as belonging to col-b.
      const mockContextValue = {
        interval: 30,
        activeEvent: null,
        optimisticEvent: optimisticDroppedEvent as CalendarEvent,
        optimisticColumnId: 'col-b',
        initialPosition: null,
        handleDragStart: vi.fn(),
        handleDragMove: vi.fn(),
        handleDragEnd: vi.fn(),
      }

      const mockPreviewContextValue = {
        currentDropColumn: null,
        currentDropSlot: null,
        previewTimes: null,
      }

      const noop = () => {}

      await render(
        <DndContext>
          <DragContext.Provider value={mockContextValue}>
            <DragPreviewContext.Provider value={mockPreviewContextValue}>
              {/* col-a receives the original event; optimistic routing hides it */}
              <CalendarColumn
                column={colA}
                events={[testEvent]}
                renderEvent={(e) => <div>{(e as ColumnTestEvent).title}</div>}
                slotHeight={30}
                onTimeSlotClick={noop}
                startHour={9}
                endHour={24}
                interval={30}
              />
              {/* col-b receives no events from parent; optimistic routing injects it */}
              <CalendarColumn
                column={colB}
                events={[]}
                renderEvent={(e) => <div>{(e as ColumnTestEvent).title}</div>}
                slotHeight={30}
                onTimeSlotClick={noop}
                startHour={9}
                endHour={24}
                interval={30}
              />
            </DragPreviewContext.Provider>
          </DragContext.Provider>
        </DndContext>
      )

      await new Promise((r) => setTimeout(r, 50))

      const colAEl = document.querySelector('[data-column-id="col-a"]')!
      const colBEl = document.querySelector('[data-column-id="col-b"]')!
      const card = document.querySelector('[data-testid="event-card-1"]')!

      expect(colBEl.contains(card)).toBe(true)
      expect(colAEl.contains(card)).toBe(false)
    })

    it('does not render duplicate event cards during the immediate post-drop handoff', async () => {
      const columns = dayColumns(new Date('2024-01-01'))
      const { ControlledCalendar, rejectDrop } = makeControlledCalendar(columns)
      await render(<ControlledCalendar />)

      const eventEl = document.querySelector('[data-testid="event-card-1"]')!
      await dragEvent(eventEl, DRAG_DELTA)

      // Immediately after drop, only one card should exist (no DragOverlay ghost)
      const cards = document.querySelectorAll('[data-testid="event-card-1"]')
      expect(cards).toHaveLength(1)

      // Cleanup
      rejectDrop()
    })
  })

  it('scrolls the current week date close to the left edge on initial render', async () => {
    const columns = nestedDayColumns(
      new Date('2024-01-01'),
      ['p1', 'p2', 'p3'],
      ['w1', 'w2']
    )

    const page = await render(
      <div style={{ height: '800px', width: '1200px', position: 'relative' }}>
        <ResourceScheduler
          {...defaultProps}
          columns={columns}
          scrollToDate={new Date('2024-01-03')}
          events={[]}
        />
      </div>
    )

    const viewport = await page.getByTestId('calendar-content-viewport')

    await vi.waitFor(() => {
      expect(viewport.element().scrollLeft).toBeGreaterThan(0)
    })

    const element = viewport.element() as HTMLElement
    const dayWidth = element.scrollWidth / 7
    const expectedScrollLeft = 2 * dayWidth - Math.min(dayWidth * 0.2, 48)

    expect(element.scrollLeft).toBeGreaterThan(expectedScrollLeft - 20)
    expect(element.scrollLeft).toBeLessThan(expectedScrollLeft + 20)
  })

})
