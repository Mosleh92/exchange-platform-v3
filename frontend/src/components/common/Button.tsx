import React from 'react';
import styles from './Button.module.css';

/**
 * Button component props interface
 */
interface ButtonProps {
  /** The content to display inside the button */
  children: React.ReactNode;
  /** The type of button (default: 'button') */
  type?: 'button' | 'submit' | 'reset';
  /** The variant style of the button */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** The size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Icon to display before the text */
  icon?: React.ReactNode;
  /** Icon to display after the text */
  iconRight?: React.ReactNode;
}

/**
 * A versatile button component with multiple variants and states
 * 
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * 
 * <Button variant="danger" loading>
 *   Delete
 * </Button>
 * ```
 * 
 * @param props - Button component props
 * @returns A button element with appropriate styling and behavior
 */
const Button: React.FC<ButtonProps> = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  onClick,
  icon,
  iconRight
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <div className={styles.spinner}>
          <div className={styles.spinnerInner}></div>
        </div>
      )}
      
      {!loading && icon && (
        <span className={styles.icon}>
          {icon}
        </span>
      )}
      
      <span className={styles.content}>
        {children}
      </span>
      
      {!loading && iconRight && (
        <span className={styles.iconRight}>
          {iconRight}
        </span>
      )}
    </button>
  );
};

export default Button; 