// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import TenantManagement from './pages/admin/TenantManagement';
import AccountingDashboard from './pages/accounting/AccountingDashboard';
import PaymentsPage from './pages/payments/PaymentsPage';
import P2PPage from './pages/p2p/P2PPage';

// Styles
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <Router>
            <div className="min-h-screen bg-gray-50" dir="rtl">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="admin/tenants" element={<TenantManagement />} />
                  <Route path="accounting" element={<AccountingDashboard />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="p2p" element={<P2PPage />} />
                </Route>
              </Routes>
            </div>
          </Router>
          <Toaster position="top-center" />
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
