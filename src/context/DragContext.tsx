import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { CalendarEvent, TimeSlot, SchedulerColumn } from '../types'
import { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import { generateTimeSlots } from '../utils/timeUtils'
import { findColumnById } from './ColumnLookupContext'

/** Internal drop callback; the Calendar root adapts it to the public onEventMove. */
export type DropHandler<T> = (
  event: T,
  newStart: Date,
  newEnd: Date,
  targetColumn: SchedulerColumn | null,
  fromColumn: SchedulerColumn | null
) => void | Promise<void>

// Cold context — changes only on drag start/end/drop. Components subscribed here
// do NOT re-render during drag move.
interface DragContextValue<T extends CalendarEvent> {
  activeEvent: T | null
  optimisticEvent: T | null
  optimisticColumnId: string | null
  initialPosition: { columnId: string; start: Date; duration: number } | null
  interval: number
  handleDragStart: (event: DragStartEvent) => void
  handleDragMove: (event: DragMoveEvent) => void
  handleDragEnd: (
    event: DragEndEvent,
    columns: SchedulerColumn[],
    onEventDrop: DropHandler<T>
  ) => void | Promise<void>
}

// Hot context — changes on every pointermove. Only CalendarColumn subscribes to
// this, keeping EventCard / TimeSlotCell / CalendarContent out of the hot path.
interface DragPreviewContextValue {
  currentDropColumn: string | null
  currentDropSlot: TimeSlot | null
  previewTimes: { start: Date; end: Date } | null
}

export const DragContext = createContext<DragContextValue<CalendarEvent> | null>(null)
export const DragPreviewContext = createContext<DragPreviewContextValue | null>(null)

function findColumnFromPoint(
  root: HTMLElement | null,
  x: number,
  y: number
): { columnId: string; element: HTMLElement } | null {
  if (!root) return null
  // Columns scrolled out of view still report rects under whatever is next to
  // the container, so only accept points inside the container's visible area.
  const bounds = root.getBoundingClientRect()
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null
  const candidates = root.querySelectorAll<HTMLElement>('[data-column-id]')
  for (const el of Array.from(candidates)) {
    const rect = el.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      const columnId = el.dataset.columnId
      if (columnId) return { columnId, element: el }
    }
  }
  return null
}

// Snaps the dragged card's top edge to the nearest slot, keeping the whole event
// inside the grid. Returns a negative index when the event is longer than the grid.
function dropSlotIndex(
  cardTop: number,
  slotHeight: number,
  slotCount: number,
  durationMs: number,
  interval: number
): number {
  const eventSlots = Math.ceil(durationMs / (60 * 1000) / interval)
  const maxStartSlot = slotCount - eventSlots
  return Math.min(Math.max(0, Math.round(cardTop / slotHeight)), maxStartSlot)
}

interface DragProviderProps {
  children: React.ReactNode
  slotHeight: number
  interval: number
  startHour: number
  endHour: number
  /** Only columns inside this element are drop targets. */
  containerRef: React.RefObject<HTMLElement | null>
}

export function DragProvider<T extends CalendarEvent>({
  children,
  slotHeight,
  interval,
  startHour,
  endHour,
  containerRef,
}: DragProviderProps) {
  const [activeEvent, setActiveEvent] = useState<T | null>(null)
  const [optimisticEvent, setOptimisticEvent] = useState<T | null>(null)
  const [optimisticColumnId, setOptimisticColumnId] = useState<string | null>(null)
  const [initialPosition, setInitialPosition] = useState<{
    columnId: string
    start: Date
    duration: number
  } | null>(null)
  const [previewTimes, setPreviewTimes] = useState<{ start: Date; end: Date } | null>(null)
  const [currentDropColumn, setCurrentDropColumn] = useState<string | null>(null)
  const [currentDropSlot, setCurrentDropSlot] = useState<TimeSlot | null>(null)

  // Ref mirrors so handleDragEnd always reads the latest values without stale closure issues
  const currentDropColumnRef = useRef<string | null>(null)
  const currentDropSlotRef = useRef<TimeSlot | null>(null)

  // Ref mirrors for active/initial so calculateDropPosition and handleDragMove can
  // be stable useCallbacks without closing over state directly.
  const activeEventRef = useRef<T | null>(null)
  const initialPositionRef = useRef<{ columnId: string; start: Date; duration: number } | null>(null)

  // Track native pointer position — more reliable than active.rect.current.translated
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null)
  // Distance from the card's top edge to where it was grabbed, so the card keeps
  // its position under the pointer instead of jumping its top edge to the pointer.
  const grabOffsetYRef = useRef(0)
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      pointerPositionRef.current = { x: e.clientX, y: e.clientY }
    }
    document.addEventListener('pointermove', handler)
    return () => document.removeEventListener('pointermove', handler)
  }, [])

  // Keep ref mirrors in sync
  const setActiveEventWithRef = useCallback((event: T | null) => {
    activeEventRef.current = event
    setActiveEvent(event)
  }, [])

  const setInitialPositionWithRef = useCallback(
    (pos: { columnId: string; start: Date; duration: number } | null) => {
      initialPositionRef.current = pos
      setInitialPosition(pos)
    },
    []
  )

  // Stable: reads from refs, no state deps
  const calculateDropPosition = useCallback(
    (
      columnId: string,
      clientY: number,
      columnElement: HTMLElement,
      slotHeightArg: number,
      timeSlots: TimeSlot[],
      intervalArg: number
    ) => {
      const rect = columnElement.getBoundingClientRect()
      const cardTop = clientY - grabOffsetYRef.current - rect.top

      if (!activeEventRef.current) return

      const eventDuration = initialPositionRef.current?.duration || intervalArg * 60 * 1000
      const boundedSlotIndex = dropSlotIndex(
        cardTop,
        slotHeightArg,
        timeSlots.length,
        eventDuration,
        intervalArg
      )

      if (boundedSlotIndex >= 0 && boundedSlotIndex < timeSlots.length) {
        const newSlot = timeSlots[boundedSlotIndex]
        setCurrentDropColumn(columnId)
        currentDropColumnRef.current = columnId
        setCurrentDropSlot(newSlot)
        currentDropSlotRef.current = newSlot

        const newStart = newSlot.start
        const newEnd = new Date(newStart.getTime() + eventDuration)
        setPreviewTimes({ start: newStart, end: newEnd })
      }
    },
    [] // stable: reads activeEventRef / initialPositionRef, writes via setters
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const eventData = active.data.current as {
      event: T
      columnId: string
    }
    const activator = event.activatorEvent as PointerEvent | null
    const card = (activator?.target as HTMLElement | null)?.closest?.('[data-event-id]')
    grabOffsetYRef.current =
      activator && card ? activator.clientY - card.getBoundingClientRect().top : 0
    setActiveEventWithRef(eventData.event)
    setInitialPositionWithRef({
      columnId: eventData.columnId,
      start: new Date(eventData.event.startTime),
      duration:
        new Date(eventData.event.endTime).getTime() -
        new Date(eventData.event.startTime).getTime(),
    })
  }, [setActiveEventWithRef, setInitialPositionWithRef])

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active } = event
      if (!active) return

      try {
        const eventData = active.data.current as {
          type: string
          event: T
          columnId: string
          originalDuration: number
        }

        if (eventData?.type !== 'calendar-event') return

        const pos = pointerPositionRef.current
        if (!pos) return

        const col = findColumnFromPoint(containerRef.current, pos.x, pos.y)
        if (col) {
          const columnDate = col.element.dataset.columnDate
            ? new Date(col.element.dataset.columnDate)
            : new Date()
          calculateDropPosition(
            col.columnId,
            pos.y,
            col.element,
            slotHeight,
            generateTimeSlots(startHour, endHour, interval, columnDate),
            interval
          )
        } else {
          setCurrentDropColumn(null)
          currentDropColumnRef.current = null
          setCurrentDropSlot(null)
          currentDropSlotRef.current = null
          setPreviewTimes(null)
        }
      } catch (error) {
        console.error('Error in handleDragMove:', error)
      }
    },
    [calculateDropPosition, slotHeight, startHour, endHour, interval, containerRef]
  )

  const handleDragEnd = useCallback(
    async (
      event: DragEndEvent,
      columns: SchedulerColumn[],
      onEventDrop: DropHandler<T>
    ) => {
      const { active } = event

      const dropColumn = currentDropColumnRef.current
      const dropSlot = currentDropSlotRef.current

      let resolvedColumn = dropColumn
      let resolvedSlot = dropSlot
      if ((!resolvedColumn || !resolvedSlot) && active) {
        const pos = pointerPositionRef.current
        if (pos) {
          const col = findColumnFromPoint(containerRef.current, pos.x, pos.y)
          if (col) {
            const columnDate = col.element.dataset.columnDate
              ? new Date(col.element.dataset.columnDate)
              : new Date()
            const timeSlots = generateTimeSlots(startHour, endHour, interval, columnDate)
            const rect = col.element.getBoundingClientRect()
            const slotIndex = dropSlotIndex(
              pos.y - grabOffsetYRef.current - rect.top,
              slotHeight,
              timeSlots.length,
              initialPositionRef.current?.duration || interval * 60 * 1000,
              interval
            )
            resolvedColumn = col.columnId
            resolvedSlot = timeSlots[slotIndex] ?? null
          }
        }
      }

      let droppedEvent: T | null = null
      let newStart: Date | null = null
      let newEnd: Date | null = null
      let targetColumn: SchedulerColumn | null = null
      let fromColumn: SchedulerColumn | null = null

      if (active && resolvedColumn && resolvedSlot) {
        const eventData = active.data.current as {
          type: string
          event: T
          columnId: string
          originalDuration: number
        }
        if (eventData?.type === 'calendar-event') {
          droppedEvent = eventData.event
          targetColumn = findColumnById(columns, resolvedColumn)
          fromColumn = findColumnById(columns, eventData.columnId)
          newStart = resolvedSlot.start
          newEnd = new Date(newStart.getTime() + eventData.originalDuration)
          setOptimisticEvent({ ...droppedEvent, startTime: newStart, endTime: newEnd, editable: false } as T)
          setOptimisticColumnId(resolvedColumn)
        }
      }

      setActiveEventWithRef(null)
      setInitialPositionWithRef(null)
      setPreviewTimes(null)
      setCurrentDropColumn(null)
      currentDropColumnRef.current = null
      setCurrentDropSlot(null)
      currentDropSlotRef.current = null

      if (!active || !resolvedColumn || !resolvedSlot || !droppedEvent || !newStart || !newEnd) return

      if (typeof onEventDrop === 'function') {
        try {
          await onEventDrop(droppedEvent, newStart, newEnd, targetColumn, fromColumn)
        } catch {
          // A rejected onEventMove is the documented way to refuse a move: the
          // event rolls back when the optimistic state is cleared below.
        }
        setOptimisticEvent(null)
        setOptimisticColumnId(null)
      }
    },
    [startHour, endHour, interval, slotHeight, containerRef, setActiveEventWithRef, setInitialPositionWithRef]
  )

  // Cold context value — only changes on drag start/end/drop, NOT during drag move.
  const interactionValue = useMemo(
    () => ({
      activeEvent,
      optimisticEvent,
      optimisticColumnId,
      initialPosition,
      interval,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeEvent, optimisticEvent, optimisticColumnId, initialPosition, interval]
    // handlers are stable useCallbacks; omitting them from deps intentionally to avoid
    // rebuilding the context object when props like slotHeight change mid-drag.
  )

  // Hot context value — changes on every pointermove.
  const previewValue = useMemo(
    () => ({ currentDropColumn, currentDropSlot, previewTimes }),
    [currentDropColumn, currentDropSlot, previewTimes]
  )

  return (
    <DragContext.Provider value={interactionValue as DragContextValue<CalendarEvent>}>
      <DragPreviewContext.Provider value={previewValue}>
        {children}
      </DragPreviewContext.Provider>
    </DragContext.Provider>
  )
}

export function useDragContext<T extends CalendarEvent>() {
  const context = useContext(DragContext)
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider')
  }
  return context as DragContextValue<T>
}

export function useDragPreviewContext() {
  const context = useContext(DragPreviewContext)
  if (!context) {
    throw new Error('useDragPreviewContext must be used within a DragProvider')
  }
  return context
}
