/**
 * useSearch Hook
 * Real-time search functionality across the platform
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
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
        const searchResults: SearchResult[] = [];
        const searchPattern = `%${term}%`;

        // Search students
        const { data: students } = await supabase
          .from('students')
          .select('id, name, register_number, department_id')
          .or(`name.ilike.${searchPattern},register_number.ilike.${searchPattern}`)
          .limit(5);

        if (students) {
          students.forEach(student => {
            searchResults.push({
              id: student.id,
              type: 'student',
              title: student.name,
              subtitle: `Register: ${student.register_number}`,
              link: `/students/${student.id}`,
              icon: 'student',
            });
          });
        }

        // Search staff/mentors
        const { data: staff } = await supabase
          .from('staff')
          .select('id, name, email, role')
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`)
          .limit(5);

        if (staff) {
          staff.forEach(member => {
            searchResults.push({
              id: member.id,
              type: member.role === 'mentor' ? 'mentor' : 'staff',
              title: member.name,
              subtitle: member.email,
              link: `/staff/${member.id}`,
              icon: 'staff',
            });
          });
        }

        // Search courses
        const { data: courses } = await supabase
          .from('courses')
          .select('id, course_name, course_code')
          .or(`course_name.ilike.${searchPattern},course_code.ilike.${searchPattern}`)
          .limit(5);

        if (courses) {
          courses.forEach(course => {
            searchResults.push({
              id: course.id,
              type: 'course',
              title: course.course_name,
              subtitle: course.course_code,
              link: `/courses/${course.id}`,
              icon: 'course',
            });
          });
        }

        // Search counseling sessions (if user has access)
        const { data: sessions } = await supabase
          .from('counseling_sessions')
          .select('id, session_type, session_date, student_id, students(name)')
          .or(`session_type.ilike.${searchPattern}`)
          .limit(5);

        if (sessions) {
          sessions.forEach((session: any) => {
            const studentName = session.students?.name || 'Unknown';
            searchResults.push({
              id: session.id,
              type: 'session',
              title: `${session.session_type} Session`,
              subtitle: `${studentName} - ${new Date(session.session_date).toLocaleDateString()}`,
              link: `/counseling/${session.id}`,
              icon: 'session',
            });
          });
        }

        setResults(searchResults);
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
