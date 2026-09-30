import type React from 'react'
import type { ReactNode } from 'react'
import { SchedulerColumn } from '../types'

/** Second argument to renderEvent: everything the scheduler knows about how the event is shown. */
export interface EventRenderContext<T = unknown, C = unknown> {
  /** True for the copy that follows the pointer while dragging. */
  isDragOverlay: boolean
  /** A move or resize for this event is waiting on its callback's promise. */
  isPending: boolean
  /** False while pending or when the event isn't editable. */
  editable: boolean
  /** Start/end as currently displayed, including an in-progress resize. */
  displayStart: Date
  displayEnd: Date
  /** Where a dragged event would land (drag overlay only). */
  previewTimes: { start: Date; end: Date } | null
  /** Column a dragged or just-dropped event is heading to. */
  previewColumn: SchedulerColumn<T, C> | null
  /** Spread onto the element that should act as the bottom resize handle. */
  resizeHandleProps: {
    onPointerDown: React.PointerEventHandler<HTMLElement>
    'data-testid': string
  }
  /** Lower-level resize hooks, for handles that manage their own pointer events. */
  onResizePreview: (deltaY: number) => void
  onResizeEnd: (deltaY: number) => void
  slotMinutes: number
  slotHeight: number
}

export type RenderEvent<T, C = unknown> = (event: T, ctx: EventRenderContext<T, C>) => ReactNode

export interface EventMove<T, C = unknown> {
  event: T
  start: Date
  end: Date
  /** Column the event was dragged from. */
  fromColumn: SchedulerColumn<T, C> | null
  /** Column it was dropped on. */
  toColumn: SchedulerColumn<T, C> | null
}

export interface EventResize<T> {
  event: T
  end: Date
}

export interface SlotClick<T, C = unknown> {
  start: Date
  end: Date
  column: SchedulerColumn<T, C>
}

/** The shape the default accessors read. Any other shape works with `accessors`. */
export interface SchedulerEvent {
  id: string
  start: Date | string
  end: Date | string
  editable?: boolean
}

/** How the scheduler reads an event. Keep the object stable (module scope or useMemo). */
export interface EventAccessors<T> {
  getId?: (event: T) => string
  getStart?: (event: T) => Date | string
  getEnd?: (event: T) => Date | string
  isEditable?: (event: T) => boolean
}

export interface TimeAxis {
  /** First hour shown, 0–23. */
  startHour: number
  /** Hour the grid ends at, 1–24. */
  endHour: number
  /** Minutes per slot row (and the snapping step for moves and resizes). */
  slotMinutes: number
}

export type RenderColumnHeader<T = unknown, C = unknown> = (
  column: SchedulerColumn<T, C>,
  info: { depth: number; defaultContent: ReactNode }
) => ReactNode

interface ResourceSchedulerBaseProps<T, C> {
  columns: SchedulerColumn<T, C>[]
  events: T[]
  timeAxis: TimeAxis
  /** Width of each leaf column, in px. */
  columnWidth: number
  /** Height of each slot row, in px. */
  slotHeight: number
  renderEvent: RenderEvent<T, C>
  /** Called when an empty slot is clicked. */
  onSlotClick?: (slot: SlotClick<T, C>) => void
  /** Called when an event is dropped. Return a promise to keep it in place until it settles; reject to roll back. */
  onEventMove?: (move: EventMove<T, C>) => void | Promise<void>
  /** Called when an event's end is dragged. Same promise semantics as onEventMove. */
  onEventResize?: (resize: EventResize<T>) => void | Promise<void>
  /** Scrolls horizontally so the column for this date is in view (on mount and when it changes). */
  scrollToDate?: Date
  /** Reports the date of the column centred in view after the user scrolls. */
  onVisibleDateChange?: (date: Date) => void
  /** Content for the top-left cell above the time labels. */
  corner?: ReactNode
  /** Replace or extend a header cell; `defaultContent` is the built-in title. */
  renderColumnHeader?: RenderColumnHeader<T, C>
  /** Arrow keys scroll the grid while it has focus. Default true. */
  keyboardScroll?: boolean
  /** Built-in palette: light (default), dark, or auto (follows prefers-color-scheme). */
  theme?: 'light' | 'dark' | 'auto'
  /** Class for the root element (which carries the --rs-* theme variables). */
  className?: string
  /** Inline style for the root element, e.g. `{ '--rs-event-bg': '#0af' }`. */
  style?: React.CSSProperties
}

/** `accessors` may be omitted only when events already have `id`/`start`/`end`. */
export type ResourceSchedulerProps<T, C = unknown> = ResourceSchedulerBaseProps<T, C> &
  ([T] extends [SchedulerEvent] ? { accessors?: EventAccessors<T> } : { accessors: EventAccessors<T> })
