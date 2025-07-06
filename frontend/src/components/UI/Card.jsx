import React from 'react';
import { clsx } from 'clsx';

const Card = ({
  children,
  className = '',
  padding = 'p-6',
  shadow = 'shadow-sm',
  border = 'border border-gray-200 dark:border-gray-700',
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg',
        padding,
        shadow,
        border,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card; 