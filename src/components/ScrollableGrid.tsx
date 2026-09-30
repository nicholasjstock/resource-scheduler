import React, { useEffect, useRef, useState } from 'react'
import { HeaderContext } from './Header'
import { SchedulerColumn } from '../types'

interface ScrollableGridProps {
  leftColumn?: React.ReactNode
  headerLeftContent?: React.ReactNode
  leftColumnWidth?: number | string
  verticalScrollTestId?: string
  content: {
    header: React.ReactNode
    body: React.ReactNode
  }
  contentRef?: React.RefObject<HTMLDivElement | null>
  verticalScrollRef?: React.RefObject<HTMLDivElement | null>
  columns: SchedulerColumn[]
}

export const ScrollableGrid: React.FC<ScrollableGridProps> = ({
  leftColumn,
  headerLeftContent,
  leftColumnWidth = 60,
  verticalScrollTestId,
  content,
  contentRef: externalContentRef,
  verticalScrollRef,
  columns,
}) => {
  const internalContentRef = useRef<HTMLDivElement>(null)
  const contentRef = externalContentRef || internalContentRef
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const contentInnerRef = useRef<HTMLDivElement>(null)
  const scrollbarTrackRef = useRef<HTMLDivElement>(null)
  const isDraggingScrollbar = useRef(false)
  const dragStartX = useRef(0)
  const dragStartScrollLeft = useRef(0)
  const [horizontalMetrics, setHorizontalMetrics] = useState({
    clientWidth: 0,
    scrollWidth: 0,
    scrollLeft: 0,
  })

  useEffect(() => {
    const viewport = contentRef.current
    const headerViewport = headerScrollRef.current
    const inner = contentInnerRef.current
    if (!viewport || !headerViewport || !inner) return

    const updateMetrics = () => {
      headerViewport.scrollLeft = viewport.scrollLeft
      setHorizontalMetrics({
        clientWidth: viewport.clientWidth,
        scrollWidth: inner.scrollWidth,
        scrollLeft: viewport.scrollLeft,
      })
    }

    updateMetrics()

    const resizeObserver = new ResizeObserver(updateMetrics)
    resizeObserver.observe(viewport)
    resizeObserver.observe(inner)
    viewport.addEventListener('scroll', updateMetrics)

    return () => {
      resizeObserver.disconnect()
      viewport.removeEventListener('scroll', updateMetrics)
    }
  }, [contentRef])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingScrollbar.current) return

      const viewport = contentRef.current
      const track = scrollbarTrackRef.current
      if (!viewport || !track) return

      const maxScrollLeft = horizontalMetrics.scrollWidth - horizontalMetrics.clientWidth
      const visibleThumbWidth =
        horizontalMetrics.scrollWidth > 0
          ? Math.max(
              48,
              (horizontalMetrics.clientWidth / horizontalMetrics.scrollWidth) * horizontalMetrics.clientWidth
            )
          : 0
      const maxTrackTravel = track.clientWidth - visibleThumbWidth

      if (maxTrackTravel <= 0 || maxScrollLeft <= 0) return

      const deltaX = event.clientX - dragStartX.current
      const scrollDelta = (deltaX / maxTrackTravel) * maxScrollLeft
      viewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, dragStartScrollLeft.current + scrollDelta))
    }

    const handlePointerUp = () => {
      isDraggingScrollbar.current = false
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [contentRef, horizontalMetrics.clientWidth, horizontalMetrics.scrollWidth])

  const maxScrollLeft = Math.max(0, horizontalMetrics.scrollWidth - horizontalMetrics.clientWidth)
  const thumbWidth =
    horizontalMetrics.scrollWidth > 0
      ? Math.max(
          48,
          (horizontalMetrics.clientWidth / horizontalMetrics.scrollWidth) * horizontalMetrics.clientWidth
        )
      : 0
  const maxThumbOffset = Math.max(0, horizontalMetrics.clientWidth - thumbWidth)
  const thumbOffset =
    maxScrollLeft > 0 ? (horizontalMetrics.scrollLeft / maxScrollLeft) * maxThumbOffset : 0
  const showHorizontalScrollbar = maxScrollLeft > 0
  const resolvedLeftColumnWidth =
    typeof leftColumnWidth === 'number' ? `${leftColumnWidth}px` : leftColumnWidth

  return (
    <HeaderContext.Provider value={{ columns, headerHeight: 0 }}>
      <div className="rs-frame">
        <div className="rs-frame-header">
          {leftColumn && (
            <div
              className="rs-corner"
              style={{ width: resolvedLeftColumnWidth }}
              data-testid="calendar-header-left-slot"
            >
              {headerLeftContent}
            </div>
          )}

          <div ref={headerScrollRef} className="rs-frame-header-viewport">
            <div className="rs-frame-header-inner">{content.header}</div>
          </div>
        </div>

        <div
          ref={verticalScrollRef}
          data-testid={verticalScrollTestId}
          tabIndex={0}
          className="rs-frame-body"
        >
          <div className="rs-frame-row">
            {leftColumn && (
              <div className="rs-frame-left" style={{ width: resolvedLeftColumnWidth }}>
                {leftColumn}
              </div>
            )}

            <div className="rs-frame-content">
              <div
                ref={contentRef}
                data-testid="calendar-content-viewport"
                className="rs-frame-viewport"
              >
                <div ref={contentInnerRef} className="rs-frame-content-inner">
                  {content.body}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showHorizontalScrollbar && (
          <div className="rs-hscroll">
            <div
              ref={scrollbarTrackRef}
              className="rs-hscroll-track"
              onPointerDown={(event) => {
                const track = scrollbarTrackRef.current
                const viewport = contentRef.current
                if (!track || !viewport) return

                const trackRect = track.getBoundingClientRect()
                const clickOffset = event.clientX - trackRect.left
                const clickedThumb =
                  clickOffset >= thumbOffset && clickOffset <= thumbOffset + thumbWidth

                if (clickedThumb) {
                  isDraggingScrollbar.current = true
                  dragStartX.current = event.clientX
                  dragStartScrollLeft.current = viewport.scrollLeft
                  return
                }

                const targetThumbOffset = Math.max(
                  0,
                  Math.min(maxThumbOffset, clickOffset - thumbWidth / 2)
                )
                const targetScrollLeft =
                  maxThumbOffset > 0 ? (targetThumbOffset / maxThumbOffset) * maxScrollLeft : 0
                viewport.scrollLeft = targetScrollLeft
              }}
            >
              <div
                className="rs-hscroll-thumb"
                style={{ width: `${thumbWidth}px`, transform: `translateX(${thumbOffset}px)` }}
              />
            </div>
          </div>
        )}
      </div>
    </HeaderContext.Provider>
  )
}
