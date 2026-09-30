import React from 'react'
import { TimeSlot } from '../../types'
import { useDragContext } from '../../context/DragContext'

interface TimeSlotCellProps {
  timeSlot: TimeSlot
  height: number
  onClick: () => void
  columnId: string
  testId?: string
  dropTargetHeight: number
  isDropTarget: boolean
}

const TimeSlotCellBase: React.FC<TimeSlotCellProps> = ({
  timeSlot,
  height,
  onClick,
  columnId,
  testId,
  dropTargetHeight,
  isDropTarget,
}) => {
  const { initialPosition, interval } = useDragContext()

  const isInitialPosition =
    initialPosition &&
    initialPosition.columnId === columnId &&
    timeSlot.start.getTime() === initialPosition.start.getTime()

  const className = [
    'rs-slot',
    isDropTarget ? 'rs-slot--drop-target' : '',
    isInitialPosition ? 'rs-slot--drag-origin' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      onClick={onClick}
      data-testid={testId}
      className={className}
      style={
        {
          height,
          '--rs-drop-height': `${dropTargetHeight}px`,
          '--rs-origin-height': initialPosition
            ? `${(initialPosition.duration / (60 * 1000 * interval)) * height}px`
            : undefined,
        } as React.CSSProperties
      }
    />
  )
}

export const TimeSlotCell = React.memo(TimeSlotCellBase, (prev, next) => {
  return (
    prev.isDropTarget === next.isDropTarget &&
    prev.dropTargetHeight === next.dropTargetHeight &&
    prev.height === next.height &&
    prev.timeSlot.start.getTime() === next.timeSlot.start.getTime() &&
    prev.columnId === next.columnId
  )
})
