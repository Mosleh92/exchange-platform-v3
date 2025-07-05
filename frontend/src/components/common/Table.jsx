import React from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import SkeletonTable from './SkeletonTable';

const Table = ({ columns, data, rowKey = 'id', className = '', pagination, loading }) => {
  // pagination: { page, pageSize, total, onPageChange, onPageSizeChange }
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = data.map(row => {
      const obj = {};
      columns.forEach(col => {
        obj[col.title] = col.render ? col.render(row) : row[col.accessor];
      });
      return obj;
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'table-export.csv');
  };

  return (
    <div className={`overflow-x-auto rounded-lg shadow ${className}`}>
      {/* Export Button */}
      <div className="flex justify-end py-2 px-2">
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          onClick={handleExportCSV}
          disabled={loading || !data || data.length === 0}
        >
          خروجی CSV
        </button>
      </div>
      {loading ? (
        <SkeletonTable columns={columns.length} rows={8} />
      ) : (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key || col.accessor}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {data && data.length > 0 ? (
              data.map((row, idx) => (
                <tr key={row[rowKey] || idx}>
                  {columns.map((col) => (
                    <td
                      key={col.key || col.accessor}
                      className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200"
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4 text-center text-gray-400">
                  داده‌ای برای نمایش وجود ندارد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {/* Pagination Controls */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between py-3 px-2">
          <div className="text-xs text-gray-500">
            صفحه {pagination.page} از {totalPages} (تعداد کل: {pagination.total})
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              قبلی
            </button>
            <span className="mx-2">{pagination.page}</span>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              بعدی
            </button>
            <select
              className="ml-2 border rounded px-1 py-0.5"
              value={pagination.pageSize}
              onChange={e => pagination.onPageSizeChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} در صفحه</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table; 