import React from 'react';

const BranchManagerDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">داشبورد مدیر شعبه</h1>
      {/* آمار اصلی */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">کارمندان شعبه: 8</div>
        <div className="bg-white rounded shadow p-4">تراکنشات امروز: 120</div>
        <div className="bg-white rounded shadow p-4">مشتریان فعال: 60</div>
        <div className="bg-white rounded shadow p-4">درآمد شعبه: 15,000,000 ریال</div>
      </div>
      {/* جدول کارمندان */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">لیست کارمندان شعبه</h2>
        <table className="w-full text-right">
          <thead>
            <tr className="border-b">
              <th className="py-2">نام</th>
              <th>کد</th>
              <th>سمت</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td>کارمند الف</td><td>ST001</td><td>صندوقدار</td><td>فعال</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
            <tr className="border-b">
              <td>کارمند ب</td><td>ST002</td><td>اپراتور</td><td>فعال</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* آخرین فعالیت‌ها */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">آخرین فعالیت‌ها</h2>
        <ul className="list-disc pr-5">
          <li>ثبت تراکنش جدید توسط کارمند الف</li>
          <li>افزودن مشتری جدید</li>
          <li>تمدید پلن شعبه</li>
        </ul>
      </div>
      {/* اقدامات سریع */}
      <div className="flex gap-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">افزودن کارمند</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded">ثبت تراکنش جدید</button>
      </div>
    </div>
  );
};

export default BranchManagerDashboard; 