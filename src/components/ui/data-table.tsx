'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Button } from './button';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: keyof T | string;
  itemsPerPage?: number;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  searchKey,
  itemsPerPage = 10,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Reset pagination on search trigger
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Header click sort handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort the collection
  const processedData = React.useMemo(() => {
    let result = [...data];

    // Search query matches
    if (searchQuery && searchKey) {
      result = result.filter((row: any) => {
        const val = searchKey.toString().split('.').reduce((obj, key) => obj?.[key], row);
        return String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Sort active column
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const aVal = sortConfig.key.split('.').reduce((obj, key) => obj?.[key], a);
        const bVal = sortConfig.key.split('.').reduce((obj, key) => obj?.[key], b);

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortConfig.direction === 'asc'
          ? (aVal > bVal ? 1 : -1)
          : (aVal < bVal ? 1 : -1);
      });
    }

    return result;
  }, [data, searchQuery, searchKey, sortConfig]);

  // Pagination ranges
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  const paginatedData = React.useMemo(() => {
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, startIndex, itemsPerPage]);

  return (
    <div className="space-y-4">
      {/* Search Filtering Bar */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-sm border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
          />
        </div>
      )}

      {/* Styled Grid Table wrapper */}
      <div className="border border-neutral-200 bg-white rounded-sm overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, index) => {
                const isSortable = col.sortable && col.accessorKey;
                return (
                  <TableHead key={index} className="text-neutral-500 font-semibold py-3 text-xs select-none">
                    {isSortable ? (
                      <button
                        onClick={() => handleSort(col.accessorKey!.toString())}
                        className="inline-flex items-center gap-1 hover:text-neutral-900 cursor-pointer font-semibold text-left focus:outline-none"
                      >
                        <span>{col.header}</span>
                        <ArrowUpDown className="h-3 w-3 text-neutral-400" />
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-neutral-50/50 transition-colors">
                  {columns.map((col, colIndex) => {
                    let cellContent: React.ReactNode = null;

                    if (col.cell) {
                      cellContent = col.cell(row);
                    } else if (col.accessorKey) {
                      const val = col.accessorKey.toString().split('.').reduce((obj, key) => obj?.[key], row as any);
                      cellContent = String(val ?? '');
                    }

                    return (
                      <TableCell key={colIndex} className="py-3 text-neutral-700 text-xs">
                        {cellContent}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-neutral-400 text-xs font-medium">
                  No records match your query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs select-none">
          <span className="text-neutral-500 font-medium">
            Showing <span className="font-bold text-neutral-900">{totalItems > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-bold text-neutral-900">{endIndex}</span> of{' '}
            <span className="font-bold text-neutral-900">{totalItems}</span> entries
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 cursor-pointer flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-neutral-500 font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 cursor-pointer flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
