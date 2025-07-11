import React from 'react';
import TenantDashboard from './components/dashboards/TenantDashboard';
import BranchDashboard from './components/dashboards/BranchDashboard';
import CustomerList from './features/customers/CustomerList';
import ExchangeCalculator from './features/exchange/ExchangeCalculator';
import RemittanceForm from './features/remittance/RemittanceForm';

function App() {
  const [currentView, setCurrentView] = React.useState('tenant');
  const [showRemittance, setShowRemittance] = React.useState(false);

  const views = {
    tenant: <TenantDashboard />,
    branch: <BranchDashboard />,
    customers: <CustomerList />,
    exchange: <ExchangeCalculator onTransactionSubmit={(data) => console.log('Transaction:', data)} />
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">سیستم مدیریت صرافی</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('tenant')}
                className={`px-4 py-2 rounded-lg ${currentView === 'tenant' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                داشبورد صرافی
              </button>
              <button
                onClick={() => setCurrentView('branch')}
                className={`px-4 py-2 rounded-lg ${currentView === 'branch' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                داشبورد شعبه
              </button>
              <button
                onClick={() => setCurrentView('customers')}
                className={`px-4 py-2 rounded-lg ${currentView === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                مدیریت مشتریان
              </button>
              <button
                onClick={() => setCurrentView('exchange')}
                className={`px-4 py-2 rounded-lg ${currentView === 'exchange' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                معاملات ارزی
              </button>
              <button
                onClick={() => setShowRemittance(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ارسال حواله
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {views[currentView]}
      </main>

      {/* Remittance Modal */}
      {showRemittance && (
        <RemittanceForm
          onClose={() => setShowRemittance(false)}
          onSubmit={(data) => {
            console.log('Remittance:', data);
            setShowRemittance(false);
            alert('حواله با موفقیت ارسال شد');
          }}
        />
      )}
    </div>
  );
}

export default App;