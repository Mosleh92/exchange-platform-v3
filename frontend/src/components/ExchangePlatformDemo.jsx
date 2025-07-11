import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RBACProvider, useRBAC, ROLES, PERMISSIONS, PermissionGate } from '../contexts/RBACContext';

// Import all the major components we've created
import TenantDashboard from '../pages/TenantDashboard';
import BranchDashboard from '../pages/BranchDashboard';
import CurrencyExchangeCalculator from './CurrencyExchangeCalculator';
import InternationalRemittanceSystem from './InternationalRemittanceSystem';
import UserManagement from './UserManagement';
import VirtualizedTransactionList, { generateSampleTransactions } from './VirtualizedTransactionList';
import FinancialReports from './FinancialReports';
import ProtectedRoute from './ProtectedRoute';

import '../styles/rtl.css';

const SystemDemo = () => {
  const { user, login, logout, hasRole, ROLES: userRoles } = useRBAC();
  const [currentView, setCurrentView] = useState('dashboard');
  const [demoUser, setDemoUser] = useState(ROLES.TENANT_ADMIN);

  // Sample user profiles for demonstration
  const demoUsers = {
    [ROLES.SUPER_ADMIN]: {
      id: 1,
      name: 'مدیر سیستم',
      email: 'admin@system.com',
      role: ROLES.SUPER_ADMIN,
      tenantId: 'system',
      branchId: null
    },
    [ROLES.TENANT_ADMIN]: {
      id: 2,
      name: 'مدیر صرافی اصلی',
      email: 'tenant@exchange.com',
      role: ROLES.TENANT_ADMIN,
      tenantId: 'main-exchange',
      branchId: null
    },
    [ROLES.BRANCH_ADMIN]: {
      id: 3,
      name: 'مدیر شعبه مرکزی',
      email: 'branch@exchange.com',
      role: ROLES.BRANCH_ADMIN,
      tenantId: 'main-exchange',
      branchId: 'central-branch'
    },
    [ROLES.MANAGER]: {
      id: 4,
      name: 'سرپرست عملیات',
      email: 'manager@exchange.com',
      role: ROLES.MANAGER,
      tenantId: 'main-exchange',
      branchId: 'central-branch'
    },
    [ROLES.STAFF]: {
      id: 5,
      name: 'کارمند شعبه',
      email: 'staff@exchange.com',
      role: ROLES.STAFF,
      tenantId: 'main-exchange',
      branchId: 'central-branch'
    }
  };

  const navigationItems = [
    { 
      key: 'dashboard', 
      label: 'داشبورد صرافی', 
      icon: '🏢', 
      component: TenantDashboard,
      permissions: [PERMISSIONS.VIEW_TENANT_DASHBOARD],
      description: 'نمای کلی عملکرد سیستم'
    },
    { 
      key: 'branch-dashboard', 
      label: 'داشبورد شعبه', 
      icon: '🏪', 
      component: BranchDashboard,
      permissions: [PERMISSIONS.VIEW_BRANCH_DASHBOARD],
      description: 'مدیریت عملیات شعبه'
    },
    { 
      key: 'exchange', 
      label: 'تبدیل ارز', 
      icon: '💱', 
      component: CurrencyExchangeCalculator,
      permissions: [PERMISSIONS.CREATE_EXCHANGE],
      description: 'ماشین حساب و معاملات ارزی'
    },
    { 
      key: 'remittance', 
      label: 'حواله بین‌المللی', 
      icon: '🌍', 
      component: InternationalRemittanceSystem,
      permissions: [PERMISSIONS.CREATE_REMITTANCE],
      description: 'ارسال حواله به سراسر جهان'
    },
    { 
      key: 'users', 
      label: 'مدیریت کاربران', 
      icon: '👥', 
      component: UserManagement,
      permissions: [PERMISSIONS.MANAGE_TENANT_USERS, PERMISSIONS.MANAGE_BRANCH_STAFF],
      description: 'مدیریت کاربران و دسترسی‌ها'
    },
    { 
      key: 'transactions', 
      label: 'لیست تراکنش‌ها', 
      icon: '📋', 
      component: () => <VirtualizedTransactionList transactions={generateSampleTransactions(1000)} />,
      permissions: [PERMISSIONS.VIEW_TRANSACTION],
      description: 'مشاهده تراکنش‌ها با قابلیت اسکرول مجازی'
    },
    { 
      key: 'reports', 
      label: 'گزارشات مالی', 
      icon: '📊', 
      component: FinancialReports,
      permissions: [PERMISSIONS.VIEW_FINANCIAL_REPORTS],
      description: 'گزارشات و تحلیل‌های مالی پیشرفته'
    }
  ];

  const switchUser = (newRole) => {
    logout();
    login(demoUsers[newRole]);
    setDemoUser(newRole);
    setCurrentView('dashboard');
  };

  const getCurrentComponent = () => {
    const item = navigationItems.find(nav => nav.key === currentView);
    return item ? item.component : TenantDashboard;
  };

  const CurrentComponent = getCurrentComponent();

  return (
    <div className="rtl-container min-h-screen bg-gray-50 font-persian">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 space-x-reverse">
              <h1 className="text-2xl font-bold text-primary-persian">🏛️ سیستم صرافی حرفه‌ای</h1>
              <span className="text-sm text-gray-500">نسخه ۳.۰ - نمایش کامل امکانات</span>
            </div>
            
            {/* User Role Switcher */}
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="text-sm">
                <span className="text-gray-600">نقش فعلی:</span>
                <span className="font-bold text-blue-600 mr-2">
                  {user?.name || 'کاربر میهمان'}
                </span>
              </div>
              
              <select
                value={demoUser}
                onChange={(e) => switchUser(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={ROLES.SUPER_ADMIN}>سوپر ادمین</option>
                <option value={ROLES.TENANT_ADMIN}>مدیر صرافی</option>
                <option value={ROLES.BRANCH_ADMIN}>مدیر شعبه</option>
                <option value={ROLES.MANAGER}>سرپرست</option>
                <option value={ROLES.STAFF}>کارمند</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-white shadow-lg">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">منوی سیستم</h2>
            
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <PermissionGate 
                  key={item.key} 
                  permissions={item.permissions} 
                  fallback={
                    <div className="p-3 rounded-lg bg-gray-100 opacity-50">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="font-medium text-gray-400">{item.label}</div>
                          <div className="text-xs text-gray-400">دسترسی محدود</div>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentView(item.key)}
                    className={`w-full p-3 rounded-lg text-right transition-colors ${
                      currentView === item.key 
                        ? 'bg-blue-50 border-2 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div className={`font-medium ${currentView === item.key ? 'text-blue-700' : 'text-gray-700'}`}>
                          {item.label}
                        </div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </div>
                  </motion.button>
                </PermissionGate>
              ))}
            </nav>

            {/* Feature Showcase */}
            <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <h3 className="font-bold text-sm text-gray-800 mb-3">✨ ویژگی‌های پیاده‌سازی شده</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>پشتیبانی کامل RTL و فارسی</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>سیستم کنترل دسترسی RBAC</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>داشبوردهای تعاملی و زنده</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>ماشین حساب تبدیل ارز</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>سیستم حواله بین‌المللی</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>اسکرول مجازی برای عملکرد</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>گزارشات مالی پیشرفته</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>انیمیشن‌های نرم</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ProtectedRoute
                permissions={navigationItems.find(nav => nav.key === currentView)?.permissions || []}
                fallbackComponent={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🔒</div>
                      <h3 className="text-xl font-bold text-red-600 mb-2">دسترسی محدود</h3>
                      <p className="text-gray-600">شما دسترسی لازم برای مشاهده این بخش را ندارید.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        لطفاً نقش کاربری خود را از منوی بالا تغییر دهید.
                      </p>
                    </div>
                  </div>
                }
              >
                <CurrentComponent />
              </ProtectedRoute>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              <span>🎯 تمام ویژگی‌های مطرح شده در Issue #21 پیاده‌سازی شده است</span>
            </div>
            <div>
              <span>🚀 سیستم صرافی حرفه‌ای - آماده بهره‌برداری</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component with RBAC Provider
const ExchangePlatformDemo = () => {
  return (
    <RBACProvider>
      <SystemDemo />
    </RBACProvider>
  );
};

export default ExchangePlatformDemo;