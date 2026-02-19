import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Professional Button Component
 *
 * A versatile button component with professional, institutional design.
 * Features: loading states, icons, full-width option, multiple variants
 *
 * @param variant - Professional button variants:
 *   - primary: Institutional green background (main actions)
 *   - secondary: White with green border (secondary actions)
 *   - outline: Neutral outlined style (tertiary actions)
 *   - ghost: Minimal text-only style (subtle actions)
 *   - danger: Red style for destructive actions
 * @param size - Button size (sm, md, lg)
 * @param children - Button content
 * @param onClick - Click handler function
 * @param disabled - Disabled state
 * @param loading - Loading state with spinner
 * @param type - HTML button type
 * @param fullWidth - Full width button
 * @param iconLeft - Icon to display on the left
 * @param iconRight - Icon to display on the right
 * @param className - Additional custom classes
 * @param ariaLabel - Accessibility label
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = false,
  iconLeft,
  iconRight,
  className = '',
  ariaLabel
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-colors-smooth
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    ${fullWidth ? 'w-full' : ''}
  `.trim().replace(/\s+/g, ' ');

  // Professional button variants for institutional design
  const variants = {
    primary: 'bg-brand-green text-white hover:bg-neutral-700 focus:ring-brand-green active:bg-neutral-800 shadow-professional hover:shadow-elevated',
    secondary: 'bg-white border-2 border-brand-green text-brand-green hover:bg-neutral-50 focus:ring-brand-green active:bg-neutral-100 shadow-professional',
    outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-400 active:bg-neutral-100 bg-transparent',
    ghost: 'text-brand-green hover:bg-neutral-50 focus:ring-brand-green active:bg-neutral-100 bg-transparent',
    danger: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500 active:bg-error-700 shadow-professional hover:shadow-elevated'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-h-[32px]',
    md: 'px-4 py-2 text-sm min-h-[36px]',
    lg: 'px-6 py-3 text-base min-h-[44px]'
  };

  const LoadingSpinner = () => (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <LoadingSpinner />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {iconLeft && <span className="flex-shrink-0" aria-hidden="true">{iconLeft}</span>}
          <span>{children}</span>
          {iconRight && <span className="flex-shrink-0" aria-hidden="true">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
