// Renders the README demo scene (shared with the live demo) and saves light and
// dark screenshots to docs/. Run with `npm run screenshot` (not part of `npm test`).
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { it } from 'vitest'
import { ResourceScheduler } from '../src/index'
import { BookingCard, demoBookings, demoColumns, demoWeekStart } from '../demo/scene'

const weekStart = demoWeekStart(new Date(2024, 0, 1))

for (const theme of ['light', 'dark'] as const) {
  it(`screenshot (${theme})`, async () => {
    await page.viewport(1160, 580)
    await render(
      <div style={{ height: 580, width: 1160, fontFamily: 'system-ui, sans-serif' }}>
        <ResourceScheduler
          theme={theme}
          columns={demoColumns(weekStart)}
          events={demoBookings(weekStart)}
          columnWidth={120}
          slotHeight={22}
          timeAxis={{ startHour: 8, endHour: 18, slotMinutes: 30 }}
          corner={<span style={{ fontSize: 12, fontWeight: 600 }}>Week 1</span>}
          renderEvent={(booking, ctx) => <BookingCard booking={booking} ctx={ctx} />}
        />
      </div>
    )
    await new Promise((resolve) => setTimeout(resolve, 300))
    await page.screenshot({ path: `../docs/screenshot-${theme}.png` })
  })
}
