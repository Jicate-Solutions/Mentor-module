'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Image, Mail, Plus, Info, X } from 'lucide-react';
// Import additional icons as needed from lucide-react

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
 *
 * Customization:
 * 1. Edit navItems array for primary navigation (max 4 items)
 * 2. Edit fabMenuItems array for FAB menu options
 * 3. Adjust colors in className props to match your brand
 */

// ============================================
// CUSTOMIZE: Primary Navigation Items (max 4)
// ============================================
const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/directory', icon: Users, label: 'Directory' },
  { href: '/gallery', icon: Image, label: 'Gallery' },
  { href: '/contact', icon: Mail, label: 'Contact' },
];

// ============================================
// CUSTOMIZE: FAB Menu Items (secondary actions)
// ============================================
const fabMenuItems = [
  { href: '/about', icon: Info, label: 'About' },
  // Add more items as needed:
  // { href: '/settings', icon: Settings, label: 'Settings' },
  // { href: '/help', icon: HelpCircle, label: 'Help' },
];

const MobileBottomNav = () => {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration - prevents SSR mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Smart active state detection for nested routes
  const isActive = (href: string) => {
    if (!isMounted) return false;
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Don't render during SSR to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* ============================================
          MAIN NAVIGATION BAR
          - Fixed at bottom with rounded corners
          - Glassmorphism effect with backdrop blur
          - Hidden on desktop (lg:hidden)
          ============================================ */}
      <nav
        className="fixed bottom-4 left-4 right-16 bg-gradient-to-r from-[rgba(78,46,140,0.85)] to-[rgba(108,66,160,0.75)] backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-full lg:hidden z-50"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-10 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
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
                  <div className="flex flex-row items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-[rgba(50,30,90,0.8)] backdrop-blur-md shadow-lg border border-white/20 transition-all duration-300">
                    <Icon size={16} strokeWidth={2.5} className="text-white transition-all duration-300" />
                    <span className="text-xs font-semibold text-white whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-1">
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className="text-white/70 hover:text-white/90 transition-all duration-300"
                    />
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
          - Toggles between Plus and X icons
          - Triggers FAB menu
          ============================================ */}
      <div className="fixed bottom-4 right-4 lg:hidden z-50">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(217,81,100,1)] to-[rgba(217,81,100,0.8)] shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 border-2 border-white/20"
          aria-label="More options"
        >
          {showMenu ? (
            <X size={14} strokeWidth={2.5} className="text-white" />
          ) : (
            <Plus size={14} strokeWidth={2.5} className="text-white" />
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute bottom-[4.5rem] right-4 bg-[rgba(78,46,140,0.98)] backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col p-2 min-w-[160px]">
              {fabMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95"
                  >
                    <Icon size={16} className="text-white/90" />
                    <span className="text-sm font-medium text-white">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
