import React from 'react'
import { SchedulerColumn } from '../../types'
import type { RenderColumnHeader } from '../../types/CalendarProps'
import { HeaderColumn } from './HeaderColumn'

interface HeaderProps {
  columns: SchedulerColumn[]
  columnWidth: number | string
  renderColumnHeader?: RenderColumnHeader
}

export const HeaderContext = React.createContext<{
  columns: SchedulerColumn[]
  headerHeight: number
}>({
  columns: [],
  headerHeight: 0,
})
export const useHeaderHeight = () => {
  const { headerHeight } = React.useContext(HeaderContext)
  const headerRef = React.useRef<HTMLDivElement>(null)
  return { headerRef, headerHeight }
}
export const Header: React.FC<HeaderProps> = ({
  columns = [],
  columnWidth,
  renderColumnHeader,
}) => {
  const { headerRef } = useHeaderHeight()
  return (
    <div
      ref={headerRef}
      data-testid={columns.length === 0 ? 'calendar-header-empty' : 'calendar-header'}
      className="rs-header"
    >
      {columns.length === 0 ? (
        <div className="rs-header-empty" />
      ) : (
        columns.map((column) => (
          <HeaderColumn
            key={column.id}
            column={column}
            columnWidth={columnWidth}
            depth={0}
            isLastInGroup={false}
            renderColumnHeader={renderColumnHeader}
          />
        ))
      )}
    </div>
  )
}
