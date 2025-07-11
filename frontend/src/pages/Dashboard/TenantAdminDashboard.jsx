import React from 'react';
import TenantDashboard from '../../components/dashboards/TenantDashboard';
import PlanComparison from '../../components/PlanComparison';
import CurrentPlanStatus from '../../components/CurrentPlanStatus';

const TenantAdminDashboard = () => {
  return (
    <div>
      <CurrentPlanStatus />
      <TenantDashboard />
      {/* Keep existing plan comparison at the bottom */}
      <div className="px-6 pb-6">
        <PlanComparison />
      </div>
    </div>
  );
};

export default TenantAdminDashboard; 