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
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100/40 via-primary-50/30 to-accent-50/40 p-6 lg:p-8 shadow-xl border border-primary-100/50 ${className}`}>
        {/* Floating Orbs Background */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-300 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-accent-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-16 right-1/3 w-64 h-64 bg-primary-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

        {/* Top Wave Decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-300 to-transparent opacity-50" />

        <div className="flex items-start justify-between relative z-10 gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              {icon && (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-lg border border-primary-400/30">
                  <div className="text-white text-xl">{icon}</div>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-[24px] lg:text-[28px] font-extrabold text-primary-800 mb-1 tracking-tight leading-tight">
                  {title}
                </h1>
                {description && (
                  <p className="text-[14px] lg:text-[15px] text-primary-700/80 leading-relaxed font-medium max-w-2xl">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {badge && (
              <Badge variant={badge.variant || 'success'} size="lg" className="bg-primary-500 text-white border border-primary-400/40">
                {badge.text}
              </Badge>
            )}
            {actions}
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-40" />
      </div>
    );
  }

  // Default variant - Light Glass Effect
  return (
    <div className={`relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl border border-primary-100/50 p-6 shadow-lg ${className}`}>
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md border border-primary-400/30">
                <div className="text-white text-xl">{icon}</div>
              </div>
            )}
            <h1 className="text-[22px] font-extrabold text-primary-800 tracking-tight">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-primary-700/80 text-[14px] leading-relaxed font-medium">
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
