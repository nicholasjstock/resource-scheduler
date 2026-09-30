import { useMemo } from 'react'
import { SchedulerColumn, TimeSlot, CalendarEvent } from '../../types'
import { TimeSlotCell } from './TimeSlotCell'
import { generateTimeSlots } from '../../utils/timeUtils'
import { CollisionGroup } from './CollisionGroup'
import { EventCard } from './EventCard'
import { useDragContext, useDragPreviewContext } from '../../context/DragContext'
import { useCollisionGroups } from '../../hooks/useCollisionGroups'
import type { RenderEvent } from '../../types/CalendarProps'

interface CalendarColumnProps<T extends CalendarEvent> {
  column: SchedulerColumn
  events: T[]
  renderEvent: RenderEvent<T>
  slotHeight: number
  onTimeSlotClick: (timeSlot: TimeSlot, column: SchedulerColumn) => void
  onEventResize?: (event: T, newEnd: Date) => void | Promise<void>
  startHour: number
  endHour: number
  interval: number
  /** Effective date (own or inherited). */
  date?: Date
}

export const CalendarColumn = <T extends CalendarEvent>({
  column,
  events,
  renderEvent,
  slotHeight,
  onTimeSlotClick,
  onEventResize,
  startHour,
  endHour,
  interval,
  date,
}: CalendarColumnProps<T>) => {
  const columnDate = date ?? column.date ?? new Date()
  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour, interval, columnDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startHour, endHour, interval, columnDate.toISOString()]
  )
  const { activeEvent, optimisticEvent, optimisticColumnId } = useDragContext<T>()
  const { currentDropColumn, currentDropSlot } = useDragPreviewContext()

  // While an optimistic drop is pending, route the event to the target column
  // and hide it from every other column so it doesn't appear in two places.
  const effectiveEvents = useMemo(() => {
    if (!optimisticEvent || !optimisticColumnId) return events
    if (optimisticColumnId === column.id) {
      // Target column: add the event if filterEvents excluded it (cross-column drop)
      if (!events.some((e) => e.id === optimisticEvent.id)) {
        return [...events, optimisticEvent as T]
      }
      return events
    }
    // Any other column: remove the event so it doesn't linger in the source column
    return events.filter((e) => e.id !== optimisticEvent.id)
  }, [events, optimisticEvent, optimisticColumnId, column.id])

  // Render the optimistic event directly, outside the collision groups, for the entire
  // duration that optimisticEvent is set (not just until it appears in the events prop).
  // The RTK Query updateQueryData fires synchronously when the mutation is dispatched,
  // so the event can appear in props while optimisticEvent is still set — we must
  // keep rendering it directly until the optimistic state is cleared.
  const isOptimisticForThisColumn =
    !!optimisticEvent &&
    optimisticColumnId === column.id

  // Always group effectiveEvents (including the optimistic event) so that when
  // optimisticEvent is cleared, collisionGroups already contain it — no blank flash
  // between the direct render and the grouped render.
  const collisionGroups = useCollisionGroups(effectiveEvents)

  // While rendering the optimistic event directly, exclude it from the collision
  // groups to avoid double-rendering it.
  const renderCollisionGroups = useMemo(
    () =>
      isOptimisticForThisColumn
        ? collisionGroups
            .map((group) => group.filter((e) => e.id !== optimisticEvent!.id))
            .filter((g) => g.length > 0)
        : collisionGroups,
    [collisionGroups, isOptimisticForThisColumn, optimisticEvent]
  )

  const dropTargetHeight = useMemo(() => {
    if (!activeEvent) return slotHeight
    const duration =
      new Date(activeEvent.endTime).getTime() - new Date(activeEvent.startTime).getTime()
    const durationMinutes = duration / (60 * 1000)
    return (durationMinutes / interval) * slotHeight
  }, [activeEvent, slotHeight, interval])

  return (
    <div
      id={column.domId}
      data-column-id={column.id}
      data-column-date={columnDate.toISOString()}
      className="rs-column"
      style={{ height: `${timeSlots.length * slotHeight}px` }}
    >
      {/* Time slots layer */}
      <div className="rs-slot-layer">
        {timeSlots.map((slot) => (
          <TimeSlotCell
            key={`${column.id}-${slot.start.toISOString()}`}
            timeSlot={slot}
            height={slotHeight}
            onClick={() => onTimeSlotClick(slot, column)}
            columnId={column.id}
            testId={`time-slot-${column.id}-${slot.start.toISOString()}`}
            dropTargetHeight={dropTargetHeight}
            isDropTarget={
              currentDropColumn === column.id &&
              currentDropSlot?.start.getTime() === slot.start.getTime()
            }
          />
        ))}
      </div>

      {/* Events overlay */}
      <div className="rs-event-layer">
        {renderCollisionGroups.map((group, index) => (
          <CollisionGroup
            key={`group-${index}`}
            events={group}
            startHour={startHour}
            interval={interval}
            slotHeight={slotHeight}
            renderEvent={renderEvent}
            columnId={column.id}
            onEventResize={onEventResize}
            previewColumnId={currentDropColumn}
            activeEventId={activeEvent?.id}
          />
        ))}
        {isOptimisticForThisColumn && (
          <EventCard
            event={optimisticEvent as T}
            startHour={startHour}
            interval={interval}
            slotHeight={slotHeight}
            renderContent={renderEvent}
            collisionGroup={{ index: 0, total: 1 }}
            columnId={column.id}
            onEventResize={onEventResize}
          />
        )}
      </div>
    </div>
  )
}
