import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Users, 
  Eye, 
  EyeOff,
  UserCheck,
  UserX,
  Key,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import StatCard from './StatCard';
import DataTable from './DataTable';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState(null);

  // Mock data
  const mockUsers = [
    {
      id: 1,
      fullName: 'علی احمدی',
      email: 'ali.ahmadi@example.com',
      phone: '09123456789',
      role: 'Super Admin',
      status: 'فعال',
      lastLogin: '1402/09/28 - 14:30',
      createdAt: '1402/01/15',
      tenantAccess: ['همه'],
      permissions: ['کامل'],
      twoFactorEnabled: true,
      loginAttempts: 0,
      avatar: null
    },
    {
      id: 2,
      fullName: 'زهرا محمدی',
      email: 'z.mohammadi@example.com',
      phone: '09187654321',
      role: 'Admin',
      status: 'فعال',
      lastLogin: '1402/09/27 - 16:45',
      createdAt: '1402/02/10',
      tenantAccess: ['بانک ملی', 'صرافی آسیا'],
      permissions: ['مدیریت کاربران', 'مشاهده گزارشات'],
      twoFactorEnabled: false,
      loginAttempts: 0,
      avatar: null
    },
    {
      id: 3,
      fullName: 'محمد رضایی',
      email: 'm.rezaei@example.com',
      phone: '09365432178',
      role: 'Manager',
      status: 'غیرفعال',
      lastLogin: '1402/09/20 - 09:15',
      createdAt: '1402/03/05',
      tenantAccess: ['صرافی کوروش'],
      permissions: ['مشاهده گزارشات'],
      twoFactorEnabled: true,
      loginAttempts: 3,
      avatar: null
    },
    {
      id: 4,
      fullName: 'فاطمه کریمی',
      email: 'f.karimi@example.com',
      phone: '09198765432',
      role: 'Analyst',
      status: 'فعال',
      lastLogin: '1402/09/28 - 11:20',
      createdAt: '1402/04/20',
      tenantAccess: ['بانک پارسیان'],
      permissions: ['مشاهده گزارشات', 'تحلیل داده'],
      twoFactorEnabled: true,
      loginAttempts: 0,
      avatar: null
    },
    {
      id: 5,
      fullName: 'حسن موسوی',
      email: 'h.mousavi@example.com',
      phone: '09123457890',
      role: 'Support',
      status: 'فعال',
      lastLogin: '1402/09/26 - 13:45',
      createdAt: '1402/05/12',
      tenantAccess: ['صرافی رضا'],
      permissions: ['پشتیبانی کاربران'],
      twoFactorEnabled: false,
      loginAttempts: 1,
      avatar: null
    }
  ];

  const mockStats = {
    totalUsers: 45,
    activeUsers: 38,
    inactiveUsers: 7,
    superAdmins: 3,
    admins: 8,
    managers: 15,
    analysts: 12,
    support: 7,
    twoFactorEnabled: 28,
    recentLogins: 35
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUsers(mockUsers);
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Analyst':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Support':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'فعال':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'غیرفعال':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const columns = [
    { 
      key: 'fullName', 
      label: 'نام کاربر', 
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{row.email}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'role', 
      label: 'نقش', 
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'وضعیت',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'phone', 
      label: 'تلفن'
    },
    { 
      key: 'tenantAccess', 
      label: 'دسترسی',
      render: (value) => (
        <div className="max-w-32">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Array.isArray(value) ? value.join(', ') : value}
          </span>
        </div>
      )
    },
    { 
      key: 'twoFactorEnabled', 
      label: '2FA',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        }`}>
          {value ? 'فعال' : 'غیرفعال'}
        </span>
      )
    },
    { 
      key: 'lastLogin', 
      label: 'آخرین ورود',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
      )
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
            onClick={() => handleResetPassword(row)}
            className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
            title="تغییر رمز عبور"
          >
            <Key className="w-4 h-4" />
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
            {row.status === 'فعال' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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

  const handleView = (user) => {
    setSelectedUser(user);
    // Show details modal
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowCreateForm(true);
  };

  const handleResetPassword = async (user) => {
    if (window.confirm(`آیا از تغییر رمز عبور ${user.fullName} اطمینان دارید؟`)) {
      try {
        // API call to reset password
        console.log('Reset password for:', user);
      } catch (error) {
        console.error('Error resetting password:', error);
      }
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'فعال' ? 'غیرفعال' : 'فعال';
    try {
      // API call to toggle status
      setUsers(prev => 
        prev.map(u => 
          u.id === user.id ? { ...u, status: newStatus } : u
        )
      );
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDelete = async (user) => {
    if (window.confirm(`آیا از حذف ${user.fullName} اطمینان دارید؟`)) {
      try {
        // API call to delete
        setUsers(prev => prev.filter(u => u.id !== user.id));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleCreateNew = () => {
    setSelectedUser(null);
    setShowCreateForm(true);
  };

  const roles = [
    { value: 'Super Admin', label: 'سوپر ادمین' },
    { value: 'Admin', label: 'ادمین' },
    { value: 'Manager', label: 'مدیر' },
    { value: 'Analyst', label: 'تحلیلگر' },
    { value: 'Support', label: 'پشتیبانی' }
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            مدیریت کاربران سطح بالا
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            مدیریت کاربران، نقش‌ها و دسترسی‌ها
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          افزودن کاربر جدید
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="کل کاربران"
          value={stats?.totalUsers}
          icon={Users}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="کاربران فعال"
          value={stats?.activeUsers}
          icon={UserCheck}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="کاربران غیرفعال"
          value={stats?.inactiveUsers}
          icon={UserX}
          color="red"
          isLoading={loading}
        />
        <StatCard
          title="احراز هویت دو مرحله‌ای"
          value={stats?.twoFactorEnabled}
          icon={Shield}
          color="purple"
          isLoading={loading}
        />
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="سوپر ادمین"
          value={stats?.superAdmins}
          icon={Shield}
          color="red"
          isLoading={loading}
        />
        <StatCard
          title="ادمین"
          value={stats?.admins}
          icon={Users}
          color="purple"
          isLoading={loading}
        />
        <StatCard
          title="مدیر"
          value={stats?.managers}
          icon={Users}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="تحلیلگر"
          value={stats?.analysts}
          icon={Users}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="پشتیبانی"
          value={stats?.support}
          icon={Users}
          color="yellow"
          isLoading={loading}
        />
      </div>

      {/* Users Table */}
      <DataTable
        data={users}
        columns={columns}
        isLoading={loading}
        emptyMessage="هیچ کاربری ثبت نشده است"
        onRowClick={handleView}
      />

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedUser ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
              </h2>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      نام کامل
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedUser?.fullName || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="نام و نام خانوادگی"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ایمیل
                    </label>
                    <input
                      type="email"
                      defaultValue={selectedUser?.email || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="example@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      شماره تلفن
                    </label>
                    <input
                      type="tel"
                      defaultValue={selectedUser?.phone || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="09xxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      نقش
                    </label>
                    <select
                      defaultValue={selectedUser?.role || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">انتخاب کنید</option>
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      وضعیت
                    </label>
                    <select
                      defaultValue={selectedUser?.status || 'فعال'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="فعال">فعال</option>
                      <option value="غیرفعال">غیرفعال</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      احراز هویت دو مرحله‌ای
                    </label>
                    <select
                      defaultValue={selectedUser?.twoFactorEnabled ? 'true' : 'false'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="true">فعال</option>
                      <option value="false">غیرفعال</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    دسترسی به صرافی‌ها
                  </label>
                  <textarea
                    defaultValue={selectedUser?.tenantAccess?.join(', ') || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    rows="2"
                    placeholder="نام صرافی‌هایی که کاربر دسترسی دارد (با کاما جدا کنید)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    مجوزها
                  </label>
                  <textarea
                    defaultValue={selectedUser?.permissions?.join(', ') || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    rows="2"
                    placeholder="مجوزهای کاربر (با کاما جدا کنید)"
                  />
                </div>

                {!selectedUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      رمز عبور موقت
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="رمز عبور موقت برای کاربر"
                    />
                  </div>
                )}

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
                    {selectedUser ? 'بروزرسانی' : 'ایجاد کاربر'}
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

export default UserManagement;