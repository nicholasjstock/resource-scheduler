import { useEffect, RefObject } from 'react'

// Arrow keys scroll the grid while focus is inside it. The listener sits on the
// vertical scroll container (made focusable by ScrollableGrid), not on window,
// so arrow keys elsewhere on the page are left alone.
export function useKeyboardNavigation(
  verticalScrollRef: RefObject<HTMLDivElement | null>,
  horizontalScrollRef: RefObject<HTMLDivElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    const container = verticalScrollRef.current
    if (!enabled || !container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      // Skip if user is typing in an input or textarea
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        horizontalScrollRef.current?.scrollBy({ left: -80 })
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        horizontalScrollRef.current?.scrollBy({ left: 80 })
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        container.scrollBy({ top: -80, behavior: 'smooth' })
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        container.scrollBy({ top: 80, behavior: 'smooth' })
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [enabled, horizontalScrollRef, verticalScrollRef])
}
