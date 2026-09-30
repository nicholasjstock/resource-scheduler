export interface CalendarEvent {
  id: string
  startTime: Date | string
  endTime: Date | string
  editable?: boolean
  color?: string
  title?: string
}
