/**
 * useSearch Hook
 * Real-time search functionality across the platform
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export interface SearchResult {
  id: string;
  type: 'student' | 'mentor' | 'staff' | 'course' | 'session';
  title: string;
  subtitle?: string;
  link: string;
  icon: string;
}

export function useSearch(searchTerm: string = '') {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (term: string) => {
      if (!term || term.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(
          '/api/search?q=' + encodeURIComponent(term),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
            },
          }
        );

        const json = await res.json();
        const data: SearchResult[] = json.data || [];
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, []);

  // Trigger search when searchTerm changes (with debounce)
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchTerm) {
      setLoading(true);
      // Set new timer for debounced search
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchTerm);
      }, 300);
    } else {
      setResults([]);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  return {
    results,
    loading,
  };
}

// Quick links that are always available
export const getQuickLinks = (): SearchResult[] => {
  return [
    {
      id: 'students',
      type: 'student',
      title: 'All Students',
      subtitle: 'View student directory',
      link: '/students',
      icon: 'student',
    },
    {
      id: 'mentors',
      type: 'mentor',
      title: 'Mentors Directory',
      subtitle: 'View all mentors',
      link: '/mentor',
      icon: 'mentor',
    },
    {
      id: 'counseling',
      type: 'session',
      title: 'Counseling Sessions',
      subtitle: 'Manage sessions',
      link: '/counseling',
      icon: 'session',
    },
    {
      id: 'staff',
      type: 'staff',
      title: 'Staff Management',
      subtitle: 'View all staff members',
      link: '/staff',
      icon: 'staff',
    },
    {
      id: 'courses',
      type: 'course',
      title: 'Courses',
      subtitle: 'View all courses',
      link: '/courses',
      icon: 'course',
    },
  ];
};
