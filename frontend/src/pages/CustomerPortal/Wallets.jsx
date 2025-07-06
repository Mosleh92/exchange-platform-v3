import React, { useEffect, useState } from 'react';
import axios from 'axios';

const currencyIcons = {
  IRR: '🇮🇷',
  USD: '🇺🇸',
  AED: '🇦🇪',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  TRY: '🇹🇷',
  BTC: '₿',
  USDT: '🪙',
  ETH: 'Ξ',
  BNB: '🟡',
};

const Wallets = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/exchange-accounts/my-accounts');
        setAccounts(res.data.data || []);
      } catch (err) {
        setError('خطا در دریافت اطلاعات کیف پول');
      }
      setLoading(false);
    };
    fetchAccounts();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">کیف پول ارزی و رمزارزی</h1>
      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : accounts.length === 0 ? (
        <div className="text-gray-400">هیچ حساب فعالی برای شما ثبت نشده است.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc._id} className="bg-white rounded shadow p-4 flex flex-col items-start">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{currencyIcons[acc.currency] || '💱'}</span>
                <span className="text-lg font-bold">{acc.currency}</span>
              </div>
              <div className="text-xl font-bold mb-1">{acc.balance.toLocaleString()} {acc.currency}</div>
              <div className="text-xs text-gray-500 mb-1">شماره حساب: {acc.accountNumber}</div>
              <div className="text-xs text-gray-500 mb-1">نوع حساب: {acc.accountType === 'holding' ? 'سپرده' : acc.accountType}</div>
              <div className={`text-xs mb-1 ${acc.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>وضعیت: {acc.status === 'active' ? 'فعال' : 'غیرفعال'}</div>
              {/* TODO: افزودن دکمه واریز/برداشت/QR */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wallets; 