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
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green via-brand-green/95 to-brand-green/90 p-6 lg:p-8 shadow-xl ${className}`}>
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-yellow rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />

        <div className="flex items-start justify-between relative z-10 gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              {icon && (
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-white text-2xl">{icon}</div>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-[26px] lg:text-[30px] font-bold text-white mb-1 tracking-tight leading-tight">
                  {title}
                </h1>
                {description && (
                  <p className="text-[14px] lg:text-[15px] text-white/80 leading-relaxed font-medium max-w-2xl">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {badge && (
              <Badge variant={badge.variant || 'success'} size="lg" className="bg-white/20 backdrop-blur-sm border-white/30">
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
    <div className={`bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
                <div className="text-brand-green text-xl">{icon}</div>
              </div>
            )}
            <h1 className="text-[22px] font-semibold text-brand-green tracking-tight">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-neutral-600 text-[14px] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
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
