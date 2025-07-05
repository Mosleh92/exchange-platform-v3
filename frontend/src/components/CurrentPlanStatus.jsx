import React, { useEffect, useState } from 'react';

const API_TENANT = 'http://localhost:4000/tenants/1'; // فرض: tenant جاری با id=1

const CurrentPlanStatus = () => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_TENANT);
      const data = await res.json();
      setTenant(data);
    } catch (err) {
      setError('خطا در دریافت اطلاعات پلن فعلی');
    }
    setLoading(false);
  };

  if (loading) return <div className="mb-4">در حال دریافت اطلاعات پلن فعلی...</div>;
  if (error) return <div className="text-red-600 mb-4">{error}</div>;
  if (!tenant) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <div className="font-bold text-lg text-blue-800 mb-1">پلن فعلی: {tenant.plan || tenant.planName || '---'}</div>
        <div className="text-gray-700">تاریخ انقضا: <span className="font-bold">{tenant.expire || '---'}</span></div>
        <div className="text-gray-700">وضعیت: <span className={tenant.status === 'فعال' ? 'text-green-600 font-bold' : 'text-yellow-600 font-bold'}>{tenant.status}</span></div>
      </div>
      <div className="mt-3 md:mt-0">
        <span className="text-gray-500">تاریخ ایجاد: {tenant.created || '---'}</span>
      </div>
    </div>
  );
};

export default CurrentPlanStatus; 