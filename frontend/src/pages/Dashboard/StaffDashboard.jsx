import React from 'react';

const StaffDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">داشبورد کارمند</h1>
      {/* آمار اصلی */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">تراکنشات امروز: 30</div>
        <div className="bg-white rounded shadow p-4">مشتریان فعال: 15</div>
        <div className="bg-white rounded shadow p-4">حواله‌های در انتظار: 5</div>
        <div className="bg-white rounded shadow p-4">درآمد امروز: 2,000,000 ریال</div>
      </div>
      {/* جدول تراکنشات */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">لیست تراکنشات</h2>
        <table className="w-full text-right">
          <thead>
            <tr className="border-b">
              <th className="py-2">کد تراکنش</th>
              <th>مشتری</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td>TRX001</td><td>مشتری الف</td><td>10,000,000</td><td>تکمیل</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
            <tr className="border-b">
              <td>TRX002</td><td>مشتری ب</td><td>5,000,000</td><td>در انتظار</td><td><button className="text-blue-600 underline">مشاهده</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* آخرین فعالیت‌ها */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">آخرین فعالیت‌ها</h2>
        <ul className="list-disc pr-5">
          <li>ثبت تراکنش جدید برای مشتری الف</li>
          <li>تأیید حواله مشتری ب</li>
          <li>افزودن مشتری جدید</li>
        </ul>
      </div>
      {/* اقدامات سریع */}
      <div className="flex gap-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">ثبت تراکنش جدید</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded">افزودن مشتری</button>
      </div>
    </div>
  );
};

export default StaffDashboard; 