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
    // Default state if nothing in localStorage - all collapsed except those shown in image
    return {
      'dashboard': true,
      'people management': false,
      'mentoring activities': false,
      'notifications & alerts': false,
      'academic data': false,
      'handbook': false,
      'help & support': true
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

  // Grouped navigation structure matching the design
  const navSections: NavSection[] = [
    {
      label: 'Dashboard',
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
      label: 'People Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      items: [
        {
          label: 'Mentors Directory',
          href: '/mentor',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          label: 'Assignments',
          href: '/assignments',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
          comingSoon: true,
        },
      ]
    },
    {
      label: 'Mentoring Activities',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      items: [
        {
          label: 'Counseling Sessions',
          href: '/counseling',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: 'Goals & Action Plans',
          href: '/goals',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          ),
          comingSoon: true,
        },
        {
          label: 'Q&A Exchange',
          href: '/qna',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
          comingSoon: true,
        },
      ]
    },
    {
      label: 'Notifications & Alerts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      items: [
        {
          label: 'Alert Center',
          href: '/alerts',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ),
          comingSoon: true,
        },
      ]
    },
    {
      label: 'Academic Data',
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
      label: 'Handbook',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      items: [
        {
          label: 'Mentoring Guide',
          href: '/guide',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: 'FAQ',
          href: '/faq',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          comingSoon: true,
        },
      ]
    },
    {
      label: 'Help & Support',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      items: [
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
          bg-white border-r border-neutral-200
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:fixed
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col overflow-hidden
        `}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className={`border-b border-neutral-200 ${isCollapsed ? 'lg:p-3' : 'p-5'} transition-all duration-300`}>
          <div className={`flex items-start ${isCollapsed ? 'lg:justify-center' : 'justify-between'} gap-3`}>
            {/* Logo and Title */}
            <div className={`flex items-start gap-3 ${isCollapsed ? 'lg:hidden' : ''}`}>
              {/* Logo Icon */}
              <div className="w-10 h-10 rounded-lg bg-brand-green flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>

              {/* Title and Subtitle */}
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-neutral-800 mb-0.5">
                  Mentor & Mentee
                </h1>
                <p className="text-xs text-neutral-500 mb-2">
                  Mentoring Platform
                </p>
                {/* Role Badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                  Mentee
                </span>
              </div>
            </div>

            {/* Collapsed Logo */}
            {isCollapsed && (
              <div className="hidden lg:flex w-10 h-10 rounded-lg bg-brand-green items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 p-1.5 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 pt-4" aria-label="Primary navigation">
          <div className="space-y-2">
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
                        font-medium transition-all text-sm
                        ${isCollapsed ? 'lg:justify-center lg:px-3 lg:py-3' : 'px-3 py-2.5'}
                        ${active
                          ? 'bg-brand-green text-white shadow-sm'
                          : 'text-neutral-600 hover:bg-neutral-50'
                        }
                        ${item.comingSoon ? 'opacity-60' : ''}
                        focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-1
                      `}
                      aria-current={active ? 'page' : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={active ? 'text-white' : 'text-neutral-400'}>
                        {item.icon}
                      </span>
                      <span className={`flex-1 text-left ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {item.comingSoon && !isCollapsed && (
                        <span className="text-xs bg-neutral-200/70 text-neutral-600 px-2 py-0.5 rounded-full lg:block">
                          Soon
                        </span>
                      )}
                      {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
                        <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full lg:block shadow-sm">
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
                  {/* Add subtle divider before certain sections */}
                  {(sectionId === 'academic data' || sectionId === 'handbook') && !isCollapsed && (
                    <div className="h-px bg-neutral-200/60 my-3" />
                  )}
                  {/* Section Header */}
                  {!isCollapsed && (
                    <button
                      onClick={() => toggleSection(sectionId)}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium
                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20 rounded-lg
                        ${isExpanded
                          ? 'text-neutral-700 bg-neutral-50/80'
                          : 'text-neutral-600 hover:bg-neutral-50/50 hover:text-neutral-800'
                        }
                      `}
                      aria-expanded={isExpanded}
                      aria-controls={`section-${sectionId}`}
                    >
                      <span className={`transition-colors duration-200 ${isExpanded ? 'text-brand-green' : 'text-neutral-400'}`}>
                        {section.icon}
                      </span>
                      <span className="flex-1 text-left">{section.label}</span>
                      <svg
                        className={`w-4 h-4 transition-all duration-300 ease-out ${
                          isExpanded
                            ? 'rotate-180 text-brand-green'
                            : 'rotate-0 text-neutral-400'
                        }`}
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
                    className={`
                      overflow-hidden transition-all duration-300 ease-in-out
                      ${isCollapsed ? 'lg:block' : (isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')}
                    `}
                  >
                    <div className="space-y-0.5 pt-1">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <button
                          key={item.href}
                          onClick={() => handleNavigation(item.href, item.comingSoon)}
                          className={`
                            w-full flex items-center gap-3 rounded-lg
                            font-normal text-sm transition-all
                            ${isCollapsed ? 'lg:justify-center lg:px-3 lg:py-2.5' : 'px-3 py-2 pl-11'}
                            ${active
                              ? 'bg-brand-green text-white shadow-sm'
                              : 'text-neutral-600 hover:bg-neutral-50'
                            }
                            ${item.comingSoon ? 'opacity-60' : ''}
                            focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-1
                          `}
                          aria-current={active ? 'page' : undefined}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <span className={`${isCollapsed ? '' : 'hidden'} ${active ? 'text-white' : 'text-neutral-400'}`}>
                            {item.icon}
                          </span>
                          <span className={`flex-1 text-left ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                          {item.comingSoon && !isCollapsed && (
                            <span className="text-xs bg-neutral-200/70 text-neutral-600 px-2 py-0.5 rounded-full lg:block">
                              Soon
                            </span>
                          )}
                          {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
                            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full lg:block shadow-sm">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer - User Profile */}
        {user && (
          <div className={`border-t border-neutral-200 ${isCollapsed ? 'lg:p-3' : 'p-3'} transition-all duration-300`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'lg:justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-green to-primary-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className={`flex-1 min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="font-medium text-neutral-800 truncate text-xs">
                  {user.full_name}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className={`text-neutral-400 hover:text-neutral-600 transition-colors ${isCollapsed ? 'lg:hidden' : ''}`}
                title="Logout"
                aria-label="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
