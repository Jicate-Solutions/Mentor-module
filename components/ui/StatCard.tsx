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
    default: 'bg-white shadow-sm hover:shadow-lg',
    primary: 'bg-gradient-to-br from-brand-green/5 to-brand-green/10 shadow-sm hover:shadow-lg',
    accent: 'bg-gradient-to-br from-brand-yellow/10 to-brand-yellow/15 shadow-sm hover:shadow-lg',
  };

  const iconBgStyles = {
    default: 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200',
    primary: 'bg-brand-green/10 text-brand-green group-hover:bg-brand-green/20',
    accent: 'bg-brand-yellow/20 text-brand-green group-hover:bg-brand-yellow/30',
  };

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl p-6
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-brand-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-[12px] font-medium text-neutral-600 mb-3 tracking-wider uppercase">{title}</p>
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-[32px] font-medium text-neutral-900 tracking-tight transition-all duration-300 group-hover:scale-105">{value}</h3>
            {trend && (
              <span
                className={`text-[12px] font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                  trend.isPositive ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
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
            <p className="text-[13px] text-neutral-500 leading-relaxed font-medium">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div
            className={`
              w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
              transition-all duration-300 group-hover:scale-110 group-hover:rotate-6
              ${iconBgStyles[variant]}
            `}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Enhanced Decorative elements */}
      <div
        className={`
          absolute -bottom-3 -right-3 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500
          ${variant === 'primary' ? 'bg-brand-green' : ''}
          ${variant === 'accent' ? 'bg-brand-yellow' : ''}
          ${variant === 'default' ? 'bg-neutral-400' : ''}
        `}
      />
      <div
        className={`
          absolute -top-3 -left-3 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500
          ${variant === 'primary' ? 'bg-brand-green' : ''}
          ${variant === 'accent' ? 'bg-brand-yellow' : ''}
        `}
      />
    </div>
  );
}
