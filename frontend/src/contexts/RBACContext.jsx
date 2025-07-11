import React, { createContext, useContext, useState, useEffect } from 'react';

// Define roles and their hierarchies
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  BRANCH_ADMIN: 'branch_admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  CUSTOMER: 'customer'
};

// Define permissions
export const PERMISSIONS = {
  // System Management
  MANAGE_SYSTEM: 'manage_system',
  MANAGE_TENANTS: 'manage_tenants',
  VIEW_SYSTEM_REPORTS: 'view_system_reports',
  
  // Tenant Management
  MANAGE_BRANCHES: 'manage_branches',
  MANAGE_TENANT_SETTINGS: 'manage_tenant_settings',
  VIEW_TENANT_REPORTS: 'view_tenant_reports',
  MANAGE_TENANT_USERS: 'manage_tenant_users',
  
  // Branch Management
  MANAGE_BRANCH_SETTINGS: 'manage_branch_settings',
  VIEW_BRANCH_REPORTS: 'view_branch_reports',
  MANAGE_BRANCH_STAFF: 'manage_branch_staff',
  
  // Customer Management
  CREATE_CUSTOMER: 'create_customer',
  VIEW_CUSTOMER: 'view_customer',
  EDIT_CUSTOMER: 'edit_customer',
  DELETE_CUSTOMER: 'delete_customer',
  MANAGE_CUSTOMER_KYC: 'manage_customer_kyc',
  
  // Transaction Management
  CREATE_TRANSACTION: 'create_transaction',
  VIEW_TRANSACTION: 'view_transaction',
  EDIT_TRANSACTION: 'edit_transaction',
  DELETE_TRANSACTION: 'delete_transaction',
  APPROVE_TRANSACTION: 'approve_transaction',
  CANCEL_TRANSACTION: 'cancel_transaction',
  
  // Exchange Management
  MANAGE_EXCHANGE_RATES: 'manage_exchange_rates',
  CREATE_EXCHANGE: 'create_exchange',
  VIEW_EXCHANGE: 'view_exchange',
  APPROVE_EXCHANGE: 'approve_exchange',
  
  // Remittance Management
  CREATE_REMITTANCE: 'create_remittance',
  VIEW_REMITTANCE: 'view_remittance',
  APPROVE_REMITTANCE: 'approve_remittance',
  TRACK_REMITTANCE: 'track_remittance',
  
  // Payment Management
  CREATE_PAYMENT: 'create_payment',
  VIEW_PAYMENT: 'view_payment',
  VERIFY_PAYMENT: 'verify_payment',
  REJECT_PAYMENT: 'reject_payment',
  
  // Reports
  VIEW_FINANCIAL_REPORTS: 'view_financial_reports',
  VIEW_CUSTOMER_REPORTS: 'view_customer_reports',
  VIEW_TRANSACTION_REPORTS: 'view_transaction_reports',
  EXPORT_REPORTS: 'export_reports',
  
  // Dashboard
  VIEW_TENANT_DASHBOARD: 'view_tenant_dashboard',
  VIEW_BRANCH_DASHBOARD: 'view_branch_dashboard',
  VIEW_CUSTOMER_DASHBOARD: 'view_customer_dashboard'
};

// Role-Permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.MANAGE_TENANTS,
    PERMISSIONS.VIEW_SYSTEM_REPORTS,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.MANAGE_TENANT_SETTINGS,
    PERMISSIONS.VIEW_TENANT_REPORTS,
    PERMISSIONS.MANAGE_TENANT_USERS,
    PERMISSIONS.MANAGE_BRANCH_SETTINGS,
    PERMISSIONS.VIEW_BRANCH_REPORTS,
    PERMISSIONS.MANAGE_BRANCH_STAFF,
    PERMISSIONS.CREATE_CUSTOMER,
    PERMISSIONS.VIEW_CUSTOMER,
    PERMISSIONS.EDIT_CUSTOMER,
    PERMISSIONS.DELETE_CUSTOMER,
    PERMISSIONS.MANAGE_CUSTOMER_KYC,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.VIEW_TRANSACTION,
    PERMISSIONS.EDIT_TRANSACTION,
    PERMISSIONS.DELETE_TRANSACTION,
    PERMISSIONS.APPROVE_TRANSACTION,
    PERMISSIONS.CANCEL_TRANSACTION,
    PERMISSIONS.MANAGE_EXCHANGE_RATES,
    PERMISSIONS.CREATE_EXCHANGE,
    PERMISSIONS.VIEW_EXCHANGE,
    PERMISSIONS.APPROVE_EXCHANGE,
    PERMISSIONS.CREATE_REMITTANCE,
    PERMISSIONS.VIEW_REMITTANCE,
    PERMISSIONS.APPROVE_REMITTANCE,
    PERMISSIONS.TRACK_REMITTANCE,
    PERMISSIONS.CREATE_PAYMENT,
    PERMISSIONS.VIEW_PAYMENT,
    PERMISSIONS.VERIFY_PAYMENT,
    PERMISSIONS.REJECT_PAYMENT,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_CUSTOMER_REPORTS,
    PERMISSIONS.VIEW_TRANSACTION_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_TENANT_DASHBOARD,
    PERMISSIONS.VIEW_BRANCH_DASHBOARD
  ],
  
  [ROLES.TENANT_ADMIN]: [
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.MANAGE_TENANT_SETTINGS,
    PERMISSIONS.VIEW_TENANT_REPORTS,
    PERMISSIONS.MANAGE_TENANT_USERS,
    PERMISSIONS.MANAGE_BRANCH_SETTINGS,
    PERMISSIONS.VIEW_BRANCH_REPORTS,
    PERMISSIONS.MANAGE_BRANCH_STAFF,
    PERMISSIONS.CREATE_CUSTOMER,
    PERMISSIONS.VIEW_CUSTOMER,
    PERMISSIONS.EDIT_CUSTOMER,
    PERMISSIONS.MANAGE_CUSTOMER_KYC,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.VIEW_TRANSACTION,
    PERMISSIONS.EDIT_TRANSACTION,
    PERMISSIONS.APPROVE_TRANSACTION,
    PERMISSIONS.CANCEL_TRANSACTION,
    PERMISSIONS.MANAGE_EXCHANGE_RATES,
    PERMISSIONS.CREATE_EXCHANGE,
    PERMISSIONS.VIEW_EXCHANGE,
    PERMISSIONS.APPROVE_EXCHANGE,
    PERMISSIONS.CREATE_REMITTANCE,
    PERMISSIONS.VIEW_REMITTANCE,
    PERMISSIONS.APPROVE_REMITTANCE,
    PERMISSIONS.TRACK_REMITTANCE,
    PERMISSIONS.CREATE_PAYMENT,
    PERMISSIONS.VIEW_PAYMENT,
    PERMISSIONS.VERIFY_PAYMENT,
    PERMISSIONS.REJECT_PAYMENT,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_CUSTOMER_REPORTS,
    PERMISSIONS.VIEW_TRANSACTION_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_TENANT_DASHBOARD,
    PERMISSIONS.VIEW_BRANCH_DASHBOARD
  ],
  
  [ROLES.BRANCH_ADMIN]: [
    PERMISSIONS.MANAGE_BRANCH_SETTINGS,
    PERMISSIONS.VIEW_BRANCH_REPORTS,
    PERMISSIONS.MANAGE_BRANCH_STAFF,
    PERMISSIONS.CREATE_CUSTOMER,
    PERMISSIONS.VIEW_CUSTOMER,
    PERMISSIONS.EDIT_CUSTOMER,
    PERMISSIONS.MANAGE_CUSTOMER_KYC,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.VIEW_TRANSACTION,
    PERMISSIONS.EDIT_TRANSACTION,
    PERMISSIONS.APPROVE_TRANSACTION,
    PERMISSIONS.CREATE_EXCHANGE,
    PERMISSIONS.VIEW_EXCHANGE,
    PERMISSIONS.APPROVE_EXCHANGE,
    PERMISSIONS.CREATE_REMITTANCE,
    PERMISSIONS.VIEW_REMITTANCE,
    PERMISSIONS.APPROVE_REMITTANCE,
    PERMISSIONS.TRACK_REMITTANCE,
    PERMISSIONS.CREATE_PAYMENT,
    PERMISSIONS.VIEW_PAYMENT,
    PERMISSIONS.VERIFY_PAYMENT,
    PERMISSIONS.REJECT_PAYMENT,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_CUSTOMER_REPORTS,
    PERMISSIONS.VIEW_TRANSACTION_REPORTS,
    PERMISSIONS.VIEW_BRANCH_DASHBOARD
  ],
  
  [ROLES.MANAGER]: [
    PERMISSIONS.CREATE_CUSTOMER,
    PERMISSIONS.VIEW_CUSTOMER,
    PERMISSIONS.EDIT_CUSTOMER,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.VIEW_TRANSACTION,
    PERMISSIONS.EDIT_TRANSACTION,
    PERMISSIONS.APPROVE_TRANSACTION,
    PERMISSIONS.CREATE_EXCHANGE,
    PERMISSIONS.VIEW_EXCHANGE,
    PERMISSIONS.CREATE_REMITTANCE,
    PERMISSIONS.VIEW_REMITTANCE,
    PERMISSIONS.TRACK_REMITTANCE,
    PERMISSIONS.CREATE_PAYMENT,
    PERMISSIONS.VIEW_PAYMENT,
    PERMISSIONS.VERIFY_PAYMENT,
    PERMISSIONS.VIEW_CUSTOMER_REPORTS,
    PERMISSIONS.VIEW_TRANSACTION_REPORTS,
    PERMISSIONS.VIEW_BRANCH_DASHBOARD
  ],
  
  [ROLES.STAFF]: [
    PERMISSIONS.CREATE_CUSTOMER,
    PERMISSIONS.VIEW_CUSTOMER,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.VIEW_TRANSACTION,
    PERMISSIONS.CREATE_EXCHANGE,
    PERMISSIONS.VIEW_EXCHANGE,
    PERMISSIONS.CREATE_REMITTANCE,
    PERMISSIONS.VIEW_REMITTANCE,
    PERMISSIONS.CREATE_PAYMENT,
    PERMISSIONS.VIEW_PAYMENT,
    PERMISSIONS.VIEW_BRANCH_DASHBOARD
  ],
  
  [ROLES.CUSTOMER]: [
    PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,
    PERMISSIONS.VIEW_TRANSACTION,
    PERMISSIONS.VIEW_REMITTANCE,
    PERMISSIONS.TRACK_REMITTANCE
  ]
};

// Create context
const RBACContext = createContext();

// RBAC Provider
export const RBACProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user data from localStorage or API
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // First try to get from localStorage
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setPermissions(ROLE_PERMISSIONS[userData.role] || []);
      } else {
        // Fallback: set a demo user for development
        const demoUser = {
          id: 1,
          name: 'کاربر آزمایشی',
          email: 'demo@example.com',
          role: ROLES.TENANT_ADMIN,
          tenantId: 'demo-tenant',
          branchId: 'demo-branch'
        };
        setUser(demoUser);
        setPermissions(ROLE_PERMISSIONS[demoUser.role] || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    setLoading(false);
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roleList) => {
    return roleList.includes(user?.role);
  };

  const canAccess = (requiredPermissions = [], requiredRoles = []) => {
    if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
      return false;
    }
    if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
      return false;
    }
    return true;
  };

  const login = (userData) => {
    setUser(userData);
    setPermissions(ROLE_PERMISSIONS[userData.role] || []);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    canAccess,
    login,
    logout,
    ROLES,
    PERMISSIONS
  };

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
};

// Hook to use RBAC
export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

// HOC for protected components
export const withPermission = (WrappedComponent, requiredPermissions = [], requiredRoles = []) => {
  return function ProtectedComponent(props) {
    const { canAccess } = useRBAC();
    
    if (!canAccess(requiredPermissions, requiredRoles)) {
      return (
        <div className="rtl-container min-h-screen bg-gray-50 flex items-center justify-center font-persian">
          <div className="persian-card p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h3 className="text-xl font-bold text-red-600 mb-2">دسترسی محدود</h3>
            <p className="text-gray-600">شما دسترسی لازم برای مشاهده این صفحه را ندارید.</p>
          </div>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Component for conditional rendering based on permissions
export const PermissionGate = ({ 
  children, 
  permissions = [], 
  roles = [], 
  fallback = null,
  requireAll = false 
}) => {
  const { hasPermission, hasRole, hasAnyPermission, hasAnyRole } = useRBAC();
  
  let hasAccess = true;
  
  if (permissions.length > 0) {
    hasAccess = requireAll 
      ? permissions.every(permission => hasPermission(permission))
      : hasAnyPermission(permissions);
  }
  
  if (roles.length > 0 && hasAccess) {
    hasAccess = requireAll
      ? roles.every(role => hasRole(role))
      : hasAnyRole(roles);
  }
  
  return hasAccess ? children : fallback;
};

// Utility function to get role display name in Persian
export const getRoleDisplayName = (role) => {
  const roleNames = {
    [ROLES.SUPER_ADMIN]: 'سوپر ادمین',
    [ROLES.TENANT_ADMIN]: 'مدیر صرافی',
    [ROLES.BRANCH_ADMIN]: 'مدیر شعبه',
    [ROLES.MANAGER]: 'سرپرست',
    [ROLES.STAFF]: 'کارمند',
    [ROLES.CUSTOMER]: 'مشتری'
  };
  return roleNames[role] || role;
};

export default RBACContext;