import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../contexts/RBACContext';
import { motion } from 'framer-motion';

const ProtectedRoute = ({ 
  children, 
  permissions = [], 
  roles = [], 
  requireAuth = true,
  redirectTo = '/auth/login',
  fallbackComponent = null 
}) => {
  const { user, canAccess, loading } = useRBAC();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="rtl-container min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="persian-loading mx-auto mb-4"></div>
          <p className="text-gray-600 font-persian">در حال بررسی دسترسی...</p>
        </motion.div>
      </div>
    );
  }

  // Check if user is authenticated when required
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check permissions and roles
  if (user && !canAccess(permissions, roles)) {
    if (fallbackComponent) {
      return fallbackComponent;
    }
    
    return (
      <div className="rtl-container min-h-screen bg-gray-50 flex items-center justify-center font-persian">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="persian-card p-8 text-center max-w-md"
        >
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-bold text-red-600 mb-2">دسترسی محدود</h3>
          <p className="text-gray-600 mb-4">
            شما دسترسی لازم برای مشاهده این صفحه را ندارید.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-persian-primary"
          >
            بازگشت
          </button>
        </motion.div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;