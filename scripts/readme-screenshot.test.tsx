// Renders the demo scene used in the README and saves light and dark screenshots
// to docs/. Run with `npm run screenshot` (not part of `npm test`).
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { it } from 'vitest'
import { ResourceScheduler, type SchedulerColumn } from '../src/index'

type Shift = {
  id: string
  person: string
  title: string
  start: Date
  end: Date
  color: string
  editable?: boolean
}

const at = (day: number, h: number, m = 0) => new Date(2024, 0, 1 + day, h, m)
const people = ['Alice', 'Bruno', 'Chloé']
const days = ['Monday', 'Tuesday', 'Wednesday']
const colors = { floor: '#2563eb', stock: '#0d9488', till: '#9333ea', leave: '#6b7280' }

const shifts: Shift[] = [
  { id: '1', person: 'Alice', title: 'Shop floor', start: at(0, 8), end: at(0, 12), color: colors.floor },
  { id: '2', person: 'Alice', title: 'Delivery', start: at(0, 11), end: at(0, 13), color: colors.stock },
  { id: '3', person: 'Alice', title: 'Till', start: at(0, 12, 30), end: at(0, 16), color: colors.till },
  { id: '4', person: 'Bruno', title: 'Stockroom', start: at(0, 9), end: at(0, 15), color: colors.stock },
  { id: '5', person: 'Chloé', title: 'Annual leave', start: at(0, 8), end: at(0, 18), color: colors.leave, editable: false },
  { id: '6', person: 'Alice', title: 'Till', start: at(1, 10), end: at(1, 17), color: colors.till },
  { id: '7', person: 'Bruno', title: 'Shop floor', start: at(1, 8), end: at(1, 13), color: colors.floor },
  { id: '8', person: 'Chloé', title: 'Stockroom', start: at(1, 12), end: at(1, 18), color: colors.stock },
  { id: '9', person: 'Bruno', title: 'Shop floor', start: at(2, 9), end: at(2, 14), color: colors.floor },
  { id: '10', person: 'Chloé', title: 'Till', start: at(2, 8, 30), end: at(2, 12), color: colors.till },
  { id: '11', person: 'Chloé', title: 'Shop floor', start: at(2, 11), end: at(2, 15, 30), color: colors.floor },
]

const columns: SchedulerColumn<Shift, { person: string }>[] = days.map((day, index) => ({
  id: day.toLowerCase(),
  title: day,
  date: at(index, 0),
  children: people.map((person) => ({
    id: `${day.toLowerCase()}-${person}`,
    title: person,
    data: { person },
    filterEvents: (events) => events.filter((shift) => shift.person === person),
  })),
}))

const time = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

for (const theme of ['light', 'dark'] as const) {
  it(`screenshot (${theme})`, async () => {
    await page.viewport(1160, 580)
    await render(
      <div style={{ height: 580, width: 1160, fontFamily: 'system-ui, sans-serif' }}>
        <ResourceScheduler
          theme={theme}
          columns={columns}
          events={shifts}
          columnWidth={120}
          slotHeight={22}
          timeAxis={{ startHour: 8, endHour: 18, slotMinutes: 30 }}
          corner={<span style={{ fontSize: 12, fontWeight: 600 }}>Week 1</span>}
          renderEvent={(shift, ctx) => (
            <div
              style={{
                height: '100%',
                padding: '4px 6px',
                boxSizing: 'border-box',
                borderRadius: 5,
                background: ctx.editable ? shift.color : 'transparent',
                fontSize: 11,
                lineHeight: 1.3,
                overflow: 'hidden',
              }}
            >
              <strong>{shift.title}</strong>
              <div style={{ opacity: 0.85 }}>
                {time(ctx.displayStart)}–{time(ctx.displayEnd)}
              </div>
            </div>
          )}
        />
      </div>
    )
    await new Promise((resolve) => setTimeout(resolve, 300))
    await page.screenshot({ path: `../docs/screenshot-${theme}.png` })
  })
}
