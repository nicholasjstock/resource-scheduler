import { test, expect, describe } from 'vitest'
import { render } from 'vitest-browser-react'
import { Header } from '../'

describe('Header', () => {
  const mockColumns = [
    {
      id: 'monday',
      title: 'Monday',
      children: [
        {
          id: 'hot',
          title: 'Hot Kitchen',
          children: [
            { id: 'w1', title: 'Worker 1' },
            { id: 'w2', title: 'Worker 2' },
          ],
        },
        {
          id: 'cold',
          title: 'Cold Kitchen',
          children: [{ id: 'w3', title: 'Worker 3' }],
        },
      ],
    },
  ]

  test('renders all hierarchy levels correctly', async () => {
    const page = await render(<Header columns={mockColumns} columnWidth={200} />)
    const header = await page.getByTestId('calendar-header')
    // Get elements through header locator
    const dayLevels = Array.from(header.element().querySelectorAll<HTMLElement>('[data-depth="0"]'))
    expect(dayLevels.length).toBe(1)

    expect(dayLevels[0].innerHTML).toContain('Monday')

    const kitchenLevels = Array.from(header.element().querySelectorAll<HTMLElement>('[data-depth="1"]'))
    expect(kitchenLevels.length).toBe(2)
    expect(kitchenLevels[0].innerHTML).toContain('Hot Kitchen')
    expect(kitchenLevels[1].innerHTML).toContain('Cold Kitchen')

    const workerLevels = Array.from(header.element().querySelectorAll<HTMLElement>('[data-depth="2"]'))
    expect(workerLevels.length).toBe(3)
    expect(workerLevels[0].innerHTML).toContain('Worker 1')
    expect(workerLevels[2].innerHTML).toContain('Worker 3')
  })

  test('maintains correct column widths for leaf nodes', async () => {
    const page = await render(<Header columns={mockColumns} columnWidth={200} />)
    const header = await page.getByTestId('calendar-header')
    const leafNodes = Array.from(header.element().querySelectorAll<HTMLElement>('[data-depth="2"]'))
    for (const node of leafNodes) {
      const styles = window.getComputedStyle(node)
      expect(styles.width).toBe('200px')
    }
  })
})
