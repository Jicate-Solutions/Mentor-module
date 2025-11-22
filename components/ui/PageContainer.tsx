import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Page Container - Provides consistent page layout with gradient background
 */
export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-neutral-50 via-brand-cream/20 to-neutral-50 p-4 lg:p-8 space-y-6 ${className}`}>
      {children}
      {/* Bottom Spacer for Mobile Nav */}
      <div className="h-4 lg:hidden" />
    </div>
  );
}
