import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const colorClasses = {
    primary: 'border-blue-600',
    secondary: 'border-gray-600',
    white: 'border-white',
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-t-transparent',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
};

interface LoadingOverlayProps {
  children?: React.ReactNode;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={clsx(
        'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
        className
      )}
    >
      <div className="bg-white rounded-lg p-6 flex flex-col items-center">
        <LoadingSpinner size="lg" />
        {children && (
          <p className="mt-4 text-gray-600">{children}</p>
        )}
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  height = 'h-4',
  width = 'w-full',
}) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-200 rounded',
        height,
        width,
        className
      )}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className,
}) => {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="h-4"
          width={index === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <div className={clsx('bg-white rounded-lg shadow p-6', className)}>
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton height="h-4" width="w-1/2" />
          <Skeleton height="h-3" width="w-1/3" className="mt-2" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
};

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={clsx('bg-white rounded-lg shadow overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={index}
              height="h-4"
              width="w-20"
            />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  height="h-4"
                  width={colIndex === 0 ? 'w-32' : 'w-24'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  children,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        className
      )}
      disabled={loading}
    >
      {loading && (
        <LoadingSpinner size="sm" color="white" className="mr-2" />
      )}
      {children}
    </button>
  );
}; 