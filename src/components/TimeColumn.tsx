import React from 'react'
import { TimeSlot } from '../types'

interface TimeColumnProps {
  timeSlots: TimeSlot[]
  slotHeight: number
}

export const TimeColumn: React.FC<TimeColumnProps> = ({ timeSlots, slotHeight }) => {
  return (
    <div className="time-column rs-time-column" data-testid="time-column">
      {timeSlots.map((slot) => (
        <div
          key={slot.start.toString()}
          className="time-slot rs-time-label"
          data-testid="time-slot"
          style={{ height: slotHeight, minHeight: slotHeight, maxHeight: slotHeight }}
        >
          {slot.start.getHours().toString().padStart(2, '0')}:
          {slot.start.getMinutes().toString().padStart(2, '0')}
        </div>
      ))}
    </div>
  )
}
