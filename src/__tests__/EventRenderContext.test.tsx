import { render } from 'vitest-browser-react'
import { describe, it, expect, vi } from 'vitest'
import { ResourceScheduler } from '../index'
import { dayColumns, TestEvent } from '../test-utils/fixtures'
import type { EventRenderContext } from '../types/CalendarProps'

const columns = dayColumns(new Date('2024-01-01'))

const event: TestEvent = {
  id: '1',
  title: 'Morning',
  start: new Date('2024-01-01T09:00:00'),
  end: new Date('2024-01-01T12:00:00'),
}

describe('renderEvent', () => {
  it('receives the original event and a render context', async () => {
    const renderEvent = vi.fn((e: TestEvent, _ctx: EventRenderContext) => <div>{e.title}</div>)

    await render(
      <div style={{ height: '800px', width: '1200px' }}>
        <ResourceScheduler
          columns={columns}
          events={[event]}
          columnWidth={200}
          slotHeight={30}
          timeAxis={{ startHour: 9, endHour: 17, slotMinutes: 30 }}
          scrollToDate={new Date('2024-01-01')}
          onEventMove={vi.fn()}
          onEventResize={vi.fn()}
          renderEvent={renderEvent}
        />
      </div>
    )

    await vi.waitFor(() => expect(renderEvent).toHaveBeenCalled())
    const [renderedEvent, ctx] = renderEvent.mock.calls.at(-1)!

    expect(renderedEvent).toBe(event)
    expect(ctx).toMatchObject({
      isDragOverlay: false,
      isPending: false,
      editable: true,
      previewTimes: null,
      previewColumn: null,
      slotMinutes: 30,
      slotHeight: 30,
    })
    expect(ctx.displayStart.getTime()).toBe(event.start.getTime())
    expect(ctx.displayEnd.getTime()).toBe(event.end.getTime())
    expect(ctx.resizeHandleProps['data-testid']).toBe('event-resize-handle-1')
    expect(typeof ctx.resizeHandleProps.onPointerDown).toBe('function')
  })
})
