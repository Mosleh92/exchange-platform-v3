import React, { useEffect, useState } from 'react';

const API_PLANS = 'http://localhost:4000/plans'; // در حالت واقعی: /api/plans
const API_TENANT_PLAN = (tenantId) => `http://localhost:4000/tenants/${tenantId}/plan`; // در حالت واقعی: /api/tenants/:id/plan

const currentTenantId = 1; // فرض: tenant جاری
const currentPlanId = 2; // فرض: پلن فعلی tenant

const PlanComparison = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_PLANS);
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError('خطا در دریافت پلن‌ها');
    }
    setLoading(false);
  };

  const handleUpgrade = async (planId) => {
    setUpgrading(true);
    setMessage('');
    setError('');
    try {
      // فرض: PATCH به /tenants/:id/plan
      await fetch(API_TENANT_PLAN(currentTenantId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      setMessage('پلن با موفقیت ارتقا یافت یا تمدید شد.');
    } catch (err) {
      setError('خطا در ارتقا یا تمدید پلن');
    }
    setUpgrading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">مقایسه پلن‌های اشتراک</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {message && <div className="text-green-600 mb-2">{message}</div>}
      {loading ? (
        <div className="text-center py-8">در حال بارگذاری...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2">نام پلن</th>
                <th>قیمت</th>
                <th>مدت</th>
                <th>حداکثر کاربر</th>
                <th>حداکثر شعبه</th>
                <th>دسترسی به API</th>
                <th>پشتیبانی</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} className={plan.id === currentPlanId ? 'bg-blue-50' : ''}>
                  <td className="font-bold">{plan.name}</td>
                  <td>{(+plan.price).toLocaleString()} {plan.currency || 'ریال'}</td>
                  <td>{plan.duration}</td>
                  <td>{plan.features?.maxUsers ?? '-'}</td>
                  <td>{plan.features?.maxBranches ?? '-'}</td>
                  <td>{plan.features?.apiAccess ? 'دارد' : 'ندارد'}</td>
                  <td>{plan.features?.supportLevel || '-'}</td>
                  <td>
                    {plan.id === currentPlanId ? (
                      <span className="text-green-600 font-bold">پلن فعلی</span>
                    ) : (
                      <button
                        className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
                        disabled={upgrading}
                        onClick={() => handleUpgrade(plan.id)}
                      >
                        ارتقا / تمدید
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlanComparison; 