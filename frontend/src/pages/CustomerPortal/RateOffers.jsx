import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RateOffers = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/customers/my-special-rates');
        setRates(res.data.data || []);
      } catch (err) {
        setError('خطا در دریافت نرخ‌های اختصاصی');
      }
      setLoading(false);
    };
    fetchRates();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">نرخ‌های اختصاصی شما</h1>
      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : rates.length === 0 ? (
        <div className="text-gray-400">نرخ اختصاصی فعالی برای شما ثبت نشده است.</div>
      ) : (
        <div className="bg-white rounded shadow p-4">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b">
                <th className="py-2">ارز</th>
                <th>نرخ خرید</th>
                <th>نرخ فروش</th>
                <th>بازه اعتبار</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(rate => (
                <tr key={rate._id || rate.currency} className="border-b hover:bg-gray-50">
                  <td className="py-2">{rate.currency}</td>
                  <td>{rate.buyRate ? rate.buyRate.toLocaleString() : '-'}</td>
                  <td>{rate.sellRate ? rate.sellRate.toLocaleString() : '-'}</td>
                  <td>{rate.validFrom ? `${new Date(rate.validFrom).toLocaleDateString('fa-IR')} تا ${rate.validTo ? new Date(rate.validTo).toLocaleDateString('fa-IR') : '-'}` : '-'}</td>
                  <td className={rate.isActive ? 'text-green-600' : 'text-gray-500'}>{rate.isActive ? 'فعال' : 'غیرفعال'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RateOffers; 