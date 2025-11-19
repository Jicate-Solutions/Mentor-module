import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'primary' | 'accent';
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className = '',
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-white border-neutral-200',
    primary: 'bg-gradient-to-br from-brand-green/5 to-primary-100/30 border-brand-green/20',
    accent: 'bg-gradient-to-br from-brand-yellow/10 to-accent-100/30 border-brand-yellow/20',
  };

  const iconBgStyles = {
    default: 'bg-neutral-100 text-neutral-600',
    primary: 'bg-brand-green/10 text-brand-green',
    accent: 'bg-brand-yellow/20 text-brand-green',
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border p-5
        transition-all duration-200 hover:shadow-sm hover:border-brand-green/20
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-neutral-600 mb-2 tracking-wide uppercase">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-[28px] font-medium text-neutral-900 tracking-tight">{value}</h3>
            {trend && (
              <span
                className={`text-[12px] font-medium flex items-center gap-0.5 ${
                  trend.isPositive ? 'text-success-600' : 'text-error-600'
                }`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {trend.isPositive ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  )}
                </svg>
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[13px] text-neutral-500 mt-2 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
              ${iconBgStyles[variant]}
            `}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Decorative element */}
      <div
        className={`
          absolute -bottom-2 -right-2 w-28 h-28 rounded-full blur-3xl opacity-10
          ${variant === 'primary' ? 'bg-brand-green' : ''}
          ${variant === 'accent' ? 'bg-brand-yellow' : ''}
        `}
      />
    </div>
  );
}
