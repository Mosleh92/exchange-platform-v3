import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  helperText,
  required = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  className,
  containerClassName,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const inputClasses = clsx(
    'form-input',
    error && 'border-red-500 focus:ring-red-500',
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    fullWidth && 'w-full',
    className
  );

  const containerClasses = clsx(
    'form-group',
    fullWidth && 'w-full',
    containerClassName
  );

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400" aria-hidden="true">
              {leftIcon}
            </span>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={clsx(
            error && errorId,
            helperText && helperId
          )}
          required={required}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400" aria-hidden="true">
              {rightIcon}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={helperId} className="text-sm text-gray-500 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput; 