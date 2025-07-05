// نقش‌های مجاز: ['super_admin', 'tenant_admin', 'branch_manager', 'staff', 'customer']

export function hasAccess(user, allowedRoles = []) {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

// هوک برای استفاده در کامپوننت‌ها
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useRoleAccess(allowedRoles = []) {
  const { user } = useContext(AuthContext);
  return hasAccess(user, allowedRoles);
} 