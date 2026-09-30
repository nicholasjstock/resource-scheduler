import { test, expect, vi, describe } from 'vitest'
import { render } from 'vitest-browser-react'
import { CalendarGrid } from '../CalendarGrid'
import { SchedulerColumn } from '../../../types'
import { DndContext } from '@dnd-kit/core'
import { DragProvider } from '../../../context/DragContext'

describe('CalendarGrid', () => {
  const mockHandlers = {
    onTimeSlotClick: vi.fn(),
  }

  const defaultProps = {
    events: [],
    slotHeight: 30,
    onTimeSlotClick: mockHandlers.onTimeSlotClick,
    startHour: 9,
    endHour: 24,
    interval: 30,
    columnWidth: 200,
    renderEvent: () => null,
  }

  test('renders a simple grid with single-level columns', async () => {
    const columns: SchedulerColumn[] = [
      { id: 'col1', title: 'Column 1' },
      { id: 'col2', title: 'Column 2' },
      { id: 'col3', title: 'Column 3' },
    ]

    const page = await render(
      <DndContext>
        <DragProvider slotHeight={30} interval={30} startHour={9} endHour={24} containerRef={{ current: null }}>
          <CalendarGrid {...defaultProps} columns={columns} />
        </DragProvider>
      </DndContext>
    )

    for (const column of columns) {
      const locator = await page.getByTestId(`grid-column-${column.id}`)
      const element = locator.element()
      expect(element).toBeDefined()
      expect(element).toHaveAttribute('data-depth', '0')
    }
  })

  test('renders a grid with three-level hierarchy', async () => {
    const columns: SchedulerColumn[] = [
      {
        id: 'monday',
        title: 'Monday',
        children: [
          {
            id: 'monday-perimeter-1',
            title: 'Kitchen 1',
            children: [
              { id: 'monday-perimeter-1-worker-w1', title: 'Chef 1' },
              { id: 'monday-perimeter-1-worker-w2', title: 'Chef 2' },
            ],
          },
          {
            id: 'monday-perimeter-2',
            title: 'Kitchen 2',
            children: [
              { id: 'monday-perimeter-2-worker-w3', title: 'Chef 3' },
              { id: 'monday-perimeter-2-worker-w4', title: 'Chef 4' },
            ],
          },
        ],
      },
    ]

    const page = await render(
      <DndContext>
        <DragProvider slotHeight={30} interval={30} startHour={9} endHour={24} containerRef={{ current: null }}>
          <CalendarGrid {...defaultProps} columns={columns} />
        </DragProvider>
      </DndContext>
    )

    // Check all leaf nodes (workers) are rendered
    const workers = [
      { id: 'monday-perimeter-1-worker-w1' },
      { id: 'monday-perimeter-1-worker-w2' },
      { id: 'monday-perimeter-2-worker-w3' },
      { id: 'monday-perimeter-2-worker-w4' },
    ]

    for (const worker of workers) {
      const locator = await page.getByTestId(`grid-column-${worker.id}`)
      const element = locator.element()
      expect(element).toBeDefined()
      expect(element).toHaveAttribute('data-depth', '2')
    }
  })
})
