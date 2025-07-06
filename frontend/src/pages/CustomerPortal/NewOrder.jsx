import React, { useState } from 'react';
import axios from 'axios';

const currencyOptions = [
  { value: 'USD', label: 'دلار آمریکا' },
  { value: 'EUR', label: 'یورو' },
  { value: 'AED', label: 'درهم امارات' },
  { value: 'IRR', label: 'ریال ایران' },
  { value: 'BTC', label: 'بیت‌کوین' },
  { value: 'USDT', label: 'تتر' },
  // ... سایر ارزها
];

const NewOrder = () => {
  const [orderType, setOrderType] = useState('buy');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await axios.post('/api/transactions/my-orders', {
        orderType,
        currency,
        amount: Number(amount),
        description
      });
      setSuccess('درخواست شما با موفقیت ثبت شد و در انتظار بررسی است.');
      setAmount('');
      setDescription('');
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ثبت سفارش');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">ثبت سفارش خرید/فروش ارز</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 flex flex-col gap-4">
        <div>
          <label className="block mb-1 font-semibold">نوع سفارش</label>
          <select value={orderType} onChange={e => setOrderType(e.target.value)} className="w-full border rounded p-2">
            <option value="buy">خرید ارز</option>
            <option value="sell">فروش ارز</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-semibold">ارز</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full border rounded p-2">
            {currencyOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-semibold">مبلغ</label>
          <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded p-2" required />
        </div>
        <div>
          <label className="block mb-1 font-semibold">توضیحات (اختیاری)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded p-2" rows={2} />
        </div>
        <button type="submit" className="bg-blue-600 text-white rounded py-2 font-bold" disabled={loading}>
          {loading ? 'در حال ارسال...' : 'ثبت سفارش'}
        </button>
        {success && <div className="text-green-600 mt-2">{success}</div>}
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </form>
    </div>
  );
};

export default NewOrder; 