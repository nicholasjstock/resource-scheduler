import { TimeSlot } from '../types'

function getMinutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function getAdjustedMinutes(date: Date, anchorMinutes: number) {
  const minutes = getMinutesSinceMidnight(date)
  return minutes < anchorMinutes ? minutes + 24 * 60 : minutes
}

export function generateTimeSlots(
  startHour: number,
  endHour: number,
  interval: number,
  date: Date = new Date()
): TimeSlot[] {
  // Handle overnight case
  const totalHours = endHour > startHour ? endHour - startHour : endHour + 24 - startHour

  // Return empty array if start equals end (0 hours) or negative hours
  if (totalHours <= 0 || startHour === endHour) {
    return []
  }

  const slots: TimeSlot[] = []
  const totalMinutes = totalHours * 60
  const totalSlots = Math.floor(totalMinutes / interval)

  // Set the base date to midnight of the input date
  const baseDate = new Date(date)
  baseDate.setHours(0, 0, 0, 0)

  for (let i = 0; i < totalSlots; i++) {
    const slotStartMinutes = i * interval

    const start = new Date(baseDate)
    start.setHours(startHour)
    start.setMinutes(0)
    start.setMilliseconds(0)
    start.setTime(start.getTime() + slotStartMinutes * 60 * 1000)

    const end = new Date(start.getTime() + interval * 60 * 1000)

    slots.push({
      id: `slot-${i}`,
      start,
      end,
    })
  }

  return slots
}

export const calculateEventPosition = (
  start: Date,
  end: Date,
  startHour: number,
  interval: number,
  slotHeight: number
) => {
  const calendarStartMinutes = startHour * 60
  const { top, height } = calculateRangePosition(start, end, calendarStartMinutes, interval, slotHeight)

  return {
    top,
    height,
  }
}

export const calculateRangePosition = (
  start: Date,
  end: Date,
  anchorStartMinutes: number,
  interval: number,
  slotHeight: number
) => {
  const startMinutes = getAdjustedMinutes(start, anchorStartMinutes)
  const endMinutes = getAdjustedMinutes(end, startMinutes)
  const relativeStartMinutes = startMinutes - anchorStartMinutes
  const duration = endMinutes - startMinutes

  // Convert to slot positions
  const top = Math.round((relativeStartMinutes / interval) * slotHeight)
  const height = Math.max(Math.round((duration / interval) * slotHeight), slotHeight) // Ensure minimum height of one slot

  return {
    top,
    height,
  }
}

/** True when both dates fall on the same local calendar day. */
export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
