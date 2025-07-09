// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Import components
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import TenantManagement from './pages/admin/TenantManagement';
import AccountingDashboard from './pages/accounting/AccountingDashboard';
import MultiAccountPayment from './components/payments/MultiAccountPayment';
import P2PMarketplace from './pages/p2p/P2PMarketplace';
import RemittanceCenter from './pages/remittance/RemittanceCenter';

// Import contexts
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

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
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  
                  {/* Super Admin Routes */}
                  <Route path="admin/tenants" element={<TenantManagement />} />
                  
                  {/* Accounting Routes */}
                  <Route path="accounting" element={<AccountingDashboard />} />
                  <Route path="accounting/transactions" element={<TransactionList />} />
                  <Route path="accounting/reports" element={<FinancialReports />} />
                  
                  {/* Payment Routes */}
                  <Route path="payments" element={<PaymentList />} />
                  <Route path="payments/:paymentId" element={<MultiAccountPayment />} />
                  
                  {/* P2P Routes */}
                  <Route path="p2p" element={<P2PMarketplace />} />
                  <Route path="p2p/announcements" element={<P2PAnnouncements />} />
                  
                  {/* Remittance Routes */}
                  <Route path="remittance" element={<RemittanceCenter />} />
                  <Route path="remittance/new" element={<NewRemittance />} />
                  <Route path="remittance/:remittanceId" element={<RemittanceDetails />} />
                </Route>
              </Routes>
            </div>
          </Router>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'inherit',
              },
            }}
          />
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
