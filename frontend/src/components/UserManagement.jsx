import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRBAC, ROLES, PERMISSIONS, getRoleDisplayName } from '../contexts/RBACContext';
import PersianUtils from '../utils/persian';
import PersianCalendar from '../utils/persianCalendar';
import '../styles/rtl.css';

const UserManagement = () => {
  const { hasPermission, user: currentUser } = useRBAC();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: ROLES.STAFF,
    status: 'active',
    branchId: '',
    tenantId: currentUser?.tenantId || '',
    permissions: []
  });

  const [errors, setErrors] = useState({});

  // Available roles based on current user's permissions
  const getAvailableRoles = () => {
    if (hasPermission(PERMISSIONS.MANAGE_SYSTEM)) {
      return Object.values(ROLES);
    } else if (hasPermission(PERMISSIONS.MANAGE_TENANT_USERS)) {
      return [ROLES.BRANCH_ADMIN, ROLES.MANAGER, ROLES.STAFF];
    } else if (hasPermission(PERMISSIONS.MANAGE_BRANCH_STAFF)) {
      return [ROLES.STAFF];
    }
    return [];
  };

  useEffect(() => {
    // Apply RTL styling
    document.body.classList.add('rtl-container');
    document.documentElement.dir = 'rtl';
    
    loadUsers();
    
    return () => {
      document.body.classList.remove('rtl-container');
    };
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Simulate API call - generate sample users
      const sampleUsers = [
        {
          id: 1,
          name: 'علی احمدی',
          email: 'ali.ahmadi@example.com',
          phone: '09123456789',
          role: ROLES.TENANT_ADMIN,
          status: 'active',
          branchId: 'branch-1',
          tenantId: 'tenant-1',
          createdAt: new Date('2023-01-15'),
          lastLogin: new Date('2024-01-10'),
          permissions: []
        },
        {
          id: 2,
          name: 'فاطمه محمدی',
          email: 'fateme.mohammadi@example.com',
          phone: '09187654321',
          role: ROLES.BRANCH_ADMIN,
          status: 'active',
          branchId: 'branch-1',
          tenantId: 'tenant-1',
          createdAt: new Date('2023-03-20'),
          lastLogin: new Date('2024-01-09'),
          permissions: []
        },
        {
          id: 3,
          name: 'حسن کریمی',
          email: 'hassan.karimi@example.com',
          phone: '09354567890',
          role: ROLES.MANAGER,
          status: 'active',
          branchId: 'branch-2',
          tenantId: 'tenant-1',
          createdAt: new Date('2023-06-10'),
          lastLogin: new Date('2024-01-08'),
          permissions: []
        },
        {
          id: 4,
          name: 'مریم صادقی',
          email: 'maryam.sadeghi@example.com',
          phone: '09198765432',
          role: ROLES.STAFF,
          status: 'inactive',
          branchId: 'branch-1',
          tenantId: 'tenant-1',
          createdAt: new Date('2023-08-05'),
          lastLogin: new Date('2023-12-15'),
          permissions: []
        },
        {
          id: 5,
          name: 'محمد رضایی',
          email: 'mohammad.rezaei@example.com',
          phone: '09171234567',
          role: ROLES.STAFF,
          status: 'suspended',
          branchId: 'branch-2',
          tenantId: 'tenant-1',
          createdAt: new Date('2023-09-12'),
          lastLogin: new Date('2023-11-20'),
          permissions: []
        }
      ];
      
      setUsers(sampleUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    
    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone.includes(searchLower)
      );
    }
    
    setFilteredUsers(filtered);
  };

  const validateUser = (userData) => {
    const newErrors = {};
    
    if (!userData.name.trim()) {
      newErrors.name = 'نام الزامی است';
    }
    
    if (!userData.email.trim()) {
      newErrors.email = 'ایمیل الزامی است';
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
      newErrors.email = 'ایمیل معتبر نیست';
    }
    
    if (!userData.phone.trim()) {
      newErrors.phone = 'شماره تلفن الزامی است';
    } else if (!PersianUtils.validatePhoneNumber(userData.phone)) {
      newErrors.phone = 'شماره تلفن معتبر نیست';
    }
    
    if (!userData.role) {
      newErrors.role = 'نقش کاربری الزامی است';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUser = async () => {
    if (!validateUser(newUser)) return;
    
    setLoading(true);
    try {
      const userToCreate = {
        ...newUser,
        id: Date.now(),
        createdAt: new Date(),
        lastLogin: null
      };
      
      setUsers(prev => [...prev, userToCreate]);
      setShowCreateForm(false);
      resetForm();
      
    } catch (error) {
      console.error('Error creating user:', error);
      alert('خطا در ایجاد کاربر');
    }
    setLoading(false);
  };

  const updateUser = async () => {
    if (!validateUser(editingUser)) return;
    
    setLoading(true);
    try {
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? editingUser : user
      ));
      setEditingUser(null);
      
    } catch (error) {
      console.error('Error updating user:', error);
      alert('خطا در بروزرسانی کاربر');
    }
    setLoading(false);
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    
    setLoading(true);
    try {
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('خطا در حذف کاربر');
    }
    setLoading(false);
  };

  const toggleUserStatus = async (userId, newStatus) => {
    setLoading(true);
    try {
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('خطا در تغییر وضعیت کاربر');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      phone: '',
      role: ROLES.STAFF,
      status: 'active',
      branchId: '',
      tenantId: currentUser?.tenantId || '',
      permissions: []
    });
    setErrors({});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'suspended': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'فعال';
      case 'inactive': return 'غیرفعال';
      case 'suspended': return 'معلق';
      default: return status;
    }
  };

  if (!hasPermission(PERMISSIONS.MANAGE_TENANT_USERS) && !hasPermission(PERMISSIONS.MANAGE_BRANCH_STAFF)) {
    return (
      <div className="rtl-container min-h-screen bg-gray-50 flex items-center justify-center font-persian">
        <div className="persian-card p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-bold text-red-600 mb-2">دسترسی محدود</h3>
          <p className="text-gray-600">شما دسترسی مدیریت کاربران را ندارید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rtl-container min-h-screen bg-gray-50 font-persian">
      <div className="container mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-primary-persian mb-2">مدیریت کاربران</h1>
              <p className="text-gray-600">مدیریت کاربران و دسترسی‌های سیستم</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-persian-primary"
            >
              + افزودن کاربر جدید
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="persian-card mb-6"
        >
          <div className="persian-card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">جستجو</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="نام، ایمیل یا تلفن"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نقش</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">همه نقش‌ها</option>
                  {getAvailableRoles().map(role => (
                    <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وضعیت</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">همه وضعیت‌ها</option>
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                  <option value="suspended">معلق</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ role: '', status: '', search: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  پاک کردن فیلتر
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="persian-card"
        >
          <div className="persian-card-header">
            <h3 className="text-lg font-semibold">
              لیست کاربران ({PersianUtils.formatNumber(filteredUsers.length, true)} نفر)
            </h3>
          </div>
          <div className="persian-card-body p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="persian-loading mx-auto mb-4"></div>
                <p className="text-gray-600">در حال بارگذاری...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">👥</div>
                <p className="text-gray-600">هیچ کاربری یافت نشد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full rtl-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">کاربر</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">نقش</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">وضعیت</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">آخرین ورود</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                            <div className="text-sm text-gray-600">{user.phone}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(user.status)}`}>
                            {getStatusLabel(user.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.lastLogin 
                            ? PersianCalendar.format(user.lastLogin)
                            : 'هرگز'
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2 space-x-reverse">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              ویرایش
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => toggleUserStatus(user.id, 'suspended')}
                                className="text-orange-600 hover:text-orange-800 text-sm"
                              >
                                تعلیق
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleUserStatus(user.id, 'active')}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                فعال‌سازی
                              </button>
                            )}
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {/* Create User Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              >
                <h3 className="text-lg font-bold mb-4">افزودن کاربر جدید</h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نام کامل *</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ایمیل *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">شماره تلفن *</label>
                    <input
                      type="text"
                      value={newUser.phone}
                      onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="09xxxxxxxxx"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نقش *</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {getAvailableRoles().map(role => (
                        <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                      ))}
                    </select>
                    {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
                  </div>
                </div>
                
                <div className="flex space-x-3 space-x-reverse">
                  <button
                    onClick={createUser}
                    disabled={loading}
                    className="btn-persian-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'در حال ایجاد...' : 'ایجاد کاربر'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    لغو
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit User Modal */}
        <AnimatePresence>
          {editingUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              >
                <h3 className="text-lg font-bold mb-4">ویرایش کاربر</h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نام کامل *</label>
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ایمیل *</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">شماره تلفن *</label>
                    <input
                      type="text"
                      value={editingUser.phone}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نقش *</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {getAvailableRoles().map(role => (
                        <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                      ))}
                    </select>
                    {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
                  </div>
                </div>
                
                <div className="flex space-x-3 space-x-reverse">
                  <button
                    onClick={updateUser}
                    disabled={loading}
                    className="btn-persian-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'در حال بروزرسانی...' : 'بروزرسانی'}
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    لغو
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UserManagement;