// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { StateSyncProvider } from './contexts/StateSyncContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './router/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
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
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TenantProvider>
            <StateSyncProvider>
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
              <Toaster 
                position="top-center" 
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </StateSyncProvider>
          </TenantProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
