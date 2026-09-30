import { SchedulerColumn, TimeSlot, CalendarEvent } from '../../types'
import { GridColumn } from './GridColumn'
import { isSameDay } from '../../utils/timeUtils'
import type { RenderEvent } from '../../types/CalendarProps'

interface CalendarGridProps<T extends CalendarEvent> {
  columns: SchedulerColumn[]
  events: T[]
  columnWidth: number
  slotHeight: number
  onTimeSlotClick: (timeSlot: TimeSlot, column: SchedulerColumn) => void
  onEventResize?: (event: T, newEnd: Date) => void | Promise<void>
  startHour: number
  endHour: number
  interval: number
  depth?: number
  /** Date for columns that don't set their own. */
  parentDate?: Date
  renderEvent: RenderEvent<T>
  droppableRef?: (node: HTMLElement | null) => void
}

export const CalendarGrid = <T extends CalendarEvent>({
  columns,
  events,
  columnWidth,
  slotHeight,
  onTimeSlotClick,
  onEventResize,
  startHour,
  endHour,
  interval,
  depth = 0,
  parentDate,
  renderEvent,
  droppableRef,
}: CalendarGridProps<T>) => {
  return (
    <div ref={droppableRef} className="rs-grid-row">
      {columns.map((column, index) => {
        const date = column.date ?? parentDate
        return (
          <GridColumn
            key={column.id}
            data-column-index={index}
            column={column}
            date={date}
            events={
              date ? events.filter((event) => isSameDay(new Date(event.startTime), date)) : events
            }
            columnWidth={columnWidth}
            slotHeight={slotHeight}
            onTimeSlotClick={onTimeSlotClick}
            onEventResize={onEventResize}
            startHour={startHour}
            endHour={endHour}
            interval={interval}
            depth={depth}
            renderEvent={renderEvent}
          />
        )
      })}
    </div>
  )
}
