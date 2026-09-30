import { render } from 'vitest-browser-react'
import { describe, it, expect } from 'vitest'
import { ResourceScheduler } from '../index'
import { dayColumns, TestEvent } from '../test-utils/fixtures'

const baseProps = {
  columns: dayColumns(new Date('2024-01-01')),
  events: [] as TestEvent[],
  columnWidth: 200,
  slotHeight: 30,
  timeAxis: { startHour: 9, endHour: 12, slotMinutes: 60 },
  renderEvent: (e: TestEvent) => <div>{e.title}</div>,
}

const LIGHT_BG = 'rgb(255, 255, 255)'
const DARK_BG = 'rgb(22, 24, 31)'

const gridBackground = () =>
  window.getComputedStyle(document.querySelector<HTMLElement>('.rs-column')!).backgroundColor

describe('theme', () => {
  it('is light by default', async () => {
    await render(<ResourceScheduler {...baseProps} />)

    expect(gridBackground()).toBe(LIGHT_BG)
  })

  it('uses the dark palette with theme="dark"', async () => {
    await render(<ResourceScheduler {...baseProps} theme="dark" />)

    expect(gridBackground()).toBe(DARK_BG)
  })

  it('follows the colour-scheme preference with theme="auto"', async () => {
    await render(<ResourceScheduler {...baseProps} theme="auto" />)

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    expect(gridBackground()).toBe(prefersDark ? DARK_BG : LIGHT_BG)
  })

  it('lets --rs-* variables override the theme', async () => {
    await render(
      <ResourceScheduler
        {...baseProps}
        theme="dark"
        style={{ '--rs-bg': 'rgb(1, 2, 3)' } as React.CSSProperties}
      />
    )

    expect(gridBackground()).toBe('rgb(1, 2, 3)')
  })

  it('lets a className rule override the theme', async () => {
    const styleTag = document.createElement('style')
    styleTag.textContent = '.custom-palette { --rs-bg: rgb(4, 5, 6); }'
    document.head.appendChild(styleTag)
    try {
      await render(<ResourceScheduler {...baseProps} theme="dark" className="custom-palette" />)

      expect(gridBackground()).toBe('rgb(4, 5, 6)')
    } finally {
      styleTag.remove()
    }
  })
})
