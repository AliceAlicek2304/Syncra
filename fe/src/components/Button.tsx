import React, { useState, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  onClick,
  disabled,
  children,
  className = '',
  ...props
}, ref) => {
  const [localLoading, setLocalLoading] = useState(false);
  const activeLoading = isLoading || localLoading;

  const handleOnClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || activeLoading) {
      e.preventDefault();
      return;
    }
    
    if (onClick) {
      const result = onClick(e);
      if (result instanceof Promise) {
        setLocalLoading(true);
        try {
          await result;
        } catch (error) {
          // Re-throw to allow component-level catch if needed
          throw error;
        } finally {
          setLocalLoading(false);
        }
      }
    }
  };

  const buttonClasses = [
    styles.btn,
    styles[variant],
    styles[size],
    activeLoading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || activeLoading}
      onClick={handleOnClick}
      aria-disabled={disabled || activeLoading}
      {...props}
    >
      {activeLoading && (
        <span className={styles.spinnerWrapper}>
          <Loader2 className={styles.spinner} size={size === 'sm' ? 16 : 20} />
        </span>
      )}
      <span className={activeLoading ? styles.contentHidden : styles.contentVisible}>
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';
