import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import QrReader from 'react-qr-reader';

export default function RemittanceRedeemForm({ branchId }) {
  const [codeOrQR, setCodeOrQR] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const handleScan = data => {
    if (data) {
      setCodeOrQR(data);
      setShowScanner(false);
      setScannerError('');
      toast.success('QR با موفقیت اسکن شد');
    }
  };
  const handleError = err => {
    setScannerError('دسترسی به دوربین ممکن نیست یا خطا رخ داده است. لطفاً کد را به صورت دستی وارد کنید.');
    setShowScanner(false);
    toast.error('خطا در اسکن QR. لطفاً کد را دستی وارد کنید.');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post('/api/remittances/inter-branch/redeem', {
        codeOrQR,
        receiverBranchId: branchId,
        receiverName
      });
      setResult(res.data.remittance);
      toast.success('حواله با موفقیت برداشت شد.');
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در برداشت حواله');
      toast.error(err.response?.data?.error || 'خطا در برداشت حواله');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold mb-4">برداشت حواله رمزدار بین شعب</h2>
      <div className="mb-3 text-sm text-blue-700 bg-blue-50 p-2 rounded">
        <ul className="list-disc pr-4">
          <li>کد حواله یا QR را وارد کنید یا با دوربین اسکن نمایید.</li>
          <li>در صورت عدم امکان اسکن QR، کد را به صورت دستی وارد کنید.</li>
          <li>نام گیرنده باید دقیقاً مطابق حواله ثبت شده باشد.</li>
          <li>حواله فقط یک‌بار و تا زمان اعتبار قابل برداشت است.</li>
          <li>در صورت خطا یا انقضا، با اپراتور شعبه مبدا تماس بگیرید.</li>
        </ul>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 mb-2">
          <input name="codeOrQR" type="text" placeholder="کد حواله یا QR (base64)" value={codeOrQR} onChange={e => setCodeOrQR(e.target.value)} className="border px-3 py-2 rounded w-full" required />
          <button type="button" className="bg-gray-200 px-2 rounded text-xs" onClick={() => setShowScanner(s => !s)}>{showScanner ? 'بستن اسکنر' : 'اسکن QR'}</button>
        </div>
        {showScanner && (
          <div className="mb-2">
            <QrReader
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%' }}
            />
            {scannerError && <div className="text-red-600 text-center mt-2">{scannerError}</div>}
          </div>
        )}
        <input name="receiverName" type="text" placeholder="نام گیرنده" value={receiverName} onChange={e => setReceiverName(e.target.value)} className="border px-3 py-2 rounded w-full mb-2" required />
        {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
        <button type="submit" className="bg-green-600 text-white w-full py-2 rounded font-bold" disabled={loading}>{loading ? 'در حال بررسی...' : 'برداشت حواله'}</button>
      </form>
      {result && (
        <div className="mt-6 text-center text-green-700 font-bold">حواله با موفقیت برداشت شد</div>
      )}
    </div>
  );
} 