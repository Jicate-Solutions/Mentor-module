import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle' | 'institutional' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  loading?: boolean;
  role?: string;
  tabIndex?: number;
}

/**
 * Professional Card Component
 *
 * A flexible card component with professional, institutional design suitable for education sector.
 * Features: interactive states, loading skeleton, click handlers, accessibility
 *
 * @param children - Card content
 * @param variant - Professional card variants:
 *   - default: Clean white card with professional shadow
 *   - elevated: White card with stronger elevation
 *   - subtle: Very subtle gradient background
 *   - institutional: White card with green left accent border
 *   - outline: Minimal border-only style
 * @param padding - Internal padding size (none, sm, md, lg)
 * @param className - Additional custom classes
 * @param hoverable - Adds professional hover lift effect when true
 * @param onClick - Click handler for interactive cards
 * @param loading - Shows skeleton loading state
 * @param role - ARIA role
 * @param tabIndex - Tab index for keyboard navigation
 */
export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  hoverable = false,
  onClick,
  loading = false,
  role,
  tabIndex
}: CardProps) {
  // Professional card variants for institutional design
  const variants = {
    default: 'bg-white shadow-professional border border-neutral-200',
    elevated: 'bg-white shadow-elevated border border-neutral-100',
    subtle: 'bg-card-subtle border border-neutral-100',
    institutional: 'bg-white border-l-4 border-l-brand-green shadow-professional',
    outline: 'bg-white border border-neutral-300'
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const isInteractive = hoverable || onClick;
  // Professional hover effects - subtle lift and shadow increase
  const interactiveStyles = isInteractive
    ? 'hover-lift cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2'
    : 'transition-all';

  if (loading) {
    return (
      <div
        className={`rounded-xl ${variants[variant]} ${paddings[padding]} ${className} animate-pulse`}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="space-y-4">
          <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
          <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
          <div className="h-20 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`rounded-xl ${variants[variant]} ${paddings[padding]} ${interactiveStyles} ${className} ${onClick ? 'w-full text-left' : ''}`}
      onClick={onClick}
      role={role || (onClick ? 'button' : undefined)}
      tabIndex={isInteractive ? (tabIndex ?? 0) : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </Component>
  );
}

/**
 * CardHeader Component
 * Optional header section for cards
 */
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 pb-4 border-b border-neutral-200 ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardTitle Component
 * Styled title for cards
 */
interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-base font-semibold text-neutral-900 ${className}`}>
      {children}
    </h3>
  );
}

/**
 * CardContent Component
 * Content section for cards
 */
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`text-neutral-700 ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardFooter Component
 * Optional footer section for cards
 */
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-neutral-200 ${className}`}>
      {children}
    </div>
  );
}
