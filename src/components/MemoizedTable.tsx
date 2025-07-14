import React, { memo, useCallback } from 'react'
import Table from './Table'

interface MemoizedTableProps<T> {
  data: T[]
  columns: any[]
  loading: boolean
  emptyMessage?: string
  onRowClick?: (row: T, index: number) => void
  className?: string
}

function MemoizedTable<T>({
  data,
  columns,
  loading,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  className
}: MemoizedTableProps<T>) {
  const handleRowClick = useCallback((row: T, index: number) => {
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

export default memo(MemoizedTable) as <T>(props: MemoizedTableProps<T>) => JSX.Element