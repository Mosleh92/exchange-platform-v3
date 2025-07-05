// src/pages/TenantManagement.jsx - پنل مدیریت شما
import React, { useState } from 'react';

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTenant, setNewTenant] = useState({
    companyName: '',
    subdomain: '',
    ownerName: '',
    email: '',
    phone: '',
    country: '',
    defaultPassword: ''
  });

  const createTenant = () => {
    const tenant = {
      id: `tenant_${Date.now()}`,
      ...newTenant,
      createdAt: new Date().toISOString(),
      status: 'active',
      subscription: {
        plan: 'annual',
        amount: 5000, // AED
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      adminCredentials: {
        username: `admin_${newTenant.subdomain}`,
        password: newTenant.defaultPassword || 'Exchange@123',
        mustChangePassword: true
      },
      settings: {
        allowP2P: false,
        maxCustomers: 1000,
        currencies: ['USD', 'AED', 'EUR', 'IRR'],
        branding: {
          logo: '',
          primaryColor: '#1e40af',
          companyName: newTenant.companyName
        }
      }
    };

    // Save tenant
    const updatedTenants = [...tenants, tenant];
    setTenants(updatedTenants);
    localStorage.setItem('platform_tenants', JSON.stringify(updatedTenants));

    // Create tenant database
    createTenantDatabase(tenant.id);

    // Send credentials email (mock)
    sendCredentials(tenant);

    setShowCreateForm(false);
    setNewTenant({
      companyName: '',
      subdomain: '',
      ownerName: '',
      email: '',
      phone: '',
      country: '',
      defaultPassword: ''
    });
  };

  const createTenantDatabase = (tenantId) => {
    // Initialize empty database for tenant
    const tenantData = {
      users: [{
        id: 'admin_001',
        username: `admin_${tenantId}`,
        role: 'admin',
        permissions: ['all']
      }],
      customers: [],
      transactions: [],
      remittances: [],
      settings: {},
      reports: []
    };

    localStorage.setItem(`tenant_${tenantId}_data`, JSON.stringify(tenantData));
  };

  const sendCredentials = (tenant) => {
    // Mock email/SMS sender
    console.log(`
      Credentials sent to ${tenant.email}:
      URL: https://${tenant.subdomain}.yourplatform.com
      Username: ${tenant.adminCredentials.username}
      Password: ${tenant.adminCredentials.password}
    `);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🏢 Tenant Management</h1>
              <p className="text-gray-600">Manage all exchanger accounts</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
            >
              ➕ Add New Exchanger
            </button>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-white rounded-2xl shadow-xl">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">All Exchangers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Company</th>
                  <th className="px-6 py-3 text-left">Subdomain</th>
                  <th className="px-6 py-3 text-left">Owner</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Subscription</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="border-t">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{tenant.companyName}</p>
                        <p className="text-sm text-gray-500">{tenant.country}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://${tenant.subdomain}.yourplatform.com`}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tenant.subdomain}.yourplatform.com
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{tenant.ownerName}</p>
                        <p className="text-sm text-gray-500">{tenant.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">${tenant.subscription.amount}/year</p>
                        <p className="text-sm text-gray-500">
                          Renews: {new Date(tenant.subscription.renewalDate).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">Edit</button>
                        <button className="text-green-600 hover:text-green-800">Login As</button>
                        <button className="text-red-600 hover:text-red-800">Suspend</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4">
              <h3 className="text-xl font-semibold mb-4">Create New Exchanger Account</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  placeholder="Company Name"
                  value={newTenant.companyName}
                  onChange={(e) => setNewTenant({...newTenant, companyName: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  placeholder="Subdomain (e.g. tehran-exchange)"
                  value={newTenant.subdomain}
                  onChange={(e) => setNewTenant({...newTenant, subdomain: e.target.value.toLowerCase()})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  placeholder="Owner Name"
                  value={newTenant.ownerName}
                  onChange={(e) => setNewTenant({...newTenant, ownerName: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={newTenant.email}
                  onChange={(e) => setNewTenant({...newTenant, email: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  placeholder="Phone"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({...newTenant, phone: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <select
                  value={newTenant.country}
                  onChange={(e) => setNewTenant({...newTenant, country: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select Country</option>
                  <option value="UAE">🇦🇪 UAE</option>
                  <option value="Iran">🇮🇷 Iran</option>
                  <option value="Turkey">🇹🇷 Turkey</option>
                  <option value="China">🇨🇳 China</option>
                </select>
                <input
                  placeholder="Default Password (optional)"
                  type="password"
                  value={newTenant.defaultPassword}
                  onChange={(e) => setNewTenant({...newTenant, defaultPassword: e.target.value})}
                  className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-2"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-800 mb-2">Auto-Generated Credentials:</h4>
                <p className="text-sm text-blue-700">
                  <strong>URL:</strong> https://{newTenant.subdomain || 'subdomain'}.yourplatform.com<br/>
                  <strong>Username:</strong> admin_{newTenant.subdomain || 'subdomain'}<br/>
                  <strong>Password:</strong> {newTenant.defaultPassword || 'Exchange@123'}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createTenant}
                  disabled={!newTenant.companyName || !newTenant.subdomain}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  Create Exchanger Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantManagement;