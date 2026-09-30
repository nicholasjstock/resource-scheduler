import React from 'react'
import { TimeColumn } from './TimeColumn'
import { ScrollableGrid } from './ScrollableGrid'
import { Header } from './Header'
import { SchedulerColumn } from '../types'
import type { RenderColumnHeader } from '../types/CalendarProps'
import { generateTimeSlots } from '../utils/timeUtils'

const countLeafColumns = (calendarColumns: SchedulerColumn[]): number => {
  return calendarColumns.reduce((count, column) => {
    if (!column.children || column.children.length === 0) {
      return count + 1
    }
    return count + countLeafColumns(column.children)
  }, 0)
}

interface CalendarLayoutProps {
  contentRef: React.RefObject<HTMLDivElement | null>
  verticalScrollRef: React.RefObject<HTMLDivElement | null>
  headerLeftContent?: React.ReactNode
  columns: SchedulerColumn[]
  timeRange: {
    start: number
    end: number
    interval: number
  }
  columnWidth: number
  slotHeight: number
  renderColumnHeader?: RenderColumnHeader
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  theme?: 'light' | 'dark' | 'auto'
}

export const CalendarLayout = ({
  contentRef,
  verticalScrollRef,
  headerLeftContent,
  columns,
  timeRange,
  columnWidth,
  slotHeight,
  renderColumnHeader,
  children,
  className,
  style,
  theme = 'light',
}: CalendarLayoutProps) => {
  const timeSlots = React.useMemo(
    () => generateTimeSlots(timeRange.start, timeRange.end, timeRange.interval),
    [timeRange.start, timeRange.end, timeRange.interval]
  )

  const totalHeight = React.useMemo(
    () => timeSlots.length * slotHeight,
    [timeSlots.length, slotHeight]
  )

  const leafColumnCount = React.useMemo(() => countLeafColumns(columns), [columns])

  const weekContentWidth = React.useMemo(
    () => `${leafColumnCount * columnWidth}px`,
    [leafColumnCount, columnWidth]
  )

  const header = React.useMemo(
    () => (
      <Header
        columns={columns}
        columnWidth={columnWidth}
        renderColumnHeader={renderColumnHeader}
      />
    ),
    [columns, columnWidth, renderColumnHeader]
  )

  const body = React.useMemo(
    () => (
      <div
        className="rs-body"
        style={{ width: weekContentWidth, minWidth: weekContentWidth, height: totalHeight }}
      >
        {children}
      </div>
    ),
    [weekContentWidth, totalHeight, children]
  )

  return (
    <div
      className={['rs-root', className].filter(Boolean).join(' ')}
      style={style}
      data-rs-theme={theme}
    >
      <ScrollableGrid
        contentRef={contentRef}
        verticalScrollRef={verticalScrollRef}
        columns={columns}
        headerLeftContent={headerLeftContent}
        leftColumn={<TimeColumn timeSlots={timeSlots} slotHeight={slotHeight} />}
        content={{
          header,
          body,
        }}
      />
    </div>
  )
}
