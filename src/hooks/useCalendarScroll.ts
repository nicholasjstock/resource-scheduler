import { RefObject, useCallback, useEffect, useRef } from 'react'
import { SchedulerColumn } from '../types'
import { isSameDay } from '../utils/timeUtils'

export const useCalendarScroll = (
  contentRef: RefObject<HTMLDivElement | null>,
  columns: SchedulerColumn[],
  currentDate: Date | undefined,
  onDateChange?: (date: Date) => void
) => {
  const hasScrolledToDate = useRef(false)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScrollPosition = useRef<number>(0)
  const scrollAnimationFrame = useRef<number | null>(null)
  const scrollAttempts = useRef(0)
  const isAutoScrolling = useRef(false)

  const findCenteredColumn = useCallback(
    (container: HTMLElement, scrollLeft: number) => {
      const columnWidth = container.scrollWidth / columns.length
      const centerPosition = scrollLeft + container.clientWidth / 2
      const columnIndex = Math.floor(centerPosition / columnWidth)
      return columns[columnIndex]
    },
    [columns]
  )

  const getColumnScrollPosition = useCallback(
    (container: HTMLElement, column: SchedulerColumn) => {
      const columnWidth = container.scrollWidth / columns.length
      const columnIndex = columns.findIndex((col) => col.id === column.id)
      return columnIndex * columnWidth
    },
    [columns]
  )

  useEffect(() => {
    hasScrolledToDate.current = false
    scrollAttempts.current = 0
    if (scrollAnimationFrame.current !== null) {
      cancelAnimationFrame(scrollAnimationFrame.current)
      scrollAnimationFrame.current = null
    }
    isAutoScrolling.current = false
  }, [currentDate, columns])

  useEffect(() => {
    if (!contentRef.current || !currentDate) return

    const container = contentRef.current
    const currentColumn = columns.find((col) => col.date && isSameDay(col.date, currentDate))

    if (!currentColumn || hasScrolledToDate.current) return

    const attemptScrollToDate = () => {
      if (!contentRef.current || hasScrolledToDate.current) return

      const columnWidth = container.scrollWidth / columns.length
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)

      if (columnWidth <= 0 || maxScrollLeft <= 0) {
        if (scrollAttempts.current < 10) {
          scrollAttempts.current += 1
          scrollAnimationFrame.current = requestAnimationFrame(attemptScrollToDate)
        }
        return
      }

      const scrollPosition = getColumnScrollPosition(container, currentColumn)
      const peekBeforeCurrentColumn = Math.min(columnWidth * 0.2, 48)
      isAutoScrolling.current = true
      container.scrollLeft = Math.max(
        0,
        Math.min(maxScrollLeft, scrollPosition - peekBeforeCurrentColumn)
      )
      lastScrollPosition.current = container.scrollLeft
      hasScrolledToDate.current = true
      scrollAnimationFrame.current = requestAnimationFrame(() => {
        isAutoScrolling.current = false
      })
    }

    attemptScrollToDate()

    return () => {
      if (scrollAnimationFrame.current !== null) {
        cancelAnimationFrame(scrollAnimationFrame.current)
        scrollAnimationFrame.current = null
      }
    }
  }, [contentRef, currentDate, columns, getColumnScrollPosition])

  useEffect(() => {
    if (!contentRef.current || !onDateChange) return

    const container = contentRef.current
    const handleScroll = () => {
      if (isAutoScrolling.current) return

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }

      const currentScrollPosition = container.scrollLeft
      if (Math.abs(currentScrollPosition - lastScrollPosition.current) > 50) {
        scrollTimeout.current = setTimeout(() => {
          const centeredColumn = findCenteredColumn(container, currentScrollPosition)
          if (centeredColumn?.date) {
            onDateChange(centeredColumn.date)
          }
          lastScrollPosition.current = currentScrollPosition
        }, 150)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [contentRef, onDateChange, findCenteredColumn])
}
