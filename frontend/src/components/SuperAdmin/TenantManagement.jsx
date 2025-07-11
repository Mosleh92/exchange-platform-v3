import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff, 
  Eye, 
  Building2,
  Users,
  Activity,
  DollarSign,
  Calendar,
  MapPin
} from 'lucide-react';
import StatCard from './StatCard';
import DataTable from './DataTable';

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [stats, setStats] = useState(null);

  // Mock data
  const mockTenants = [
    {
      id: 1,
      name: 'بانک ملی ایران',
      code: 'BMI001',
      type: 'بانک',
      status: 'فعال',
      subscriptionPlan: 'Enterprise',
      createdAt: '1402/01/15',
      lastActivity: '1402/09/28',
      totalUsers: 250,
      totalTransactions: 45000,
      monthlyRevenue: 950000000,
      city: 'تهران',
      contactPerson: 'آقای احمدی',
      phone: '021-88776655',
      email: 'admin@bmi.ir'
    },
    {
      id: 2,
      name: 'صرافی آسیا',
      code: 'ASA002',
      type: 'صرافی',
      status: 'فعال',
      subscriptionPlan: 'Professional',
      createdAt: '1402/02/10',
      lastActivity: '1402/09/27',
      totalUsers: 85,
      totalTransactions: 32000,
      monthlyRevenue: 680000000,
      city: 'مشهد',
      contactPerson: 'خانم رضایی',
      phone: '051-33445566',
      email: 'info@asia-exchange.ir'
    },
    {
      id: 3,
      name: 'صرافی کوروش',
      code: 'KOR003',
      type: 'صرافی',
      status: 'تعلیق',
      subscriptionPlan: 'Basic',
      createdAt: '1402/03/05',
      lastActivity: '1402/09/20',
      totalUsers: 45,
      totalTransactions: 25000,
      monthlyRevenue: 580000000,
      city: 'اصفهان',
      contactPerson: 'آقای کریمی',
      phone: '031-77889900',
      email: 'support@korosh.com'
    },
    {
      id: 4,
      name: 'بانک پارسیان',
      code: 'PAR004',
      type: 'بانک',
      status: 'فعال',
      subscriptionPlan: 'Enterprise',
      createdAt: '1402/04/20',
      lastActivity: '1402/09/28',
      totalUsers: 180,
      totalTransactions: 38000,
      monthlyRevenue: 820000000,
      city: 'تهران',
      contactPerson: 'آقای موسوی',
      phone: '021-66554433',
      email: 'admin@parsian-bank.ir'
    },
    {
      id: 5,
      name: 'صرافی رضا',
      code: 'REZ005',
      type: 'صرافی',
      status: 'فعال',
      subscriptionPlan: 'Professional',
      createdAt: '1402/05/12',
      lastActivity: '1402/09/26',
      totalUsers: 65,
      totalTransactions: 22000,
      monthlyRevenue: 520000000,
      city: 'شیراز',
      contactPerson: 'آقای محمدی',
      phone: '071-55667788',
      email: 'info@reza-exchange.ir'
    }
  ];

  const mockStats = {
    totalTenants: 156,
    activeTenants: 142,
    suspendedTenants: 14,
    newThisMonth: 8,
    totalRevenue: 2847526000,
    averageUsers: 125
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTenants(mockTenants);
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching tenants:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const columns = [
    { 
      key: 'name', 
      label: 'نام صرافی/بانک', 
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{row.code}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'type', 
      label: 'نوع', 
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'بانک' 
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'وضعیت',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'فعال' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: 'subscriptionPlan', 
      label: 'پلن اشتراک',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Enterprise' 
            ? 'bg-gold-100 text-gold-800' :
          value === 'Professional'
            ? 'bg-silver-100 text-silver-800' 
            : 'bg-bronze-100 text-bronze-800'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: 'totalUsers', 
      label: 'تعداد کاربران', 
      sortable: true,
      render: (value) => value?.toLocaleString('fa-IR')
    },
    { 
      key: 'monthlyRevenue', 
      label: 'درآمد ماهانه', 
      sortable: true,
      render: (value) => `${(value / 1000000).toLocaleString('fa-IR')} میلیون ریال`
    },
    { 
      key: 'city', 
      label: 'شهر'
    },
    { 
      key: 'lastActivity', 
      label: 'آخرین فعالیت'
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(row)}
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="مشاهده جزئیات"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400"
            title="ویرایش"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            className={`p-1 ${
              row.status === 'فعال' 
                ? 'text-gray-400 hover:text-red-600 dark:hover:text-red-400' 
                : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400'
            }`}
            title={row.status === 'فعال' ? 'غیرفعال سازی' : 'فعال سازی'}
          >
            {row.status === 'فعال' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const handleView = (tenant) => {
    setSelectedTenant(tenant);
    // Show details modal
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setShowCreateForm(true);
  };

  const handleToggleStatus = async (tenant) => {
    const newStatus = tenant.status === 'فعال' ? 'تعلیق' : 'فعال';
    try {
      // API call to toggle status
      setTenants(prev => 
        prev.map(t => 
          t.id === tenant.id ? { ...t, status: newStatus } : t
        )
      );
    } catch (error) {
      console.error('Error toggling tenant status:', error);
    }
  };

  const handleDelete = async (tenant) => {
    if (window.confirm(`آیا از حذف ${tenant.name} اطمینان دارید؟`)) {
      try {
        // API call to delete
        setTenants(prev => prev.filter(t => t.id !== tenant.id));
      } catch (error) {
        console.error('Error deleting tenant:', error);
      }
    }
  };

  const handleCreateNew = () => {
    setSelectedTenant(null);
    setShowCreateForm(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            مدیریت صرافی‌ها
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            ایجاد، ویرایش و مدیریت صرافی‌ها و بانک‌ها
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          ایجاد صرافی/بانک جدید
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="کل صرافی‌ها"
          value={stats?.totalTenants}
          icon={Building2}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="فعال"
          value={stats?.activeTenants}
          icon={Power}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="تعلیق شده"
          value={stats?.suspendedTenants}
          icon={PowerOff}
          color="red"
          isLoading={loading}
        />
        <StatCard
          title="جدید این ماه"
          value={stats?.newThisMonth}
          icon={Plus}
          color="purple"
          isLoading={loading}
        />
        <StatCard
          title="متوسط کاربران"
          value={stats?.averageUsers}
          icon={Users}
          color="indigo"
          isLoading={loading}
        />
        <StatCard
          title="درآمد کل (ریال)"
          value={stats?.totalRevenue}
          icon={DollarSign}
          color="yellow"
          isLoading={loading}
        />
      </div>

      {/* Tenants Table */}
      <DataTable
        data={tenants}
        columns={columns}
        isLoading={loading}
        emptyMessage="هیچ صرافی/بانکی ثبت نشده است"
        onRowClick={handleView}
      />

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedTenant ? 'ویرایش صرافی/بانک' : 'ایجاد صرافی/بانک جدید'}
              </h2>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      نام صرافی/بانک
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedTenant?.name || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="نام صرافی یا بانک را وارد کنید"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      کد
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedTenant?.code || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="کد یکتا"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      نوع
                    </label>
                    <select
                      defaultValue={selectedTenant?.type || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="صرافی">صرافی</option>
                      <option value="بانک">بانک</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      پلن اشتراک
                    </label>
                    <select
                      defaultValue={selectedTenant?.subscriptionPlan || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="Basic">Basic</option>
                      <option value="Professional">Professional</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      شهر
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedTenant?.city || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="شهر"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      شخص تماس
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedTenant?.contactPerson || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="نام شخص تماس"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      تلفن
                    </label>
                    <input
                      type="tel"
                      defaultValue={selectedTenant?.phone || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="شماره تلفن"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ایمیل
                    </label>
                    <input
                      type="email"
                      defaultValue={selectedTenant?.email || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="آدرس ایمیل"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {selectedTenant ? 'بروزرسانی' : 'ایجاد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement;