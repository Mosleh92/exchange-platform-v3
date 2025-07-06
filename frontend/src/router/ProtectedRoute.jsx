import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { hasAccess } from '../utils/roleAccess';

const ProtectedRoute = ({ allowedRoles = [], redirectTo = '/login' }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    // اگر کاربر لاگین نیست
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles.length > 0 && !hasAccess(user, allowedRoles)) {
    // اگر نقش کاربر مجاز نیست
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute; 