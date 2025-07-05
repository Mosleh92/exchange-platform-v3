import React, { useState } from 'react';
import axios from 'axios';

const branches = [
  { value: 'شعبه مرکزی', label: 'شعبه مرکزی' },
  { value: 'شعبه ونک', label: 'شعبه ونک' },
  { value: 'شعبه کیش', label: 'شعبه کیش' },
];
const currencies = [
  { value: 'IRR', label: 'ریال' },
  { value: 'USD', label: 'دلار' },
  { value: 'AED', label: 'درهم' },
];
const statuses = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'در انتظار', label: 'در انتظار' },
  { value: 'تکمیل شده', label: 'تکمیل شده' },
];

const initialRemittances = [
  { id: 1, amount: 5000000, currency: 'IRR', fromBranch: 'شعبه مرکزی', toBranch: 'شعبه ونک', status: 'در انتظار', date: '1403/02/01', description: '' },
  { id: 2, amount: 1200, currency: 'USD', fromBranch: 'شعبه مرکزی', toBranch: 'شعبه کیش', status: 'تکمیل شده', date: '1403/01/28', description: 'پرداخت حقوق' },
];

const Remittance = () => {
  const [remittances, setRemittances] = useState(initialRemittances);
  const [form, setForm] = useState({ amount: '', currency: 'IRR', fromBranch: '', toBranch: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // فیلترها و جستجو
  const [filter, setFilter] = useState({ currency: '', status: '', fromBranch: '', toBranch: '', search: '' });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFilterChange = e => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      // فرض: ارسال به API واقعی
      // const res = await axios.post('/api/remittances', form);
      // setRemittances([res.data, ...remittances]);
      // فعلاً داده لوکال:
      const newRemit = {
        id: remittances.length + 1,
        amount: Number(form.amount),
        currency: form.currency,
        fromBranch: form.fromBranch,
        toBranch: form.toBranch,
        status: 'در انتظار',
        date: new Date().toLocaleDateString('fa-IR'),
        description: form.description,
      };
      setRemittances([newRemit, ...remittances]);
      setSuccess('حواله با موفقیت ثبت شد.');
      setForm({ amount: '', currency: 'IRR', fromBranch: '', toBranch: '', description: '' });
    } catch (err) {
      setError('خطا در ثبت حواله');
    }
    setLoading(false);
  };

  // فیلتر و جستجو روی داده‌ها
  const filteredRemittances = remittances.filter(r =>
    (!filter.currency || r.currency === filter.currency) &&
    (!filter.status || r.status === filter.status) &&
    (!filter.fromBranch || r.fromBranch === filter.fromBranch) &&
    (!filter.toBranch || r.toBranch === filter.toBranch) &&
    (!filter.search ||
      r.description?.includes(filter.search) ||
      String(r.id).includes(filter.search))
  );

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">حواله داخلی بین شعب</h2>
      {/* فرم ثبت حواله جدید */}
      <div className="bg-white rounded shadow p-4 mb-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block mb-1 font-semibold">مبلغ</label>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} className="w-full border rounded p-2" required min="1" />
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-semibold">ارز</label>
              <select name="currency" value={form.currency} onChange={handleChange} className="w-full border rounded p-2">
                {currencies.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block mb-1 font-semibold">شعبه مبدا</label>
              <select name="fromBranch" value={form.fromBranch} onChange={handleChange} className="w-full border rounded p-2" required>
                <option value="">انتخاب کنید</option>
                {branches.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-semibold">شعبه مقصد</label>
              <select name="toBranch" value={form.toBranch} onChange={handleChange} className="w-full border rounded p-2" required>
                <option value="">انتخاب کنید</option>
                {branches.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block mb-1 font-semibold">توضیحات (اختیاری)</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded p-2" rows={2} />
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded py-2 font-bold" disabled={loading}>{loading ? 'در حال ارسال...' : 'ثبت حواله'}</button>
          {success && <div className="text-green-600 mt-2">{success}</div>}
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </form>
      </div>
      {/* فیلتر و جستجو */}
      <div className="bg-white rounded shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
        <select name="currency" value={filter.currency} onChange={handleFilterChange} className="border rounded p-2">
          <option value="">همه ارزها</option>
          {currencies.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select name="status" value={filter.status} onChange={handleFilterChange} className="border rounded p-2">
          {statuses.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select name="fromBranch" value={filter.fromBranch} onChange={handleFilterChange} className="border rounded p-2">
          <option value="">همه شعب مبدا</option>
          {branches.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select name="toBranch" value={filter.toBranch} onChange={handleFilterChange} className="border rounded p-2">
          <option value="">همه شعب مقصد</option>
          {branches.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <input name="search" value={filter.search} onChange={handleFilterChange} className="border rounded p-2" placeholder="جستجو در توضیحات یا شماره حواله..." />
      </div>
      {/* جدول حواله‌ها */}
      {filteredRemittances.length === 0 ? (
        <div className="text-gray-400">حواله‌ای ثبت نشده است.</div>
      ) : (
        <div className="bg-white rounded shadow p-4 overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b">
                <th className="py-2">مبلغ</th>
                <th>ارز</th>
                <th>شعبه مبدا</th>
                <th>شعبه مقصد</th>
                <th>وضعیت</th>
                <th>تاریخ</th>
                <th>توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRemittances.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{r.amount.toLocaleString()}</td>
                  <td>{r.currency}</td>
                  <td>{r.fromBranch}</td>
                  <td>{r.toBranch}</td>
                  <td className={r.status === 'تکمیل شده' ? 'text-green-600' : 'text-yellow-600'}>{r.status}</td>
                  <td>{r.date}</td>
                  <td>{r.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Remittance;
