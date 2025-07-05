import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart } from '@mui/x-charts/BarChart';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [accRes, txRes, notifRes] = await Promise.all([
          axios.get('/api/exchange-accounts/my-accounts'),
          axios.get('/api/transactions/my-transactions?limit=5'),
          axios.get('/api/notifications/my-notifications?limit=5')
        ]);
        setAccounts(accRes.data.data || []);
        setTransactions((txRes.data.data && txRes.data.data.transactions) || []);
        setNotifications(notifRes.data.data || []);
      } catch (err) {
        setError('خطا در دریافت اطلاعات داشبورد');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Chart data
  const chartData = {
    labels: accounts.map(acc => acc.currency),
    values: accounts.map(acc => acc.balance),
  };

  const columns = [
    { title: 'نوع', accessor: 'type', render: tx => tx.type === 'exchange_buy' ? 'خرید ارز' : tx.type === 'exchange_sell' ? 'فروش ارز' : tx.type === 'deposit' ? 'واریز' : tx.type === 'withdrawal' ? 'برداشت' : tx.type },
    { title: 'مبلغ', accessor: 'amount', render: tx => tx.amount.toLocaleString() },
    { title: 'ارز', accessor: 'currency' },
    { title: 'تاریخ', accessor: 'createdAt', render: tx => new Date(tx.createdAt).toLocaleDateString('fa-IR') },
    { title: 'وضعیت', accessor: 'status', render: tx => tx.status === 'completed' ? 'تکمیل شده' : tx.status === 'pending' ? 'در انتظار' : tx.status },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">داشبورد مشتری</h1>
      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          {/* مانده حساب‌ها */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {accounts.map(acc => (
              <Card key={acc._id} className="flex flex-col">
                <span className="text-gray-500">{acc.currency}</span>
                <span className="text-xl font-bold">{acc.balance.toLocaleString()} {acc.currency}</span>
                <span className="text-xs text-gray-400 mt-1">شماره حساب: {acc.accountNumber}</span>
              </Card>
            ))}
          </div>

          {/* نمودار مانده ارزها */}
          <Card className="mb-6">
            <div className="text-lg font-semibold mb-2">نمودار مانده ارزها</div>
            {accounts.length > 0 ? (
              <BarChart
                xAxis={[{ scaleType: 'band', data: chartData.labels }]}
                series={[{ data: chartData.values }]}
                height={200}
                colors={["#6366f1"]}
              />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">داده‌ای برای نمایش وجود ندارد.</div>
            )}
          </Card>

          {/* تراکنش‌های اخیر */}
          <Card className="mb-6">
            <div className="text-lg font-semibold mb-2">تراکنش‌های اخیر</div>
            <Table columns={columns} data={transactions} />
          </Card>

          {/* اعلان‌ها و هشدارها */}
          <Card className="mb-6">
            <div className="text-lg font-semibold mb-2">اعلان‌ها و هشدارها</div>
            {notifications.length === 0 ? (
              <div className="text-gray-400">اعلانی وجود ندارد.</div>
            ) : (
              <ul>
                {notifications.map(n => (
                  <li key={n._id} className="border-b py-2 flex justify-between items-center">
                    <span>{n.title}</span>
                    <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('fa-IR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard; 