import React from 'react';
import EntityList from '../../components/common/EntityList';
import api from '../../services/api';

const columns = [
  { title: 'نوع', accessor: 'type', render: tx => tx.type === 'exchange_buy' ? 'خرید ارز' : tx.type === 'exchange_sell' ? 'فروش ارز' : tx.type === 'deposit' ? 'واریز' : tx.type === 'withdrawal' ? 'برداشت' : tx.type },
  { title: 'مبلغ', accessor: 'amount', render: tx => tx.amount.toLocaleString() },
  { title: 'ارز', accessor: 'currency' },
  { title: 'تاریخ', accessor: 'createdAt', render: tx => new Date(tx.createdAt).toLocaleDateString('fa-IR') },
  { title: 'وضعیت', accessor: 'status', render: tx => tx.status === 'completed' ? 'تکمیل شده' : tx.status === 'pending' ? 'در انتظار' : tx.status },
];

async function fetchTransactions({ page, pageSize, search, startDate, endDate, type, currency, status }) {
  const res = await api.get('/transactions/my-transactions', {
    params: { page, pageSize, search, startDate, endDate, type, currency, status },
  });
  return {
    data: (res.data.data && res.data.data.transactions) || [],
    total: res.data.data?.total || 0,
  };
}

export default function TransactionHistory() {
  return (
    <EntityList
      title="تاریخچه و گزارش کامل تراکنش‌ها"
      columns={columns}
      fetchData={fetchTransactions}
      breadcrumbItems={[
        { label: 'داشبورد', href: '/customer/dashboard' },
        { label: 'تراکنش‌ها' }
      ]}
    />
  );
} 