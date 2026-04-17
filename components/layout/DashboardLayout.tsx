'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar_collapsed');
      return stored === 'true';
    }
    return false;
  });
  const pathname = usePathname();

  // Persist sidebar collapsed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => !prev);
  };

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname?.startsWith('/mentor-monitor')) return 'Mentor Monitor';
    if (pathname?.startsWith('/analytics')) return 'Session Analytics';
    if (pathname?.startsWith('/mentor-activity')) return 'Mentor Activity';
    if (pathname?.startsWith('/mentor')) return 'Mentor Management';
    if (pathname?.startsWith('/staff')) return 'Staff';
    if (pathname?.startsWith('/institutions')) return 'Institutions';
    if (pathname?.startsWith('/departments')) return 'Departments';
    if (pathname?.startsWith('/programs')) return 'Programs';
    if (pathname?.startsWith('/degrees')) return 'Degrees';
    if (pathname?.startsWith('/courses')) return 'Courses';
    if (pathname?.startsWith('/students')) return 'Learners';
    if (pathname?.startsWith('/reports')) return 'Reports';
    if (pathname?.startsWith('/settings')) return 'Settings';
    return 'JKKN Mentor';
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'}`}>
        {/* Top Header Bar */}
        <header
          className={`hidden lg:block glass-header fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
            sidebarCollapsed ? 'lg:left-16' : 'lg:left-56'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2.5 lg:px-6 lg:py-3">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button - 44x44px touch target */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-neutral-700 hover:bg-neutral-100 p-2 rounded-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Desktop Sidebar Toggle Button */}
              <button
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex text-brand-green hover:bg-brand-green/10 p-2 rounded-lg transition-all duration-200 min-w-[40px] min-h-[40px] items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                aria-label="Toggle navigation menu"
                title="Toggle navigation menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {sidebarCollapsed ? (
                    // Panel expand - left panel visible
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4m0-16v16M9 4h10a2 2 0 012 2v12a2 2 0 01-2 2H9" />
                  ) : (
                    // Panel collapse - showing sidebar will collapse
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm6-2h8a2 2 0 012 2v12a2 2 0 01-2 2h-8" />
                  )}
                </svg>
              </button>
            </div>

            {/* Page Title */}
            <h1 className="text-base sm:text-lg lg:text-xl font-medium text-neutral-900 truncate px-2 flex-1">
              {getPageTitle()}
            </h1>

          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto lg:pt-16 pb-20 lg:pb-0`}>
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-neutral-50 py-3 px-4 lg:px-6 pb-20 lg:pb-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
            <p>© 2025 JKKN Institutions. All rights reserved.</p>
            <p className="flex items-center gap-2">
              Powered by
              <span className="font-medium text-brand-green">JKKN Institutions</span>
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation with FAB */}
      <MobileBottomNav />
    </div>
  );
}
