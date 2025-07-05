import { Suspense, lazy } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qimzwedwkxhhemmxgciv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbXp3ZWR3a3hoaGVtbXhnY2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1OTk1MjYsImV4cCI6MjA2NjE3NTUyNn0.VhoRtF1BXlrOPT929_fwN__UUwCSpGPM7G-Lk73X1_I';
export const supabase = createClient(supabaseUrl, supabaseKey);
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Loading from './components/UI/Loading';
import PublicRoute from './router/PublicRoute';
import ErrorBoundary from './components/UI/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { supabase } from './services/supabaseClient';

// Layouts and components
// import Layout from './components/Layout/Layout';
// import PublicRoute from './router/PublicRoute';
// import ProtectedRoute from './router/ProtectedRoute';
// import CustomerPortal from './pages/CustomerPortal';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/Dashboard/SuperAdminDashboard'));
const TenantAdminDashboard = lazy(() => import('./pages/Dashboard/TenantAdminDashboard'));
const CustomerDashboard = lazy(() => import('./pages/Dashboard/CustomerDashboard'));
const UserManagement = lazy(() => import('./pages/Management/UserManagement'));
const BranchManagement = lazy(() => import('./pages/Management/BranchManagement'));
const TenantManagement = lazy(() => import('./pages/Management/TenantManagement'));
const SalesPlanManagementPage = lazy(() => import('./pages/Management/SalesPlanManagement'));
const Customers = lazy(() => import('./pages/Customers/Customers'));
const CustomerDetails = lazy(() => import('./pages/Customers/CustomerDetails'));
const CustomerAccounts = lazy(() => import('./pages/Customers/CustomerAccounts'));
const Transactions = lazy(() => import('./pages/Transactions/Transactions'));
const TransactionDetails = lazy(() => import('./pages/Transactions/TransactionDetails'));
const TransactionCreate = lazy(() => import('./pages/Transactions/TransactionCreate'));
const Remittances = lazy(() => import('./pages/Remittance/Remittances'));
const RemittanceDetails = lazy(() => import('./pages/Remittance/RemittanceDetails'));
const RemittanceCreate = lazy(() => import('./pages/Remittance/RemittanceCreate'));
const ExchangeRates = lazy(() => import('./pages/Exchange/ExchangeRates'));
const P2PMarketplace = lazy(() => import('./pages/Exchange/P2PMarketplace'));
const FinancialReports = lazy(() => import('./pages/Reports/FinancialReports'));
const TransactionReports = lazy(() => import('./pages/Reports/TransactionReports'));
const Profile = lazy(() => import('./pages/Settings/Profile'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SuperAdminSettings = lazy(() => import('./components/admin/SuperAdminSettings'));
const SuperAdminLogin = lazy(() => import('./pages/Auth/SuperAdminLogin'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const BranchManagerDashboard = lazy(() => import('./pages/Dashboard/BranchManagerDashboard'));
const StaffDashboard = lazy(() => import('./pages/Dashboard/StaffDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Router>
          <ThemeProvider>
            <AuthProvider>
              <SocketProvider>
                <TenantProvider>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
                    <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
                    <Route path="/customer-portal" element={<PublicRoute><CustomerPortal /></PublicRoute>} />
                    <Route path="/super-admin-login" element={<PublicRoute><SuperAdminLogin /></PublicRoute>} />

                    {/* Unauthorized Route */}
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      {/* Dashboards */}
                      <Route index element={<Dashboard />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="super-admin-dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
                      <Route path="tenant-admin-dashboard" element={<ProtectedRoute allowedRoles={['tenant_admin']}><TenantAdminDashboard /></ProtectedRoute>} />
                      <Route path="branch-manager-dashboard" element={<ProtectedRoute allowedRoles={['branch_manager']}><BranchManagerDashboard /></ProtectedRoute>} />
                      <Route path="staff-dashboard" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
                      <Route path="customer-dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />

                      {/* Management */}
                      <Route path="management">
                        <Route path="users" element={<ProtectedRoute allowedRoles={['tenant-admin', 'super-admin']}><UserManagement /></ProtectedRoute>} />
                        <Route path="branches" element={<ProtectedRoute allowedRoles={['tenant-admin']}><BranchManagement /></ProtectedRoute>} />
                        <Route path="tenants" element={<ProtectedRoute allowedRoles={['super-admin']}><TenantManagement /></ProtectedRoute>} />
                        <Route path="sales-plans" element={<ProtectedRoute allowedRoles={['super-admin']}><SalesPlanManagementPage /></ProtectedRoute>} />
                      </Route>

                      {/* Customers */}
                      <Route path="customers">
                        <Route index element={<ProtectedRoute allowedRoles={['staff', 'tenant-admin']}><Customers /></ProtectedRoute>} />
                        <Route path=":customerId" element={<ProtectedRoute allowedRoles={['staff', 'tenant-admin']}><CustomerDetails /></ProtectedRoute>} />
                        <Route path=":customerId/accounts" element={<ProtectedRoute allowedRoles={['staff', 'tenant-admin']}><CustomerAccounts /></ProtectedRoute>} />
                      </Route>

                      {/* Transactions */}
                      <Route path="transactions">
                        <Route index element={<Transactions />} />
                        <Route path="new" element={<TransactionCreate />} />
                        <Route path=":transactionId" element={<TransactionDetails />} />
                      </Route>

                      {/* Remittances */}
                      <Route path="remittances">
                        <Route index element={<Remittances />} />
                        <Route path="new" element={<RemittanceCreate />} />
                        <Route path=":remittanceId" element={<RemittanceDetails />} />
                      </Route>

                      {/* Exchange */}
                      <Route path="exchange">
                        <Route index element={<Navigate to="rates" />} />
                        <Route path="rates" element={<ExchangeRates />} />
                        <Route path="p2p" element={<P2PMarketplace />} />
                      </Route>

                      {/* Reports */}
                      <Route path="reports">
                        <Route index element={<Navigate to="financial" />} />
                        <Route path="financial" element={<FinancialReports />} />
                        <Route path="transactions" element={<TransactionReports />} />
                      </Route>

                      {/* Settings */}
                      <Route path="settings">
                        <Route index element={<Settings />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="notification-keys" element={<ProtectedRoute allowedRoles={['super-admin']}><SuperAdminSettings /></ProtectedRoute>} />
                      </Route>
                    </Route>

                    {/* Not Found Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Toaster position="bottom-right" />
                </TenantProvider>
              </SocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </Router>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
