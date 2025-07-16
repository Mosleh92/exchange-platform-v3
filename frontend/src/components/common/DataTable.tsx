import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import Button from './Button';
import FormInput from './FormInput';

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  className?: string;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  selectable?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
}

interface SortConfig {
  key: keyof any;
  direction: 'asc' | 'desc';
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  sortable = true,
  filterable = true,
  pagination = true,
  pageSize = 10,
  className,
  onRowClick,
  onSelectionChange,
  selectable = false,
  emptyMessage = 'داده‌ای برای نمایش وجود ندارد',
  loadingMessage = 'در حال بارگذاری...',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((row) =>
          String(row[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    return filtered;
  }, [data, searchTerm, filters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (key: keyof T) => {
    if (!sortable) return;

    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRowSelection = (row: T, checked: boolean) => {
    const newSelection = checked
      ? [...selectedRows, row]
      : selectedRows.filter((selectedRow) => selectedRow !== row);
    
    setSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? paginatedData : [];
    setSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const renderCell = (column: Column<T>, row: T) => {
    const value = row[column.key];

    if (column.render) {
      return column.render(value, row);
    }

    return (
      <div className={`text-sm ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}>
        {value !== null && value !== undefined ? String(value) : '-'}
      </div>
    );
  };

  const getSortIcon = (key: keyof T) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };

  return (
    <div className={className}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="mb-6 space-y-4">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <FormInput
                placeholder="جستجو..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {filterable && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns
                .filter((column) => column.filterable)
                .map((column) => (
                  <div key={String(column.key)} className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <FormInput
                      placeholder={`فیلتر ${column.header}...`}
                      value={filters[String(column.key)] || ''}
                      onChange={(e) => handleFilter(String(column.key), e.target.value)}
                      className="pl-10"
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {selectable && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                    style={{ width: column.width }}
                  >
                    <div className={`flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                      <span>{column.header}</span>
                      {column.sortable && (
                        <span className="mr-1">{getSortIcon(column.key)}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner mr-2" />
                      {loadingMessage}
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    className={`hover:bg-gray-50 transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedRows.includes(row)}
                          onChange={(e) => handleRowSelection(row, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4 whitespace-nowrap ${
                          column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {renderCell(column, row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                بعدی
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  نمایش{' '}
                  <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                  {' '}تا{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, filteredData.length)}
                  </span>
                  {' '}از{' '}
                  <span className="font-medium">{filteredData.length}</span>
                  {' '}نتیجه
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-r-md"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="rounded-none"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-l-md"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable; 