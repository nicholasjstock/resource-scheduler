import React, { useRef } from 'react'
import './resource-scheduler.css'
import { CalendarLayout } from './CalendarLayout'
import { CalendarGrid } from './CalendarGrid/CalendarGrid'
import {
  EventRenderContext,
  RenderColumnHeader,
  RenderEvent,
  ResourceSchedulerProps,
} from '../types/CalendarProps'
import { useCalendarScroll } from '../hooks/useCalendarScroll'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import {
  useDragContext,
  useDragPreviewContext,
  DragProvider,
  DropHandler,
} from '../context/DragContext'
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core'
import { EventCard } from './CalendarGrid/EventCard'
import { SchedulerColumn, CalendarEvent, TimeSlot } from '../types'
import { ColumnLookupContext, findColumnById } from '../context/ColumnLookupContext'
import { SchedulerItem, useNormalizedEvents } from '../utils/normalizeEvents'

interface CalendarContentProps<T extends CalendarEvent> {
  sensors: ReturnType<typeof useSensors>
  columns: SchedulerColumn[]
  onEventDrop: DropHandler<T>
  onEventResize: (event: T, newEnd: Date) => void | Promise<void>
  contentRef: React.RefObject<HTMLDivElement | null>
  verticalScrollRef: React.RefObject<HTMLDivElement | null>
  timeRange: {
    start: number
    end: number
    interval: number
  }
  columnWidth: number
  slotHeight: number
  events: T[]
  onTimeSlotClick: (timeSlot: TimeSlot, column: SchedulerColumn) => void
  renderEvent: RenderEvent<T>
  renderColumnHeader?: RenderColumnHeader
  headerLeftContent?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

interface DragOverlayCardProps<T extends CalendarEvent> {
  activeEvent: T | null
  startHour: number
  interval: number
  slotHeight: number
  renderEvent: RenderEvent<T>
}

const DragOverlayCard = <T extends CalendarEvent>({
  activeEvent,
  startHour,
  interval,
  slotHeight,
  renderEvent,
}: DragOverlayCardProps<T>) => {
  const { previewTimes, currentDropColumn } = useDragPreviewContext()
  if (!activeEvent) return null
  return (
    <EventCard
      event={activeEvent}
      startHour={startHour}
      interval={interval}
      slotHeight={slotHeight}
      renderContent={renderEvent}
      collisionGroup={{ index: 0, total: 1 }}
      isDragOverlay
      columnId=""
      previewTimes={previewTimes}
      previewColumnId={currentDropColumn}
    />
  )
}

const CalendarContent = <T extends CalendarEvent>({
  sensors,
  columns,
  onEventDrop,
  onEventResize,
  contentRef,
  verticalScrollRef,
  timeRange,
  columnWidth,
  slotHeight,
  events,
  onTimeSlotClick,
  renderEvent,
  renderColumnHeader,
  headerLeftContent,
  className,
  style,
}: CalendarContentProps<T>) => {
  const { activeEvent, handleDragStart, handleDragMove, handleDragEnd } = useDragContext<T>()
  const { setNodeRef: setGridRef } = useDroppable({
    id: 'calendar-grid',
    data: { type: 'calendar-grid' },
  })

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={(event) => handleDragEnd(event, columns, onEventDrop)}
    >
      <CalendarLayout
        contentRef={contentRef}
        verticalScrollRef={verticalScrollRef}
        columns={columns}
        timeRange={timeRange}
        columnWidth={columnWidth}
        slotHeight={slotHeight}
        renderColumnHeader={renderColumnHeader}
        headerLeftContent={headerLeftContent}
        className={className}
        style={style}
      >
        <CalendarGrid
          columns={columns}
          events={events}
          startHour={timeRange.start}
          endHour={timeRange.end}
          interval={timeRange.interval}
          columnWidth={columnWidth}
          slotHeight={slotHeight}
          onTimeSlotClick={onTimeSlotClick}
          onEventResize={onEventResize}
          renderEvent={renderEvent}
          droppableRef={setGridRef}
        />

        <DragOverlay
          dropAnimation={null}
          modifiers={[
            ({ transform }) => ({
              ...transform,
              scaleX: 1,
              scaleY: 1,
            }),
          ]}
        >
          <DragOverlayCard
            activeEvent={activeEvent}
            startHour={timeRange.start}
            interval={timeRange.interval}
            slotHeight={slotHeight}
            renderEvent={renderEvent}
          />
        </DragOverlay>
      </CalendarLayout>
    </DndContext>
  )
}

export const ResourceScheduler = <T, C = unknown>({
  columns,
  events,
  timeAxis,
  columnWidth,
  slotHeight,
  scrollToDate,
  onSlotClick,
  onEventMove,
  onEventResize,
  renderEvent,
  onVisibleDateChange,
  corner,
  renderColumnHeader,
  keyboardScroll = true,
  accessors,
  className,
  style,
}: ResourceSchedulerProps<T, C>) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const verticalScrollRef = useRef<HTMLDivElement>(null)
  useCalendarScroll(contentRef, columns, scrollToDate, onVisibleDateChange)
  useKeyboardNavigation(verticalScrollRef, contentRef, keyboardScroll)

  const { startHour, endHour, slotMinutes } = timeAxis
  const timeRange = React.useMemo(
    () => ({ start: startHour, end: endHour, interval: slotMinutes }),
    [startHour, endHour, slotMinutes]
  )

  const items = useNormalizedEvents(events, accessors)
  // Internals work on SchedulerItems and untyped columns; translate at the boundary.
  const renderItem = React.useCallback<RenderEvent<SchedulerItem<T>>>(
    (item, ctx) => renderEvent(item.source, ctx as EventRenderContext<T, C>),
    [renderEvent]
  )
  const onItemDrop = React.useCallback<DropHandler<SchedulerItem<T>>>(
    (item, start, end, toColumn, fromColumn) =>
      onEventMove?.({
        event: item.source,
        start,
        end,
        toColumn: toColumn as SchedulerColumn<T, C> | null,
        fromColumn: fromColumn as SchedulerColumn<T, C> | null,
      }),
    [onEventMove]
  )
  const onItemResize = React.useCallback(
    (item: SchedulerItem<T>, end: Date) => onEventResize?.({ event: item.source, end }),
    [onEventResize]
  )
  const onTimeSlotClick = React.useCallback(
    (slot: TimeSlot, column: SchedulerColumn) =>
      onSlotClick?.({ start: slot.start, end: slot.end, column: column as SchedulerColumn<T, C> }),
    [onSlotClick]
  )

  const findColumn = React.useCallback((id: string) => findColumnById(columns, id), [columns])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <ColumnLookupContext.Provider value={findColumn}>
      <DragProvider
        slotHeight={slotHeight}
        interval={timeRange.interval}
        startHour={timeRange.start}
        endHour={timeRange.end}
        containerRef={contentRef}
      >
        <CalendarContent
          sensors={sensors}
          columns={columns}
          onEventDrop={onItemDrop}
          onEventResize={onItemResize}
          contentRef={contentRef}
          verticalScrollRef={verticalScrollRef}
          timeRange={timeRange}
          columnWidth={columnWidth}
          slotHeight={slotHeight}
          events={items}
          onTimeSlotClick={onTimeSlotClick}
          renderEvent={renderItem}
          renderColumnHeader={renderColumnHeader as RenderColumnHeader | undefined}
          headerLeftContent={corner}
          className={className}
          style={style}
        />
      </DragProvider>
    </ColumnLookupContext.Provider>
  )
}

export default ResourceScheduler
