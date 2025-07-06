import React from 'react';

const SuperAdminDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">داشبورد سوپرادمین</h1>
      {/* آمار اصلی */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">تعداد صرافی‌ها: 12</div>
        <div className="bg-white rounded shadow p-4">کاربران کل: 120</div>
        <div className="bg-white rounded shadow p-4">درآمد کل: 1,200,000,000 ریال</div>
        <div className="bg-white rounded shadow p-4">پلن‌های فعال: 3</div>
      </div>
      {/* جدول صرافی‌ها */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">لیست صرافی‌ها</h2>
        <table className="w-full text-right">
          <thead>
            <tr className="border-b">
              <th className="py-2">نام</th>
              <th>کد</th>
              <th>پلن</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td>صرافی الف</td><td>EX001</td><td>طلایی</td><td>فعال</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
            <tr className="border-b">
              <td>صرافی ب</td><td>EX002</td><td>پایه</td><td>تعلیق</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* آخرین فعالیت‌ها */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">آخرین فعالیت‌ها</h2>
        <ul className="list-disc pr-5">
          <li>ورود مدیر صرافی الف</li>
          <li>تمدید پلن صرافی ب</li>
          <li>ایجاد کاربر جدید توسط سوپرادمین</li>
        </ul>
      </div>
      {/* اقدامات سریع */}
      <div className="flex gap-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">ایجاد صرافی جدید</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded">افزودن پلن</button>
      </div>
    </div>
  );
};

export default SuperAdminDashboard; 