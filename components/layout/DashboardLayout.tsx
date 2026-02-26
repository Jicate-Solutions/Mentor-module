'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { TooltipIconButton } from '@/components/ui/Tooltip';
import AccessLevelBadge from '@/components/ui/AccessLevelBadge';
import { useNotifications } from '@/hooks/useNotifications';
import { useSearch, getQuickLinks } from '@/hooks/useSearch';

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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  // Real-time notifications hook
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, markAllAsRead } = useNotifications();

  // Real-time search hook
  const { results: searchResults, loading: searchLoading } = useSearch(searchQuery);
  const quickLinks = getQuickLinks();

  // Persist sidebar collapsed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  // Handle ESC key to close search modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        if (notificationOpen) setNotificationOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [searchOpen, notificationOpen]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => !prev);
  };

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
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

            {/* Right Side Actions */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Access Level Badge */}
              <div className="hidden sm:block">
                <AccessLevelBadge size="sm" />
              </div>

              {/* Notifications - 44x44px touch target */}
              <div className="hidden sm:block relative">
                <TooltipIconButton
                  tooltip="Notifications"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  ariaLabel="Notifications"
                  className="relative"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Notification Badge */}
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
                </TooltipIconButton>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationOpen(false)}
                    />
                    {/* Dropdown Panel */}
                    <div className="absolute right-0 top-full mt-2 w-80 glass-dropdown rounded-lg z-50 max-h-96 overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-neutral-100 glass-subtle flex items-center justify-between">
                        <h3 className="font-medium text-brand-green">
                          Notifications {unreadCount > 0 && `(${unreadCount})`}
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-brand-green hover:text-primary-700 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {/* Notification List */}
                      <div className="overflow-y-auto max-h-80">
                        {notificationsLoading ? (
                          <div className="p-4 text-center text-neutral-500">
                            <p className="text-sm">Loading notifications...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <svg className="w-12 h-12 text-neutral-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-sm text-neutral-500">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notification, index) => (
                            <div
                              key={notification.id}
                              className={`p-4 ${index !== notifications.length - 1 ? 'border-b border-neutral-100' : ''} hover:bg-neutral-50 cursor-pointer transition-colors`}
                              onClick={() => {
                                if (!notification.read) markAsRead(notification.id);
                                if (notification.link) {
                                  router.push(notification.link);
                                  setNotificationOpen(false);
                                }
                              }}
                            >
                              <div className="flex gap-3">
                                <div className={`w-2 h-2 ${!notification.read ? 'bg-brand-green' : 'bg-neutral-300'} rounded-full mt-1.5 flex-shrink-0`}></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-800">{notification.title}</p>
                                  <p className="text-xs text-neutral-500 mt-1">{notification.message}</p>
                                  <p className="text-xs text-neutral-400 mt-1">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
                          <button
                            onClick={() => {
                              router.push('/notifications');
                              setNotificationOpen(false);
                            }}
                            className="text-sm text-brand-green hover:text-primary-700 font-medium w-full text-center"
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Search - 44x44px touch target */}
              <div className="hidden md:block">
                <TooltipIconButton
                  tooltip="Search"
                  onClick={() => setSearchOpen(true)}
                  ariaLabel="Search"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </TooltipIconButton>
              </div>

              {/* Search Modal */}
              {searchOpen && (
                <div className="fixed inset-0 glass-overlay z-50 flex items-start justify-center pt-20 px-4"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  {/* Search Panel */}
                  <div className="glass-modal rounded-lg w-full max-w-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Input */}
                    <div className="p-4 border-b border-neutral-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search students, mentors, courses..."
                          className="flex-1 outline-none text-neutral-800 placeholder-neutral-400"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                          aria-label="Close search"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Search Results */}
                    <div className="p-4 max-h-96 overflow-y-auto">
                      {searchLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green mx-auto"></div>
                          <p className="text-sm text-neutral-500 mt-2">Searching...</p>
                        </div>
                      ) : searchQuery && searchResults.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="w-12 h-12 text-neutral-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-sm text-neutral-500">No results found for "{searchQuery}"</p>
                        </div>
                      ) : (
                        <>
                          {searchQuery && searchResults.length > 0 && (
                            <>
                              <p className="text-sm text-neutral-500 mb-4">Search Results ({searchResults.length})</p>
                              <div className="space-y-2 mb-6">
                                {searchResults.map((result) => (
                                  <button
                                    key={result.id}
                                    onClick={() => {
                                      router.push(result.link);
                                      setSearchOpen(false);
                                      setSearchQuery('');
                                    }}
                                    className="w-full text-left p-3 rounded-lg hover:bg-brand-cream transition-colors flex items-center gap-3"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {result.type === 'student' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        )}
                                        {result.type === 'mentor' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        )}
                                        {result.type === 'course' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        )}
                                        {result.type === 'session' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        )}
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-neutral-800">{result.title}</p>
                                      {result.subtitle && (
                                        <p className="text-xs text-neutral-500">{result.subtitle}</p>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                          {!searchQuery && (
                            <>
                              <p className="text-sm text-neutral-500 mb-4">Quick Links</p>
                              <div className="space-y-2">
                                {quickLinks.map((link) => (
                                  <button
                                    key={link.id}
                                    onClick={() => {
                                      router.push(link.link);
                                      setSearchOpen(false);
                                    }}
                                    className="w-full text-left p-3 rounded-lg hover:bg-brand-cream transition-colors flex items-center gap-3"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {link.type === 'student' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        )}
                                        {link.type === 'mentor' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        )}
                                        {link.type === 'session' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        )}
                                        {link.type === 'staff' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        )}
                                        {link.type === 'course' && (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        )}
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-neutral-800">{link.title}</p>
                                      <p className="text-xs text-neutral-500">{link.subtitle}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    {/* Search Footer */}
                    <div className="px-4 py-3 glass-subtle border-t border-neutral-100">
                      <p className="text-xs text-neutral-500 text-center">
                        Press <kbd className="px-2 py-0.5 bg-white border border-neutral-300 rounded text-xs">ESC</kbd> to close
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Actions Menu */}
              <div className="md:hidden">
                <TooltipIconButton
                  tooltip="More options"
                  onClick={() => {}}
                  ariaLabel="More options"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </TooltipIconButton>
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumbs */}
        {pathname !== '/dashboard' && (
          <div className="bg-white border-b border-neutral-50 px-4 py-2.5 lg:px-6 lg:pt-16">
            <Breadcrumbs autoGenerate className="text-sm" />
          </div>
        )}

        {/* Main Content */}
        <main className={`flex-1 overflow-auto ${pathname === '/dashboard' ? 'lg:pt-16' : ''} pb-20 lg:pb-0`}>
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
