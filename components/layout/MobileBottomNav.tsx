'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * Mobile Bottom Navigation with FAB Button
 *
 * Features:
 * - Fixed bottom navigation bar with 4 primary nav items
 * - Floating Action Button (FAB) for secondary actions
 * - Expandable FAB menu with glassmorphism effect
 * - Active state indicator with horizontal pill design
 * - Hydration-safe rendering for SSR compatibility
 * - Responsive: hidden on desktop (lg:hidden)
 * - Role-based navigation filtering
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiredRoles?: string[];
}

const MobileBottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const userRole = user?.role || '';

  // Handle hydration - prevents SSR mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function to check if user has required role for a nav item
  const hasRequiredRole = (requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (userRole === 'super_admin' || userRole === 'administrator') return true;
    return requiredRoles.includes(userRole);
  };

  // Primary Navigation Items (max 4 for optimal UX)
  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/mentor',
      label: 'Mentors',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      href: '/counseling',
      label: 'Sessions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/mentor-activity',
      label: 'Activity',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ];

  // FAB Menu Items (secondary actions)
  const fabMenuItems: NavItem[] = [
    {
      href: '/guide',
      label: 'Mentoring Guide',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      href: '/admin/mentor-incharge',
      label: 'Mentor Incharge',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      requiredRoles: ['super_admin', 'administrator', 'institution_admin', 'mentor_incharge'],
    },
    {
      href: '/students',
      label: 'Learners',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      requiredRoles: ['super_admin', 'administrator'],
    },
    {
      href: '/staff',
      label: 'Staff',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      requiredRoles: ['super_admin', 'administrator'],
    },
  ];

  // Smart active state detection for nested routes
  const isActive = (href: string) => {
    if (!isMounted) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    // Exact match or match with trailing slash or path separator
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const handleLogout = () => {
    logout();
    setShowMenu(false);
    router.push('/');
  };

  // Don't render during SSR to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Filter menu items based on user role
  const visibleFabMenuItems = fabMenuItems.filter(item => hasRequiredRole(item.requiredRoles));

  return (
    <>
      {/* ============================================
          MAIN NAVIGATION BAR
          - Fixed at bottom with rounded corners
          - Glassmorphism effect with backdrop blur
          - Hidden on desktop (lg:hidden)
          - Brand colors: green primary
          ============================================ */}
      <nav
        className="fixed bottom-4 left-4 right-16 bg-gradient-to-r from-[#0b6d41] to-[#0e8c52] border border-green-700 shadow-lg rounded-full lg:hidden z-50"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-12 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center transition-all duration-300 ease-out active:scale-95"
              >
                {/* Active: Horizontal Pill with Icon + Label
                    Inactive: Just Icon */}
                {active ? (
                  <div className="flex flex-row items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#fbfbee] shadow-lg border border-brand-green/30 transition-all duration-300">
                    <div className="text-brand-green transition-all duration-300">
                      {item.icon}
                    </div>
                    <span className="text-xs font-medium text-brand-green whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-1.5">
                    <div className="text-white/70 hover:text-white/90 transition-all duration-300">
                      {item.icon}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ============================================
          FAB BUTTON (Floating Action Button)
          - Positioned separate from nav bar
          - Toggles between menu icons
          - Triggers FAB menu
          ============================================ */}
      <div className="fixed bottom-4 right-4 lg:hidden z-50">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-brand-yellow to-[rgba(255,222,89,0.9)] shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 border-2 border-gray-200"
          aria-label="More options"
        >
          {showMenu ? (
            <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* ============================================
          FAB MENU (Expandable Menu)
          - Backdrop with blur effect
          - Menu positioned above FAB button
          - Click outside to close
          ============================================ */}
      {showMenu && (
        <div
          className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200 lg:hidden"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute bottom-[4.5rem] right-4 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col p-2 min-w-[180px]">
              {/* User Profile Section */}
              {user && (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-green to-primary-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-800 truncate text-sm">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Menu Items */}
              {visibleFabMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-brand-cream rounded-xl transition-all duration-200 active:scale-95"
                >
                  <div className="text-brand-green">
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium text-neutral-700">{item.label}</span>
                </Link>
              ))}

              {/* Logout Button */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl transition-all duration-200 active:scale-95 border-t border-neutral-200 mt-1"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium text-red-600">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
