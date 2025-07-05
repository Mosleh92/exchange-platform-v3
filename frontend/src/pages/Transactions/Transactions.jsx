import React from 'react';
import Table from '../../components/common/Table';
import { useTransactions } from '../../hooks/useTransactions';

const columns = [
  { title: 'شناسه', accessor: 'id' },
  { title: 'مبلغ', accessor: 'amount' },
  { title: 'وضعیت', accessor: 'status' },
  { title: 'تاریخ', accessor: 'date' },
];

const Transactions = () => {
  const { data, loading, error } = useTransactions();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">لیست تراکنش‌ها</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">تمام تراکنش‌های ثبت شده در سیستم در این بخش قابل مشاهده است.</p>
      <div className="mt-6">
        {loading && <div>در حال بارگذاری...</div>}
        {error && <div className="text-red-500">خطا در دریافت داده‌ها</div>}
        <Table columns={columns} data={data} />
      </div>
    </div>
  );
};

export default Transactions; 