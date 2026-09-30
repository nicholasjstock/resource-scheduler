import React from 'react'
import { SchedulerColumn, TimeSlot, CalendarEvent } from '../../types'
import { CalendarColumn } from './CalendarColumn'
import { getGridBorderStyle } from '../../utils/borderUtils'
import { CalendarGrid } from './CalendarGrid'
import { HeaderContext } from '../Header'
import { getEffectiveBorderDepth } from '../../utils/depthUtils'
import { sourceOf } from '../../utils/normalizeEvents'
import type { RenderEvent } from '../../types/CalendarProps'

interface GridColumnProps<T extends CalendarEvent> {
  column: SchedulerColumn
  events: T[]
  columnWidth: number
  slotHeight: number
  onTimeSlotClick: (timeSlot: TimeSlot, column: SchedulerColumn) => void
  onEventResize?: (event: T, newEnd: Date) => void | Promise<void>
  startHour: number
  endHour: number
  interval: number
  depth: number
  renderEvent: RenderEvent<T>
  /** Date inherited from the parent column, if this column has none. */
  date?: Date
  'data-column-index'?: number
}

export const GridColumn = <T extends CalendarEvent>({
  column,
  events,
  columnWidth,
  slotHeight,
  onTimeSlotClick,
  onEventResize,
  startHour,
  endHour,
  interval,
  depth,
  renderEvent,
  date,
  'data-column-index': columnIndex,
}: GridColumnProps<T>) => {
  const { columns } = React.useContext(HeaderContext)

  // filterEvents works on the caller's records; keep the items whose record survives.
  const filteredEvents = React.useMemo(() => {
    if (!column.filterEvents) return events
    const kept = new Set<unknown>(column.filterEvents(events.map(sourceOf)))
    return events.filter((event) => kept.has(sourceOf(event)))
  }, [column, events])

  // If this is a parent node, render all children
  if (column.children && column.children.length > 0) {
    return (
      <CalendarGrid
        columns={column.children}
        events={filteredEvents}
        slotHeight={slotHeight}
        onTimeSlotClick={onTimeSlotClick}
        onEventResize={onEventResize}
        startHour={startHour}
        endHour={endHour}
        interval={interval}
        columnWidth={columnWidth}
        depth={depth + 1}
        parentDate={date}
        renderEvent={renderEvent}
      />
    )
  }

  const effectiveBorderDepth = getEffectiveBorderDepth(columns, column)

  return (
    <div
      data-testid={`grid-column-${column.id}`}
      data-depth={depth}
      data-column-index={columnIndex}
      className="rs-leaf"
      style={{
        width: columnWidth,
        flexBasis: columnWidth,
        borderRight: getGridBorderStyle(effectiveBorderDepth.depth),
      }}
    >
      <CalendarColumn
        column={column}
        date={date}
        events={filteredEvents}
        slotHeight={slotHeight}
        onTimeSlotClick={onTimeSlotClick}
        onEventResize={onEventResize}
        startHour={startHour}
        endHour={endHour}
        interval={interval}
        renderEvent={renderEvent}
      />
    </div>
  )
}
