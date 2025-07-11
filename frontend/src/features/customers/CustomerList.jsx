import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import CustomerRegistration from './CustomerRegistration';

const CustomerList = () => {
  const [showRegistration, setShowRegistration] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    branch: 'all',
    dateRange: 'all'
  });
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  // Fetch customers data
  const { data: customers, isLoading, error, refetch } = useQuery(
    'customers',
    fetchCustomers,
    {
      refetchOnWindowFocus: false,
    }
  );

  async function fetchCustomers() {
    // Mock data - replace with actual API call
    return [
      {
        id: 1,
        firstName: 'محمد',
        lastName: 'رضایی',
        nationalId: '1234567890',
        phone: '09123456789',
        email: 'mohammad@email.com',
        status: 'فعال',
        branch: 'شعبه مرکزی',
        registrationDate: '2024-01-15',
        lastTransaction: '2024-01-20',
        totalTransactions: 45,
        totalVolume: 125000000,
        documents: ['کارت ملی', 'گردش حساب']
      },
      {
        id: 2,
        firstName: 'فاطمه',
        lastName: 'کریمی',
        nationalId: '0987654321',
        phone: '09123456788',
        email: 'fateme@email.com',
        status: 'فعال',
        branch: 'شعبه غرب',
        registrationDate: '2024-01-10',
        lastTransaction: '2024-01-18',
        totalTransactions: 23,
        totalVolume: 67000000,
        documents: ['کارت ملی']
      },
      {
        id: 3,
        firstName: 'علی',
        lastName: 'محمدی',
        nationalId: '1122334455',
        phone: '09123456787',
        email: 'ali@email.com',
        status: 'غیرفعال',
        branch: 'شعبه شرق',
        registrationDate: '2023-12-20',
        lastTransaction: '2023-12-25',
        totalTransactions: 12,
        totalVolume: 34000000,
        documents: ['کارت ملی', 'گردش حساب', 'گواهی اقامت']
      },
      {
        id: 4,
        firstName: 'مریم',
        lastName: 'احمدی',
        nationalId: '5566778899',
        phone: '09123456786',
        email: 'maryam@email.com',
        status: 'فعال',
        branch: 'شعبه مرکزی',
        registrationDate: '2024-01-08',
        lastTransaction: '2024-01-19',
        totalTransactions: 78,
        totalVolume: 234000000,
        documents: ['کارت ملی', 'گردش حساب']
      }
    ];
  }

  // Advanced filtering
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    return customers.filter(customer => {
      // Search term filter
      const searchMatch = 
        customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.nationalId.includes(searchTerm) ||
        customer.phone.includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = filters.status === 'all' || customer.status === filters.status;

      // Branch filter
      const branchMatch = filters.branch === 'all' || customer.branch === filters.branch;

      // Date range filter (simplified for demo)
      let dateMatch = true;
      if (filters.dateRange !== 'all') {
        const registrationDate = new Date(customer.registrationDate);
        const now = new Date();
        const daysAgo = filters.dateRange === '30d' ? 30 : filters.dateRange === '90d' ? 90 : 365;
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        dateMatch = registrationDate >= cutoffDate;
      }

      return searchMatch && statusMatch && branchMatch && dateMatch;
    });
  }, [customers, searchTerm, filters]);

  const handleCustomerRegistration = async (customerData) => {
    try {
      // Here you would make an API call to save the customer
      console.log('Registering customer:', customerData);
      
      // For demo, just close the modal and refetch
      setShowRegistration(false);
      refetch();
      
      // Show success message
      alert('مشتری با موفقیت ثبت شد');
    } catch (error) {
      console.error('Error registering customer:', error);
      alert('خطا در ثبت مشتری');
    }
  };

  const handleSelectCustomer = (customerId, isSelected) => {
    if (isSelected) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const exportCustomers = () => {
    // Simple CSV export functionality
    const csvContent = [
      ['نام', 'نام خانوادگی', 'کد ملی', 'تلفن', 'ایمیل', 'وضعیت', 'شعبه', 'تاریخ ثبت'],
      ...filteredCustomers.map(customer => [
        customer.firstName,
        customer.lastName,
        customer.nationalId,
        customer.phone,
        customer.email,
        customer.status,
        customer.branch,
        customer.registrationDate
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'customers.csv';
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        خطا در بارگذاری مشتریان: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">مدیریت مشتریان</h1>
          <p className="text-gray-600 mt-1">مشاهده و مدیریت اطلاعات مشتریان</p>
        </div>
        <button
          onClick={() => setShowRegistration(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          ثبت مشتری جدید
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">جستجو</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="نام، کد ملی، تلفن..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وضعیت</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">همه</option>
              <option value="فعال">فعال</option>
              <option value="غیرفعال">غیرفعال</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">شعبه</label>
            <select
              value={filters.branch}
              onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">همه شعبات</option>
              <option value="شعبه مرکزی">شعبه مرکزی</option>
              <option value="شعبه غرب">شعبه غرب</option>
              <option value="شعبه شرق">شعبه شرق</option>
              <option value="شعبه شمال">شعبه شمال</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ ثبت</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">همه</option>
              <option value="30d">30 روز گذشته</option>
              <option value="90d">90 روز گذشته</option>
              <option value="365d">سال گذشته</option>
            </select>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {selectedCustomers.length > 0 && (
              <>
                <button className="bg-green-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-green-700">
                  فعال‌سازی ({selectedCustomers.length})
                </button>
                <button className="bg-red-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-red-700">
                  غیرفعال‌سازی ({selectedCustomers.length})
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCustomers}
              className="bg-gray-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-gray-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              خروجی CSV
            </button>
            <span className="text-sm text-gray-500 px-3 py-1">
              {filteredCustomers.length} مشتری
            </span>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام و نام خانوادگی
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد ملی
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تماس
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  شعبه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  آمار معاملات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center">
                        {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                      </div>
                      <div className="mr-3">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.nationalId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.branch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{customer.totalTransactions} معامله</div>
                      <div className="text-xs text-gray-400">
                        {(customer.totalVolume / 1000000).toLocaleString('fa-IR')}M ریال
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.status === 'فعال' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        مشاهده
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        ویرایش
                      </button>
                      <button className="text-purple-600 hover:text-purple-900">
                        معامله
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Registration Modal */}
      {showRegistration && (
        <CustomerRegistration
          onClose={() => setShowRegistration(false)}
          onSubmit={handleCustomerRegistration}
        />
      )}
    </div>
  );
};

export default CustomerList;