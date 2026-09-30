import { describe, it, expect } from 'vitest'
import { generateTimeSlots } from '../timeUtils'

describe('generateTimeSlots', () => {
  it('generates correct number of slots for given time range and interval', () => {
    const slots = generateTimeSlots(9, 17, 30) // 9AM to 5PM with 30-minute intervals

    // 8 hours * 2 slots per hour = 16 slots
    expect(slots).toHaveLength(16)
  })

  it('generates slots with correct start and end times', () => {
    const slots = generateTimeSlots(9, 11, 30) // 9AM to 11AM with 30-minute intervals

    // Check first slot
    expect(slots[0].start.getHours()).toBe(9)
    expect(slots[0].start.getMinutes()).toBe(0)
    expect(slots[0].end.getHours()).toBe(9)
    expect(slots[0].end.getMinutes()).toBe(30)

    // Check last slot
    const lastSlot = slots[slots.length - 1]
    expect(lastSlot.start.getHours()).toBe(10)
    expect(lastSlot.start.getMinutes()).toBe(30)
    expect(lastSlot.end.getHours()).toBe(11)
    expect(lastSlot.end.getMinutes()).toBe(0)
  })

  it('handles different interval sizes', () => {
    const slots15min = generateTimeSlots(9, 10, 15) // 1 hour with 15-minute intervals
    expect(slots15min).toHaveLength(4)

    const slots60min = generateTimeSlots(9, 12, 60) // 3 hours with 60-minute intervals
    expect(slots60min).toHaveLength(3)
  })

  it('generates slots across midnight', () => {
    const slots = generateTimeSlots(22, 2, 30) // 10PM to 2AM with 30-minute intervals

    expect(slots).toHaveLength(8)

    // Check progression of hours
    expect(slots[0].start.getHours()).toBe(22) // 10 PM
    expect(slots[3].start.getHours()).toBe(23) // 11:30 PM
    expect(slots[4].start.getHours()).toBe(0) // 12 AM
    expect(slots[7].start.getHours()).toBe(1) // 1:30 AM
  })

  it('maintains consistent interval sizes', () => {
    const slots = generateTimeSlots(9, 11, 30)

    slots.forEach((slot) => {
      const duration = slot.end.getTime() - slot.start.getTime()
      expect(duration).toBe(30 * 60 * 1000) // 30 minutes in milliseconds
    })
  })

  it('handles edge case of start time equal to end time', () => {
    const slots = generateTimeSlots(9, 9, 30)
    expect(slots).toHaveLength(0)
  })
})
