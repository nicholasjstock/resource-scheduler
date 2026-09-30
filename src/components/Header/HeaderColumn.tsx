import React from 'react'
import { SchedulerColumn } from '../../types'
import type { RenderColumnHeader } from '../../types/CalendarProps'
import { getBorderStyle } from '../../utils/borderUtils'
import { getLevelHeight } from '../../utils/headerUtils'

interface HeaderColumnProps {
  column: SchedulerColumn
  columnWidth: number | string
  depth: number
  isLastInGroup: boolean
  renderColumnHeader?: RenderColumnHeader
}

export const HeaderColumn: React.FC<HeaderColumnProps> = ({
  column,
  columnWidth,
  depth,
  isLastInGroup,
  renderColumnHeader,
}) => {
  const isLeafNode = !column.children || column.children.length === 0

  // Calculate total leaf nodes under this column
  const getLeafCount = (col: SchedulerColumn): number => {
    if (!col.children || col.children.length === 0) return 1
    return col.children.reduce((sum, child) => sum + getLeafCount(child), 0)
  }

  const leafCount = getLeafCount(column)
  const totalWidth =
    typeof columnWidth === 'number' ? (isLeafNode ? columnWidth : columnWidth * leafCount) : columnWidth
  const childCount = column.children?.length ?? 0

  const defaultContent = (
    <div
      className="rs-header-title"
      style={{ height: getLevelHeight(depth), minHeight: getLevelHeight(depth) }}
    >
      <h6
        className="rs-header-title-text"
        style={{ fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400 }}
      >
        {column.title}
      </h6>
    </div>
  )

  return (
    <div
      data-testid={`header-cell-${column.id}`}
      data-depth={depth}
      id={`header-${column.domId}`}
      className="rs-header-cell"
      style={{
        width: totalWidth,
        flexBasis: totalWidth,
        borderRight: getBorderStyle(column, depth, isLastInGroup),
        minHeight: getLevelHeight(depth),
      }}
    >
      {renderColumnHeader ? renderColumnHeader(column, { depth, defaultContent }) : defaultContent}
      {column.children && (
        <div className="rs-header-cell-children">
          {column.children?.map((child, index) => (
            <HeaderColumn
              key={child.id}
              column={child}
              columnWidth={columnWidth}
              depth={depth + 1}
              isLastInGroup={index === childCount - 1}
              renderColumnHeader={renderColumnHeader}
            />
          ))}
        </div>
      )}
    </div>
  )
}
