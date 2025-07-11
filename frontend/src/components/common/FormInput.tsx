import React, { forwardRef } from 'react';
import styles from './FormInput.module.css';

/**
 * FormInput component props interface
 */
interface FormInputProps {
  /** The type of input field */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  /** The label text to display above the input */
  label?: string;
  /** The placeholder text for the input */
  placeholder?: string;
  /** The current value of the input */
  value?: string | number;
  /** The default value of the input */
  defaultValue?: string | number;
  /** Whether the input is required */
  required?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is read-only */
  readOnly?: boolean;
  /** The name attribute for the input */
  name?: string;
  /** The id attribute for the input */
  id?: string;
  /** The minimum value for number inputs */
  min?: number;
  /** The maximum value for number inputs */
  max?: number;
  /** The step value for number inputs */
  step?: number;
  /** The maximum length of the input */
  maxLength?: number;
  /** The minimum length of the input */
  minLength?: number;
  /** The pattern for validation */
  pattern?: string;
  /** Whether to show character count */
  showCharacterCount?: boolean;
  /** Whether to show password toggle for password inputs */
  showPasswordToggle?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text to display below the input */
  helperText?: string;
  /** Icon to display before the input */
  icon?: React.ReactNode;
  /** Icon to display after the input */
  iconRight?: React.ReactNode;
  /** Additional CSS class name */
  className?: string;
  /** Change event handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Focus event handler */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Blur event handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Key down event handler */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * A form input component with validation, error handling, and accessibility features
 * 
 * @example
 * ```tsx
 * <FormInput
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   error="Please enter a valid email"
 *   required
 * />
 * 
 * <FormInput
 *   label="Password"
 *   type="password"
 *   showPasswordToggle
 *   showCharacterCount
 *   maxLength={50}
 * />
 * ```
 * 
 * @param props - FormInput component props
 * @param ref - Forwarded ref to the input element
 * @returns An input element with label, validation, and accessibility features
 */
const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  type = 'text',
  label,
  placeholder,
  value,
  defaultValue,
  required = false,
  disabled = false,
  readOnly = false,
  name,
  id,
  min,
  max,
  step,
  maxLength,
  minLength,
  pattern,
  showCharacterCount = false,
  showPasswordToggle = false,
  error,
  helperText,
  icon,
  iconRight,
  className = '',
  onChange,
  onFocus,
  onBlur,
  onKeyDown
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const currentValue = value?.toString() || '';
  const characterCount = currentValue.length;

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputClasses = [
    styles.input,
    icon && styles.hasIcon,
    iconRight && styles.hasIconRight,
    error && styles.hasError,
    isFocused && styles.focused,
    disabled && styles.disabled,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={inputId} id={labelId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={styles.inputWrapper}>
        {icon && (
          <div className={styles.icon}>
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          className={inputClasses}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={[
            error && errorId,
            helperText && helperId
          ].filter(Boolean).join(' ') || undefined}
          aria-invalid={!!error}
        />
        
        {iconRight && (
          <div className={styles.iconRight}>
            {iconRight}
          </div>
        )}
        
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </button>
        )}
      </div>
      
      {(error || helperText || (showCharacterCount && maxLength)) && (
        <div className={styles.footer}>
          {error && (
            <div id={errorId} className={styles.error} role="alert">
              {error}
            </div>
          )}
          
          {helperText && !error && (
            <div id={helperId} className={styles.helperText}>
              {helperText}
            </div>
          )}
          
          {showCharacterCount && maxLength && (
            <div className={styles.characterCount}>
              {characterCount}/{maxLength}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput; 