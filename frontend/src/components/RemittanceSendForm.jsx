import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTenant } from '../contexts/TenantContext';
import { toast } from 'react-hot-toast';

export default function RemittanceSendForm() {
  const { tenant, branch } = useTenant();
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ amount: '', currency: '', receiverName: '', receiverBranchId: '', note: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;
    setBranchesLoading(true);
    axios.get(`/api/tenants/${tenant.id}/branches`)
      .then(res => setBranches(res.data.branches || []))
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false));
  }, [tenant]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post('/api/remittances/inter-branch', {
        senderBranchId: branch?.id,
        receiverBranchId: form.receiverBranchId,
        amount: form.amount,
        currency: form.currency,
        receiverInfo: { name: form.receiverName },
        note: form.note
      });
      setResult(res.data.remittance);
      toast.success('حواله با موفقیت ثبت شد. کد و QR را به گیرنده تحویل دهید.');
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ارسال حواله');
      toast.error(err.response?.data?.message || 'خطا در ارسال حواله');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold mb-4">ارسال حواله رمزدار بین شعب</h2>
      <div className="mb-3 text-sm text-blue-700 bg-blue-50 p-2 rounded">
        <ul className="list-disc pr-4">
          <li>شعبه مبدا: <b>{branch?.name || '...'}</b></li>
          <li>شعبه مقصد را انتخاب کنید. گیرنده فقط با کد یا QR حواله می‌تواند برداشت کند.</li>
          <li>کد حواله و QR فقط یک‌بار و تا ۳ روز معتبر است.</li>
          <li>پس از ثبت، کد و QR را به گیرنده تحویل دهید.</li>
        </ul>
      </div>
      {branchesLoading ? <div>در حال دریافت لیست شعب...</div> : (
        <form onSubmit={handleSubmit}>
          <input name="amount" type="number" placeholder="مبلغ" value={form.amount} onChange={handleChange} className="border px-3 py-2 rounded w-full mb-2" required />
          <input name="currency" type="text" placeholder="ارز (مثلاً AED)" value={form.currency} onChange={handleChange} className="border px-3 py-2 rounded w-full mb-2" required />
          <select name="receiverBranchId" value={form.receiverBranchId} onChange={handleChange} className="border px-3 py-2 rounded w-full mb-2" required>
            <option value="">انتخاب شعبه مقصد</option>
            {branches.filter(b => b._id !== branch?.id).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <input name="receiverName" type="text" placeholder="نام گیرنده" value={form.receiverName} onChange={handleChange} className="border px-3 py-2 rounded w-full mb-2" required />
          <input name="note" type="text" placeholder="توضیح (اختیاری)" value={form.note} onChange={handleChange} className="border px-3 py-2 rounded w-full mb-2" />
          {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
          <button type="submit" className="bg-blue-600 text-white w-full py-2 rounded font-bold" disabled={loading}>{loading ? 'در حال ارسال...' : 'ارسال حواله'}</button>
        </form>
      )}
      {result && (
        <div className="mt-6 text-center">
          <div className="font-bold mb-2">کد حواله: {result.secretCode}</div>
          <img src={result.qrCode} alt="QR" className="mx-auto mb-2" style={{ width: 180 }} />
          <div className="text-xs text-gray-500">این کد و QR را به گیرنده تحویل دهید</div>
        </div>
      )}
    </div>
  );
} 