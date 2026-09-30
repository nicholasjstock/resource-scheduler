import { test, expect, vi, describe } from 'vitest'
import { render } from 'vitest-browser-react'
import { GridColumn } from '../GridColumn'
import { SchedulerColumn } from '../../../types'
import { DndContext } from '@dnd-kit/core'
import { DragProvider } from '../../../context/DragContext'

describe('GridColumn', () => {
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
    depth: 0,
    renderEvent: () => null,
  }

  test('renders a leaf node correctly', async () => {
    const leafColumn: SchedulerColumn = {
      id: 'leaf',
      title: 'Leaf Node',
    }
    const page = await render(
      <DndContext>
        <DragProvider slotHeight={30} interval={30} startHour={9} endHour={24} containerRef={{ current: null }}>
          <GridColumn {...defaultProps} column={leafColumn} />
        </DragProvider>
      </DndContext>
    )

    const locator = await page.getByTestId('grid-column-leaf')
    expect(locator).toBeDefined()
    const element = locator.element()
    expect(element).toHaveAttribute('data-depth', '0')
  })

  test('increments depth for nested columns', async () => {
    const nestedColumn: SchedulerColumn = {
      id: 'parent',
      title: 'Parent',
      children: [
        {
          id: 'child',
          title: 'Child',
          children: [{ id: 'grandchild', title: 'Grandchild' }],
        },
      ],
    }

    const page = await render(
      <DndContext>
        <DragProvider slotHeight={30} interval={30} startHour={9} endHour={24} containerRef={{ current: null }}>
          <GridColumn {...defaultProps} column={nestedColumn} />
        </DragProvider>
      </DndContext>
    )

    const grandchildLocator = await page.getByTestId('grid-column-grandchild')
    const grandchild = grandchildLocator.element()
    expect(grandchild).toHaveAttribute('data-depth', '2')
  })

  test('renders all leaf nodes for a three-level structure', async () => {
    const threeLevelColumn: SchedulerColumn = {
      id: 'region',
      title: 'EMEA',
      children: [
        {
          id: 'dept1',
          title: 'Engineering',
          children: [
            { id: 'team1', title: 'Frontend' },
            { id: 'team2', title: 'Backend' },
          ],
        },
        {
          id: 'dept2',
          title: 'Product',
          children: [
            { id: 'team3', title: 'Design' },
            { id: 'team4', title: 'Research' },
          ],
        },
      ],
    }

    const page = await render(
      <DndContext>
        <DragProvider slotHeight={30} interval={30} startHour={9} endHour={24} containerRef={{ current: null }}>
          <GridColumn {...defaultProps} column={threeLevelColumn} />
        </DragProvider>
      </DndContext>
    )

    // Verify all leaf nodes (teams) are present
    const teams = ['team1', 'team2', 'team3', 'team4']

    for (const teamId of teams) {
      const locator = await page.getByTestId(`grid-column-${teamId}`)
      const element = locator.element()
      expect(element).toBeDefined()
      expect(element).toHaveAttribute('data-depth', '2')
    }
  })
})
