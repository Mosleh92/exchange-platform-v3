import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PendingTransactions = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeposits = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/transactions/my-pending-deposits');
        setDeposits(res.data.data || []);
      } catch (err) {
        setError('خطا در دریافت واریزهای در انتظار');
      }
      setLoading(false);
    };
    fetchDeposits();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">واریزهای در انتظار</h1>
      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : deposits.length === 0 ? (
        <div className="text-gray-400">واریز در انتظاری وجود ندارد.</div>
      ) : (
        <div className="bg-white rounded shadow p-4">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b">
                <th className="py-2">مبلغ</th>
                <th>ارز</th>
                <th>شماره حساب</th>
                <th>تاریخ</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map(dep => (
                <tr key={dep._id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{dep.amount.toLocaleString()}</td>
                  <td>{dep.currency}</td>
                  <td>{dep.accountNumber}</td>
                  <td>{new Date(dep.createdAt).toLocaleDateString('fa-IR')}</td>
                  <td className={dep.status === 'pending' ? 'text-yellow-600' : 'text-blue-600'}>{dep.status === 'pending' ? 'در انتظار تایید' : 'در حال بررسی'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingTransactions; 