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
    <div className={`min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5 ${className}`}>
      {children}
      {/* Bottom Spacer for Mobile Nav */}
      <div className="h-4 lg:hidden" />
    </div>
  );
}
