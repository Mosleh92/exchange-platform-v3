// src/admin/TenantManager.jsx
import React, { useState, useEffect } from 'react';

const TenantManager = () => {
  const [tenants, setTenants] = useState([]);
  const [newTenant, setNewTenant] = useState({
    subdomain: '',
    companyName: '',
    ownerName: '',
    country: '',
    subscription: 'active',
    yearlyFee: 5000,
    currencies: []
  });

  const createTenant = async () => {
    const tenant = {
      id: `tenant_${Date.now()}`,
      ...newTenant,
      createdAt: new Date().toISOString(),
      database: `db_${newTenant.subdomain}`,
      status: 'active'
    };

    // ایجاد دیتابیس جداگانه
    await createTenantDatabase(tenant.id);
    
    // ایجاد subdomain
    await setupSubdomain(tenant.subdomain);
    
    setTenants([...tenants, tenant]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Platform Management</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Active Exchangers" value={tenants.length} />
          <StatsCard title="Monthly Revenue" value="$50,000" />
          <StatsCard title="Countries" value="25" />
          <StatsCard title="Total Transactions" value="125K" />
        </div>

        {/* Create New Tenant */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Exchanger</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              placeholder="Subdomain (e.g., tehran-exchange)"
              value={newTenant.subdomain}
              onChange={(e) => setNewTenant({...newTenant, subdomain: e.target.value})}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
            <input
              placeholder="Company Name"
              value={newTenant.companyName}
              onChange={(e) => setNewTenant({...newTenant, companyName: e.target.value})}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
            <button
              onClick={createTenant}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Create Exchanger
            </button>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">All Exchangers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Company</th>
                  <th className="px-6 py-3 text-left">Subdomain</th>
                  <th className="px-6 py-3 text-left">Country</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Last Payment</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => (
                  <TenantRow key={tenant.id} tenant={tenant} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};