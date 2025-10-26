'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  comingSoon?: boolean;
}

interface NavSection {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Track which sections are expanded - with localStorage persistence
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar_expanded_sections');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse sidebar state from localStorage', e);
        }
      }
    }
    // Default state if nothing in localStorage
    return {
      'people': true,
      'academic': false,
      'management': true
    };
  });

  // Save expanded sections to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_expanded_sections', JSON.stringify(expandedSections));
    }
  }, [expandedSections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Grouped navigation structure
  const navSections: NavSection[] = [
    {
      label: 'Main',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        }
      ]
    },
    {
      label: 'People',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      items: [
        {
          label: 'Mentors',
          href: '/mentor',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          label: 'Students',
          href: '/students',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: 'Staff',
          href: '/staff',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
        },
      ]
    },
    {
      label: 'Academic',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      items: [
        {
          label: 'Institutions',
          href: '/institutions',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          label: 'Departments',
          href: '/departments',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
        {
          label: 'Programs',
          href: '/programs',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: 'Degrees',
          href: '/degrees',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          ),
        },
        {
          label: 'Courses',
          href: '/courses',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
      ]
    },
    {
      label: 'Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      items: [
        {
          label: 'Reports',
          href: '/reports',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          comingSoon: true,
        },
        {
          label: 'Settings',
          href: '/settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ]
    }
  ];

  const handleNavigation = (href: string, comingSoon?: boolean) => {
    if (comingSoon) {
      alert('This feature is coming soon!');
      return;
    }
    router.push(href);
    onClose(); // Close sidebar on mobile after navigation
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full
          ${isCollapsed ? 'lg:w-20' : 'w-80'}
          bg-white border-r border-neutral-100
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:fixed
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col overflow-hidden
        `}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className={`border-b border-neutral-100 ${isCollapsed ? 'lg:p-3' : 'p-4'} transition-all duration-300`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between'} mb-3`}>
            <h1 className={`text-xl font-semibold text-brand-green flex items-center gap-2 ${isCollapsed ? 'lg:gap-0' : ''}`}>
              <span>🎓</span>
              <span className={isCollapsed ? 'lg:hidden' : ''}>JKKN Mentor</span>
            </h1>
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden text-brand-green hover:bg-brand-yellow p-2 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Profile */}
          {user && (
            <div className={`flex items-center gap-3 p-3 bg-neutral-50 rounded-lg ${isCollapsed ? 'lg:justify-center lg:p-2' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center text-lg font-medium flex-shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className={`flex-1 min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="font-medium text-brand-green truncate">
                  {user.full_name}
                </p>
                <p className="text-sm text-neutral-600 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4" aria-label="Primary navigation">
          <div className="space-y-6">
            {navSections.map((section, sectionIndex) => {
              const sectionId = section.label.toLowerCase();
              const isExpanded = expandedSections[sectionId] ?? true;
              const hasOnlyOneItem = section.items.length === 1;

              // For sections with only one item, don't show section header
              if (hasOnlyOneItem) {
                const item = section.items[0];
                const active = isActive(item.href);
                return (
                  <div key={sectionIndex}>
                    <button
                      onClick={() => handleNavigation(item.href, item.comingSoon)}
                      className={`
                        w-full flex items-center gap-3 rounded-lg
                        font-medium transition-all
                        ${isCollapsed ? 'lg:justify-center lg:px-2 lg:py-3' : 'px-4 py-3'}
                        ${active
                          ? 'bg-brand-yellow text-brand-green shadow-md'
                          : 'text-neutral-700 hover:bg-brand-yellow hover:bg-opacity-50'
                        }
                        ${item.comingSoon ? 'opacity-60' : ''}
                        focus:outline-none focus:ring-2 focus:ring-brand-green
                      `}
                      aria-current={active ? 'page' : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={active ? 'text-brand-green' : 'text-neutral-600'}>
                        {item.icon}
                      </span>
                      <span className={`flex-1 text-left ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {item.comingSoon && !isCollapsed && (
                        <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full lg:block">
                          Soon
                        </span>
                      )}
                      {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
                        <span className="bg-brand-green text-brand-cream text-xs font-bold px-2 py-1 rounded-full lg:block">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </div>
                );
              }

              // For sections with multiple items, show collapsible section
              return (
                <div key={sectionIndex} className="space-y-1">
                  {/* Section Header */}
                  {!isCollapsed && (
                    <button
                      onClick={() => toggleSection(sectionId)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider hover:text-brand-green transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green rounded lg:block"
                      aria-expanded={isExpanded}
                      aria-controls={`section-${sectionId}`}
                    >
                      <span className="flex-1 text-left">{section.label}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  {/* Section Items */}
                  <div
                    id={`section-${sectionId}`}
                    className={`space-y-1 ${isCollapsed ? 'lg:block' : (isExpanded ? 'block animate-slideDown' : 'hidden')}`}
                  >
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <button
                          key={item.href}
                          onClick={() => handleNavigation(item.href, item.comingSoon)}
                          className={`
                            w-full flex items-center gap-3 rounded-lg
                            font-medium text-sm transition-all
                            ${isCollapsed ? 'lg:justify-center lg:px-2 lg:py-2.5' : 'px-4 py-2.5'}
                            ${active
                              ? 'bg-brand-yellow text-brand-green shadow-sm'
                              : 'text-neutral-700 hover:bg-brand-cream'
                            }
                            ${item.comingSoon ? 'opacity-60' : ''}
                            focus:outline-none focus:ring-2 focus:ring-brand-green
                          `}
                          aria-current={active ? 'page' : undefined}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <span className={active ? 'text-brand-green' : 'text-neutral-500'}>
                            {item.icon}
                          </span>
                          <span className={`flex-1 text-left ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                          {item.comingSoon && !isCollapsed && (
                            <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full lg:block">
                              Soon
                            </span>
                          )}
                          {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
                            <span className="bg-brand-green text-brand-cream text-xs font-bold px-2 py-1 rounded-full lg:block">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer - Logout */}
        <div className={`border-t border-neutral-100 ${isCollapsed ? 'lg:p-2' : 'p-4'} transition-all duration-300`}>
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center justify-center rounded-lg
              bg-brand-green text-white font-medium
              hover:bg-primary-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2
              ${isCollapsed ? 'lg:gap-0 lg:px-2 lg:py-3' : 'gap-3 px-4 py-3'}
            `}
            title={isCollapsed ? "Logout" : undefined}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={isCollapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
