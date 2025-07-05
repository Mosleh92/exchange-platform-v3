import React from 'react';
import { clsx } from 'clsx';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-sans font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark active:bg-indigo-700 focus:ring-primary',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark active:bg-slate-700 focus:ring-secondary',
    success: 'bg-success text-white hover:bg-emerald-600 active:bg-emerald-700 focus:ring-success',
    danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 focus:ring-danger',
    warning: 'bg-warning text-white hover:bg-amber-500 active:bg-amber-600 focus:ring-warning',
    ghost: 'bg-transparent text-primary border border-primary hover:bg-primary/10 active:bg-primary/20 focus:ring-primary',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      )}
      {children}
    </button>
  );
};

export default Button; 