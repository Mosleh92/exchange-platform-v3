import React from 'react';
import Skeleton from '@mui/material/Skeleton';

export default function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-4 py-2">
                <Skeleton variant="text" width={80} height={24} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, r) => (
            <tr key={r}>
              {[...Array(columns)].map((_, c) => (
                <td key={c} className="px-4 py-2">
                  <Skeleton variant="rectangular" width={80} height={24} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 