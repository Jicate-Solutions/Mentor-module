import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Professional Badge Component
 *
 * A badge/tag component for status indicators and labels.
 * Uses subtle, professional colors suitable for institutional design.
 *
 * @param children - Badge content
 * @param variant - Color variant (default, success, warning, error, info)
 * @param size - Size variant (sm, md, lg)
 * @param className - Additional custom classes
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}: BadgeProps) {
  // Professional badge variants with subtle colors
  const variants = {
    default: 'bg-neutral-100 text-neutral-700',
    success: 'bg-neutral-50 text-black',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </span>
  );
}
