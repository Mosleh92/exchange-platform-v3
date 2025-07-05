import React, { Suspense, lazy } from 'react';
import { NavLink, Routes, Route, Outlet } from 'react-router-dom';

const Dashboard = lazy(() => import('./Dashboard'));
const Wallets = lazy(() => import('./Wallets'));
const PendingTransactions = lazy(() => import('./PendingTransactions'));
const TransactionHistory = lazy(() => import('./TransactionHistory'));
const RateOffers = lazy(() => import('./RateOffers'));
const NewOrder = lazy(() => import('./NewOrder'));
const SecurityCenter = lazy(() => import('./SecurityCenter'));

const menu = [
  { to: 'dashboard', label: 'داشبورد' },
  { to: 'wallets', label: 'کیف پول' },
  { to: 'pending', label: 'واریزهای در انتظار' },
  { to: 'history', label: 'تاریخچه تراکنش‌ها' },
  { to: 'rates', label: 'نرخ‌های اختصاصی' },
  { to: 'new-order', label: 'ثبت سفارش جدید' },
  { to: 'security', label: 'امنیت حساب' },
];

const CustomerPortal = () => (
  <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
    {/* منوی کناری */}
    <nav className="md:w-64 w-full bg-white shadow md:h-auto h-16 flex md:flex-col flex-row md:items-start items-center md:justify-start justify-between p-2 md:p-4">
      {menu.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-3 py-2 rounded font-semibold text-sm md:mb-2 md:mr-0 mr-2 ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
          }
          end
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
    {/* محتوای اصلی */}
    <main className="flex-1 p-2 md:p-6">
      <Suspense fallback={<div>در حال بارگذاری...</div>}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="pending" element={<PendingTransactions />} />
          <Route path="history" element={<TransactionHistory />} />
          <Route path="rates" element={<RateOffers />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="security" element={<SecurityCenter />} />
        </Routes>
        <Outlet />
      </Suspense>
    </main>
  </div>
);

export default CustomerPortal; 