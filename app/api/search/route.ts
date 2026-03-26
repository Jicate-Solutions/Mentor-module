import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/search?q=term&types=students,staff,courses,sessions
 *
 * Searches across students, staff, courses and counseling_sessions tables.
 * Requires at least 2 characters in the query string.
 * Limits each category to 5 results to match the behaviour of the previous
 * client-side useSearch hook.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return err('Unauthorized', 401);
  }

  const q = req.nextUrl.searchParams.get('q') || '';
  const typesParam = req.nextUrl.searchParams.get('types');
  const types = typesParam
    ? typesParam.split(',').map(t => t.trim())
    : ['students', 'staff', 'courses', 'sessions'];

  if (q.length < 2) {
    return ok([]);
  }

  const supabase = createAdminClient();
  const searchPattern = `%${q}%`;

  interface SearchResult {
    id: string;
    type: 'student' | 'mentor' | 'staff' | 'course' | 'session';
    title: string;
    subtitle?: string;
    link: string;
    icon: string;
  }

  const results: SearchResult[] = [];

  try {
    // ── Students ──────────────────────────────────────────────────────────────
    if (types.includes('students')) {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, roll_number, department_id')
        .or(`name.ilike.${searchPattern},roll_number.ilike.${searchPattern}`)
        .limit(5);

      if (studentsError) {
        console.error('[Search API] students query error:', studentsError.message);
      } else if (students) {
        for (const student of students) {
          results.push({
            id: student.id,
            type: 'student',
            title: student.name,
            subtitle: `Roll No: ${student.roll_number}`,
            link: `/students/${student.id}`,
            icon: 'student',
          });
        }
      }
    }

    // ── Staff / Mentors ────────────────────────────────────────────────────────
    if (types.includes('staff')) {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email, role')
        .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`)
        .limit(5);

      if (staffError) {
        console.error('[Search API] staff query error:', staffError.message);
      } else if (staff) {
        for (const member of staff) {
          results.push({
            id: member.id,
            type: member.role === 'mentor' ? 'mentor' : 'staff',
            title: member.name,
            subtitle: member.email,
            link: `/staff/${member.id}`,
            icon: 'staff',
          });
        }
      }
    }

    // ── Courses ────────────────────────────────────────────────────────────────
    if (types.includes('courses')) {
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, course_name, course_code')
        .or(`course_name.ilike.${searchPattern},course_code.ilike.${searchPattern}`)
        .limit(5);

      if (coursesError) {
        console.error('[Search API] courses query error:', coursesError.message);
      } else if (courses) {
        for (const course of courses) {
          results.push({
            id: course.id,
            type: 'course',
            title: course.course_name,
            subtitle: course.course_code,
            link: `/courses/${course.id}`,
            icon: 'course',
          });
        }
      }
    }

    // ── Counseling Sessions ────────────────────────────────────────────────────
    if (types.includes('sessions')) {
      const { data: sessions, error: sessionsError } = await supabase
        .from('counseling_sessions')
        .select('id, session_type, session_date, student_id, students(name)')
        .or(`session_type.ilike.${searchPattern}`)
        .limit(5);

      if (sessionsError) {
        console.error('[Search API] sessions query error:', sessionsError.message);
      } else if (sessions) {
        for (const session of sessions as any[]) {
          const studentName = session.students?.name || 'Unknown';
          results.push({
            id: session.id,
            type: 'session',
            title: `${session.session_type} Session`,
            subtitle: `${studentName} - ${new Date(session.session_date).toLocaleDateString()}`,
            link: `/counseling/${session.id}`,
            icon: 'session',
          });
        }
      }
    }

    return ok(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    console.error('[Search API] Unexpected error:', message);
    return err(message, 500);
  }
}
