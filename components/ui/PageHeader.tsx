import React from 'react';
import Badge from './Badge';

interface PageHeaderProps {
  title: string;
  description?: string;
  variant?: 'default' | 'gradient';
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'info' | 'default';
  };
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  variant = 'gradient',
  badge,
  icon,
  actions,
  className = '',
}: PageHeaderProps) {
  if (variant === 'gradient') {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-50/60 via-primary-50/30 to-accent-50/20 px-5 py-4 border border-primary-100/40 ${className}`}>
        <div className="flex items-center justify-between relative z-10 gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <div className="text-white text-[16px]">{icon}</div>
              </div>
            )}
            <div>
              <h1 className="text-[18px] lg:text-[20px] font-medium text-primary-800 tracking-tight leading-tight">
                {title}
              </h1>
              {description && (
                <p className="text-[12px] lg:text-[13px] text-primary-700/70 leading-relaxed mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant={badge.variant || 'success'} size="lg" className="bg-primary-500 text-white border border-primary-400/40">
                {badge.text}
              </Badge>
            )}
            {actions}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`bg-white rounded-xl border border-neutral-200/60 px-5 py-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
              <div className="text-white text-[15px]">{icon}</div>
            </div>
          )}
          <div>
            <h1 className="text-[18px] font-medium text-primary-800 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-primary-700/70 text-[12px] leading-relaxed mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant={badge.variant || 'success'} size="lg">
              {badge.text}
            </Badge>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
