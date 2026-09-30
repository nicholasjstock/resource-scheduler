import React from 'react'
import { CalendarEvent } from '../../types'
import { EventCard } from './EventCard'
import { assignLanes } from '../../utils/collisionLayout'
import type { RenderEvent } from '../../types/CalendarProps'

interface CollisionGroupProps<T extends CalendarEvent> {
  events: T[]
  startHour: number
  interval: number
  slotHeight: number
  renderEvent: RenderEvent<T>
  columnId: string
  onEventResize?: (event: T, newEnd: Date) => void | Promise<void>
  previewColumnId?: string | null
  activeEventId?: string
}

const CollisionGroupBase = <T extends CalendarEvent>({
  events,
  startHour,
  interval,
  slotHeight,
  renderEvent,
  columnId,
  onEventResize,
  previewColumnId,
  activeEventId,
}: CollisionGroupProps<T>) => {
  const placedEvents = React.useMemo(() => assignLanes(events), [events])

  return (
    <div className="rs-collision-group">
      {placedEvents.map(({ event, lane, laneCount }) => (
        <EventCard
          key={event.id}
          event={event}
          startHour={startHour}
          interval={interval}
          slotHeight={slotHeight}
          renderContent={renderEvent}
          collisionGroup={{
            index: lane,
            total: laneCount,
          }}
          columnId={columnId}
          onEventResize={onEventResize}
          previewColumnId={event.id === activeEventId ? previewColumnId : null}
        />
      ))}
    </div>
  )
}

export const CollisionGroup = React.memo(CollisionGroupBase) as typeof CollisionGroupBase
