import React, { memo } from 'react'
import Button from './Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showInfo?: boolean
  totalCount?: number
  pageSize?: number
  className?: string
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  totalCount,
  pageSize,
  className = ''
}: PaginationProps) {
  const startItem = ((currentPage - 1) * (pageSize || 20)) + 1
  const endItem = Math.min(currentPage * (pageSize || 20), totalCount || 0)

  const renderPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    // Previous button
    if (currentPage > 1) {
      pages.push(
        <Button
          key="prev"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
        >
          ←
        </Button>
      )
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      )
    }

    // Next button
    if (currentPage < totalPages) {
      pages.push(
        <Button
          key="next"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
        >
          →
        </Button>
      )
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 ${className}`}>
      {showInfo && totalCount && (
        <div className="text-sm text-gray-600">
          Mostrando {startItem} a {endItem} de {totalCount} resultados
        </div>
      )}
      
      <div className="flex gap-2">
        {renderPageNumbers()}
      </div>
    </div>
  )
}

export default memo(Pagination)