import React from 'react';
import PlanComparison from '../../components/PlanComparison';
import CurrentPlanStatus from '../../components/CurrentPlanStatus';

const TenantAdminDashboard = () => {
  return (
    <div className="p-6">
      <CurrentPlanStatus />
      <h1 className="text-2xl font-bold mb-4">داشبورد مدیر صرافی</h1>
      {/* آمار اصلی */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">تعداد شعبات: 5</div>
        <div className="bg-white rounded shadow p-4">کارمندان: 20</div>
        <div className="bg-white rounded shadow p-4">مشتریان: 300</div>
        <div className="bg-white rounded shadow p-4">درآمد ماه: 120,000,000 ریال</div>
      </div>
      {/* جدول شعبات */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">لیست شعبات</h2>
        <table className="w-full text-right">
          <thead>
            <tr className="border-b">
              <th className="py-2">نام شعبه</th>
              <th>کد</th>
              <th>مدیر</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td>شعبه مرکزی</td><td>BR001</td><td>مدیر الف</td><td>فعال</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
            <tr className="border-b">
              <td>شعبه غرب</td><td>BR002</td><td>مدیر ب</td><td>فعال</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* آخرین فعالیت‌ها */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">آخرین فعالیت‌ها</h2>
        <ul className="list-disc pr-5">
          <li>ثبت تراکنش جدید در شعبه مرکزی</li>
          <li>افزودن کارمند جدید</li>
          <li>تمدید پلن صرافی</li>
        </ul>
      </div>
      {/* اقدامات سریع */}
      <div className="flex gap-4 mb-8">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">ایجاد شعبه جدید</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded">افزودن کارمند</button>
      </div>
      {/* مقایسه و ارتقا پلن */}
      <PlanComparison />
    </div>
  );
};

export default TenantAdminDashboard; 