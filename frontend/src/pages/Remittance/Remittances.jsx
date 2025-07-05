import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const statusMap = {
  pending: 'در انتظار',
  completed: 'برداشت شده',
  cancelled: 'لغو شده',
  expired: 'منقضی شده',
};

const Remittances = () => {
  const [remittances, setRemittances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('inter_branch');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const fetchRemittances = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/remittances/my-remittances', {
          params: { type: filter, search, status, fromDate, toDate }
        });
        setRemittances(res.data.data.remittances || []);
      } catch (err) {
        setError('خطا در دریافت حواله‌ها');
      }
      setLoading(false);
    };
    fetchRemittances();
  }, [filter, search, status, fromDate, toDate]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(remittances.map(r => ({
      'کد حواله': r.secretCode,
      'مبلغ': r.amount,
      'ارز': r.fromCurrency,
      'گیرنده': r.receiverInfo?.name,
      'شعبه مقصد': r.receiverBranchId?.name,
      'وضعیت': statusMap[r.status] || r.status,
      'تاریخ ایجاد': r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-',
      'انقضا': r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '-',
      'تاریخچه وضعیت': (r.approvals && r.approvals.length > 0)
        ? r.approvals.map(a => `سطح ${a.level}: ${statusMap[a.status] || a.status} ${a.approvedAt ? 'در ' + new Date(a.approvedAt).toLocaleString() : ''} ${a.approverId ? 'توسط ' + (a.approverId.name || a.approverId) : ''}`).join(' | ')
        : '-',
      'برداشت حواله': r.status === 'completed' && r.redeemedAt ? new Date(r.redeemedAt).toLocaleString() : '-',
      'لغو حواله': r.status === 'cancelled' && r.audit?.cancelledAt ? new Date(r.audit.cancelledAt).toLocaleString() : '-',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remittances');
    XLSX.writeFile(wb, 'remittances_full.xlsx');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">لیست حواله‌های رمزدار بین شعب</h1>
      <div className="flex flex-wrap gap-2 my-4 items-center">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border px-2 py-1 rounded">
          <option value="inter_branch">فقط حواله رمزدار بین شعب</option>
          <option value="all">همه حواله‌ها</option>
        </select>
        <input type="text" placeholder="جستجو بر اساس نام گیرنده یا کد" value={search} onChange={e => setSearch(e.target.value)} className="border px-2 py-1 rounded" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="completed">برداشت شده</option>
          <option value="cancelled">لغو شده</option>
          <option value="expired">منقضی شده</option>
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border px-2 py-1 rounded" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border px-2 py-1 rounded" />
        <button onClick={exportToExcel} className="bg-green-600 text-white px-3 py-1 rounded">خروجی اکسل (کامل)</button>
      </div>
      {loading ? <div>در حال بارگذاری...</div> : error ? <div className="text-red-600">{error}</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow">
            <thead>
              <tr>
                <th className="px-2 py-1">کد حواله</th>
                <th className="px-2 py-1">مبلغ</th>
                <th className="px-2 py-1">ارز</th>
                <th className="px-2 py-1">گیرنده</th>
                <th className="px-2 py-1">شعبه مقصد</th>
                <th className="px-2 py-1">وضعیت</th>
                <th className="px-2 py-1">تاریخ ایجاد</th>
                <th className="px-2 py-1">انقضا</th>
              </tr>
            </thead>
            <tbody>
              {remittances.length === 0 && <tr><td colSpan={8} className="text-center py-4">حواله‌ای یافت نشد</td></tr>}
              {remittances.map(r => (
                <tr key={r._id} className="border-b">
                  <td className="px-2 py-1 font-mono">{r.secretCode || '-'}</td>
                  <td className="px-2 py-1">{r.amount}</td>
                  <td className="px-2 py-1">{r.fromCurrency}</td>
                  <td className="px-2 py-1">{r.receiverInfo?.name}</td>
                  <td className="px-2 py-1">{r.receiverBranchId?.name || '-'}</td>
                  <td className="px-2 py-1">{statusMap[r.status] || r.status}</td>
                  <td className="px-2 py-1">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="px-2 py-1">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Remittances; 