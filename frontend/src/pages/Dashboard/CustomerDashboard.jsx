import React from 'react';

const CustomerDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">داشبورد مشتری</h1>
      {/* آمار اصلی */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">موجودی کل: 50,000,000 ریال</div>
        <div className="bg-white rounded shadow p-4">تراکنشات من: 12</div>
        <div className="bg-white rounded shadow p-4">حواله‌های من: 3</div>
        <div className="bg-white rounded shadow p-4">آخرین ورود: امروز</div>
      </div>
      {/* جدول تراکنشات من */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">تراکنشات من</h2>
        <table className="w-full text-right">
          <thead>
            <tr className="border-b">
              <th className="py-2">کد تراکنش</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td>TRX101</td><td>2,000,000</td><td>تکمیل</td><td>1403/02/01</td><td><button className="text-blue-600 underline">جزئیات</button></td>
            </tr>
            <tr className="border-b">
              <td>TRX102</td><td>1,500,000</td><td>در انتظار</td><td>1403/01/29</td><td><button className="text-blue-600 underline">جزئیات</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* آخرین فعالیت‌ها */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">آخرین فعالیت‌ها</h2>
        <ul className="list-disc pr-5">
          <li>ثبت تراکنش جدید</li>
          <li>دریافت حواله جدید</li>
          <li>تغییر رمز عبور</li>
        </ul>
      </div>
      {/* اقدامات سریع */}
      <div className="flex gap-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">ثبت تراکنش جدید</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded">درخواست حواله</button>
      </div>
    </div>
  );
};

export default CustomerDashboard; 