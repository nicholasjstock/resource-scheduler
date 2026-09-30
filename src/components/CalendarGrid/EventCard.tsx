import React from 'react'
import { CalendarEvent, SchedulerColumn } from '../../types'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useDragContext } from '../../context/DragContext'
import type { EventRenderContext, RenderEvent } from '../../types/CalendarProps'
import { useColumnLookup } from '../../context/ColumnLookupContext'

interface EventCardProps<T extends CalendarEvent> {
  event: T
  startHour: number
  interval: number
  slotHeight: number
  renderContent: RenderEvent<T>
  collisionGroup: {
    index: number
    total: number
  }
  isDragOverlay?: boolean
  columnId: string
  previewTimes?: { start: Date; end: Date } | null
  previewColumnId?: string | null
  onEventResize?: (event: T, newEnd: Date) => void | Promise<void>
}

const EventCardBase = <T extends CalendarEvent>({
  event,
  startHour,
  interval,
  slotHeight,
  renderContent,
  collisionGroup,
  isDragOverlay,
  columnId,
  previewTimes,
  previewColumnId: previewColumnIdProp,
  onEventResize,
}: EventCardProps<T>) => {
  const { optimisticEvent, optimisticColumnId, activeEvent } = useDragContext<T>()
  const findColumn = useColumnLookup()
  const [resizePreviewEnd, setResizePreviewEnd] = React.useState<Date | null>(null)
  const [pendingResizeEnd, setPendingResizeEnd] = React.useState<Date | null>(null)
  const [isResizePending, setIsResizePending] = React.useState(false)

  // While an optimistic position is pending (async drop in-flight), render the
  // event at the dropped slot rather than the original props position.
  const positionSource =
    !isDragOverlay && optimisticEvent?.id === event.id ? optimisticEvent : event

  // While an event is being dropped or resized, show non-editable styling
  const isEditableSource = isDragOverlay
    ? event.editable
    : isResizePending || (optimisticEvent?.id === event.id && optimisticEvent.editable === false)
      ? false
      : event.editable

  const isInteractive = !isDragOverlay && isEditableSource !== false
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `event-${event.id}`,
    disabled: !isInteractive,
    data: {
      type: 'calendar-event',
      event,
      columnId,
      startHour,
      interval,
      originalDuration: new Date(event.endTime).getTime() - new Date(event.startTime).getTime(),
    },
  })

  const start = new Date(positionSource.startTime)
  const end = new Date(
    !isDragOverlay && resizePreviewEnd ? resizePreviewEnd : positionSource.endTime
  )
  const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes()
  const duration = (end.getTime() - start.getTime()) / 1000 / 60

  // Calculate position and size
  const top = isDragOverlay ? 0 : (startMinutes / interval) * slotHeight
  const height = (duration / interval) * slotHeight
  const width = `${100 / collisionGroup.total}%`
  const left = isDragOverlay ? 0 : `${(collisionGroup.index * 100) / collisionGroup.total}%`

  React.useEffect(() => {
    if (!pendingResizeEnd) return

    const currentEndMs = new Date(event.endTime).getTime()
    if (currentEndMs === pendingResizeEnd.getTime()) {
      setResizePreviewEnd(null)
      setPendingResizeEnd(null)
    }
  }, [event.endTime, pendingResizeEnd])

  const calculateNextEndTime = React.useCallback(
    (deltaY: number) => {
      const startTime = new Date(event.startTime)
      const originalEndTime = new Date(event.endTime)
      const originalDurationMs = originalEndTime.getTime() - startTime.getTime()
      const originalSlots = Math.max(1, Math.round(originalDurationMs / (interval * 60 * 1000)))
      const slotDelta = Math.round(deltaY / slotHeight)
      const nextSlots = Math.max(1, originalSlots + slotDelta)
      return new Date(startTime.getTime() + nextSlots * interval * 60 * 1000)
    },
    [event.endTime, event.startTime, interval, slotHeight]
  )

  const handleResizePreview = React.useCallback(
    (deltaY: number) => {
      if (isDragOverlay) return
      setResizePreviewEnd(calculateNextEndTime(deltaY))
    },
    [calculateNextEndTime, isDragOverlay]
  )

  const handleResize = React.useCallback(
    (deltaY: number) => {
      if (isDragOverlay) return

      const nextEndTime = calculateNextEndTime(deltaY)
      setResizePreviewEnd(nextEndTime)
      setPendingResizeEnd(nextEndTime)
      setIsResizePending(true)

      // If onEventResize is not provided, just clear the pending state after a delay
      if (!onEventResize) {
        setTimeout(() => {
          setIsResizePending(false)
        }, 100)
        return
      }

      void Promise.resolve(onEventResize(event, nextEndTime))
        .then(() => {
          setIsResizePending(false)
        })
        .catch(() => {
          setResizePreviewEnd(null)
          setPendingResizeEnd(null)
          setIsResizePending(false)
        })
    },
    [calculateNextEndTime, event, isDragOverlay, onEventResize]
  )

  const handleResizeHandlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.stopPropagation()
      e.preventDefault()
      if (!e.isPrimary || e.button !== 0) return
      if (isEditableSource === false) return

      const startY = e.clientY
      let latestY = e.clientY

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== e.pointerId) return
        latestY = moveEvent.clientY
        handleResizePreview(latestY - startY)
      }

      const handleEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== e.pointerId) return
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', handleEnd)
        document.removeEventListener('pointercancel', handleEnd)
        handleResize(latestY - startY)
      }

      e.currentTarget.setPointerCapture?.(e.pointerId)
      document.addEventListener('pointermove', handleMove)
      document.addEventListener('pointerup', handleEnd)
      document.addEventListener('pointercancel', handleEnd)
    },
    [handleResize, handleResizePreview, isEditableSource]
  )

  const previewColumnId =
    previewColumnIdProp ??
    (!isDragOverlay && optimisticEvent?.id === event.id ? optimisticColumnId : null)

  const renderContext: EventRenderContext<T> = {
    isDragOverlay: !!isDragOverlay,
    isPending: isResizePending || (!isDragOverlay && optimisticEvent?.id === event.id),
    editable: isEditableSource !== false,
    displayStart: new Date(event.startTime),
    displayEnd: new Date(!isDragOverlay && resizePreviewEnd ? resizePreviewEnd : event.endTime),
    previewTimes: previewTimes ?? null,
    previewColumn: (previewColumnId ? findColumn(previewColumnId) : null) as SchedulerColumn<T> | null,
    resizeHandleProps: {
      onPointerDown: handleResizeHandlePointerDown,
      'data-testid': `event-resize-handle-${event.id}`,
    },
    onResizePreview: handleResizePreview,
    onResizeEnd: handleResize,
    slotMinutes: interval,
    slotHeight,
  }

  return (
    <div
      ref={setNodeRef}
      {...(isInteractive ? { ...attributes, ...listeners } : {})}
      className={[
        'rs-event',
        isEditableSource === false ? 'rs-event--locked' : '',
        isInteractive ? 'rs-event--interactive' : '',
        isDragOverlay ? 'rs-event--overlay' : '',
        activeEvent?.id === event.id && !isDragOverlay ? 'rs-event--dragging-source' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        top: `${top}px`,
        left,
        width,
        height: `${height}px`,
        transform: transform && !isDragOverlay ? CSS.Transform.toString(transform) : undefined,
      }}
      data-testid={`event-card-${event.id}`}
      data-event-id={event.id}
      data-editable={isEditableSource === false ? 'false' : 'true'}
    >
      {renderContent(event, renderContext)}
    </div>
  )
}

export const EventCard = React.memo(EventCardBase) as typeof EventCardBase
