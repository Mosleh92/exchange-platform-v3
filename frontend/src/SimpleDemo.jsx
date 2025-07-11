import React from 'react';

const SimpleDemo = () => {
  const [currentView, setCurrentView] = React.useState('tenant');

  const TenantDashboardDemo = () => (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-900">داشبورد صرافی اصلی - دموی ساده</h1>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">تعداد شعبات</p>
              <p className="text-3xl font-bold text-gray-900">5</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">تعداد کارمندان</p>
              <p className="text-3xl font-bold text-gray-900">20</p>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">تعداد مشتریان</p>
              <p className="text-3xl font-bold text-gray-900">300</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">درآمد ماهانه</p>
              <p className="text-3xl font-bold text-gray-900">120M ریال</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-yellow-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Management Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">مدیریت شعبات</h2>
        </div>
        <div className="p-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام شعبه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">کد شعبه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مدیر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">درآمد ماهانه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">شعبه مرکزی</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">BR001</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">مدیر الف</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">45,000,000 ریال</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">فعال</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">شعبه غرب</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">BR002</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">مدیر ب</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">35,000,000 ریال</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">فعال</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const BranchDashboardDemo = () => (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-900">داشبورد شعبه مرکزی</h1>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معاملات امروز</p>
              <p className="text-3xl font-bold text-gray-900">45</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">مشتریان فعال</p>
              <p className="text-3xl font-bold text-gray-900">89</p>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">درآمد ماهانه</p>
              <p className="text-2xl font-bold text-gray-900">45M ریال</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-yellow-600 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">حواله در انتظار</p>
              <p className="text-3xl font-bold text-gray-900">12</p>
            </div>
            <div className="bg-red-50 p-3 rounded-full">
              <div className="w-6 h-6 bg-red-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Balance Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">موجودی نقدینگی شعبه</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">500M</div>
              <div className="text-sm text-gray-500">IRR</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">15,000</div>
              <div className="text-sm text-gray-500">USD</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">8,000</div>
              <div className="text-sm text-gray-500">EUR</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">25,000</div>
              <div className="text-sm text-gray-500">AED</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CustomerManagementDemo = () => (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">مدیریت مشتریان</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          ثبت مشتری جدید
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="جستجو..." className="border border-gray-300 rounded-lg px-3 py-2" />
          <select className="border border-gray-300 rounded-lg px-3 py-2">
            <option>همه وضعیت‌ها</option>
            <option>فعال</option>
            <option>غیرفعال</option>
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2">
            <option>همه شعبات</option>
            <option>شعبه مرکزی</option>
            <option>شعبه غرب</option>
          </select>
          <button className="bg-gray-600 text-white px-3 py-2 rounded-lg">خروجی CSV</button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">کد ملی</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تماس</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شعبه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">آمار معاملات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center">مر</div>
                    <div className="mr-3">
                      <div className="text-sm font-medium text-gray-900">محمد رضایی</div>
                      <div className="text-sm text-gray-500">mohammad@email.com</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1234567890</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">09123456789</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">شعبه مرکزی</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">45 معامله<br/>125M ریال</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">فعال</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">سیستم مدیریت صرافی v3</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('tenant')}
                className={`px-4 py-2 rounded-lg ${currentView === 'tenant' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                داشبورد صرافی
              </button>
              <button
                onClick={() => setCurrentView('branch')}
                className={`px-4 py-2 rounded-lg ${currentView === 'branch' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                داشبورد شعبه
              </button>
              <button
                onClick={() => setCurrentView('customers')}
                className={`px-4 py-2 rounded-lg ${currentView === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                مدیریت مشتریان
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {currentView === 'tenant' && <TenantDashboardDemo />}
        {currentView === 'branch' && <BranchDashboardDemo />}
        {currentView === 'customers' && <CustomerManagementDemo />}
      </main>
    </div>
  );
};

export default SimpleDemo;