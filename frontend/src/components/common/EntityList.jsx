import React, { useState, useEffect } from 'react';
import Table from './Table';
import SkeletonTable from './SkeletonTable';
import Breadcrumb from './Breadcrumb';

export default function EntityList({
  title,
  columns,
  fetchData,
  filters: FiltersComponent,
  breadcrumbItems,
  defaultPageSize = 20,
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterState, setFilterState] = useState({});

  useEffect(() => {
    setLoading(true);
    fetchData({ page, pageSize, search, ...filterState })
      .then(res => {
        setData(res.data);
        setTotal(res.total);
        setError(null);
      })
      .catch(err => setError('خطا در دریافت داده‌ها'))
      .finally(() => setLoading(false));
  }, [page, pageSize, search, filterState, fetchData]);

  return (
    <div className="container mx-auto p-4">
      {breadcrumbItems && <Breadcrumb items={breadcrumbItems} />}
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="mb-4 flex flex-col md:flex-row gap-2 items-center flex-wrap">
        <input
          type="text"
          placeholder="جستجو..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/4"
        />
        {FiltersComponent && <FiltersComponent value={filterState} onChange={setFilterState} />}
      </div>
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <Table
          columns={columns}
          data={data}
          loading={loading}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      )}
    </div>
  );
} 