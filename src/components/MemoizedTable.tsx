import React, { memo, useCallback } from 'react'
import Table from './Table'

interface MemoizedTableProps {
  data: any[]
  columns: any[]
  loading: boolean
  emptyMessage?: string
  onRowClick?: (row: any, index: number) => void
  className?: string
}

function MemoizedTable({
  data,
  columns,
  loading,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  className
}: MemoizedTableProps) {
  const handleRowClick = useCallback((row: any, index: number) => {
    onRowClick?.(row, index)
  }, [onRowClick])

  return (
    <Table
      data={data}
      columns={columns}
      loading={loading}
      emptyMessage={emptyMessage}
      onRowClick={handleRowClick}
      className={className}
    />
  )
}

export default memo(MemoizedTable)