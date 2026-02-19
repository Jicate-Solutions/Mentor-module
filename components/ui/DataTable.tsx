'use client';

import React, { useState } from 'react';
import Button from './Button';
import { SkeletonTable } from './Skeleton';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  mobileLabel?: string; // Label to show on mobile cards
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  mobileCardRender?: (row: T) => React.ReactNode; // Custom mobile card renderer
  hoverable?: boolean;
  striped?: boolean;
}

/**
 * DataTable Component
 *
 * Responsive data table that displays as a table on desktop and cards on mobile.
 * Features: sorting, loading states, empty states, custom renderers
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'role', label: 'Role', render: (row) => <Badge>{row.role}</Badge> }
 *   ]}
 *   data={users}
 *   keyExtractor={(row) => row.id}
 *   onRowClick={(row) => router.push(`/users/${row.id}`)}
 * />
 * ```
 */
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  onRowClick,
  emptyMessage = 'No data available',
  emptyAction,
  mobileCardRender,
  hoverable = true,
  striped = false
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortOrder]);

  // Loading state
  if (loading) {
    return <SkeletonTable rows={5} columns={columns.length} />;
  }

  // Empty state
  if (data.length === 0) {
    return (
      <EmptyState
        illustration="document"
        title={emptyMessage}
        action={emptyAction}
      />
    );
  }

  // Default mobile card renderer
  const defaultMobileCard = (row: T) => (
    <div className="space-y-2">
      {columns.filter(col => !col.hideOnMobile).map((column) => (
        <div key={column.key} className="flex justify-between items-start gap-3">
          <span className="text-sm font-medium text-neutral-600 flex-shrink-0">
            {column.mobileLabel || column.label}:
          </span>
          <span className="text-sm text-neutral-900 text-right">
            {column.render ? column.render(row) : row[column.key]}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {sortedData.map((row) => {
          const key = keyExtractor(row);
          const CardContent = mobileCardRender || defaultMobileCard;

          return (
            <div
              key={key}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`
                bg-white rounded-lg shadow-sm p-4
                ${onRowClick ? 'cursor-pointer active:scale-[0.98]' : ''}
                ${hoverable && onRowClick ? 'hover:shadow-md hover:-translate-y-0.5' : ''}
                transition-all
              `}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
            >
              {CardContent(row)}
            </div>
          );
        })}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block overflow-x-auto rounded-lg shadow-sm">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-sm font-medium text-brand-green ${
                    column.width ? `w-${column.width}` : ''
                  }`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 hover:text-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green rounded px-1 -mx-1"
                    >
                      {column.label}
                      {sortKey === column.key && (
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            sortOrder === 'desc' ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100/60">
            {sortedData.map((row, index) => {
              const key = keyExtractor(row);

              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`
                    ${striped && index % 2 === 1 ? 'bg-neutral-50/50' : 'bg-white'}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${hoverable && onRowClick ? 'hover:bg-neutral-100 hover:shadow-sm' : ''}
                    transition-all duration-150
                  `}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  } : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-neutral-900">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * DataTablePagination Component
 *
 * Pagination controls for DataTable
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const maxVisiblePages = 5;

  // Calculate visible page range
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const visiblePages = pages.slice(startPage - 1, endPage);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-neutral-100 bg-white">
      {/* Info */}
      {itemsPerPage && totalItems && (
        <div className="text-sm text-neutral-600">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
        </div>
      )}

      {/* Page Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          iconLeft={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          }
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {startPage > 1 && (
            <>
              <Button
                variant={currentPage === 1 ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(1)}
              >
                1
              </Button>
              {startPage > 2 && <span className="px-2 text-neutral-500">...</span>}
            </>
          )}

          {visiblePages.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2 text-neutral-500">...</span>}
              <Button
                variant={currentPage === totalPages ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>

        {/* Mobile page indicator */}
        <div className="sm:hidden text-sm text-neutral-600">
          Page {currentPage} of {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          iconRight={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          <span className="hidden sm:inline">Next</span>
        </Button>
      </div>
    </div>
  );
}
