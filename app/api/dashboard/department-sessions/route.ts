import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/department-sessions
 * Fetch real-time department session statistics
 *
 * Access Control:
 * - Super Admin: Views all departments across all institutions
 * - Institution Admin: Views all departments in their institution
 * - Mentor: Views only their institution's departments
 *
 * Returns:
 * - Department name and ID from JKKN API
 * - Real-time session statistics from Supabase
 * - Completion rates
 * - Student counts
 */
export async function GET(request: NextRequest) {
  try {
    // Get user access level
    const userAccess = await getUserAccess();

    if (!userAccess) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get JKKN API credentials
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'MyJKKN API key not configured',
        },
        { status: 500 }
      );
    }

    // Fetch departments from JKKN API with large limit to get all departments
    const departmentsUrl = `${baseUrl}/api-management/organizations/departments?page=1&limit=1000`;
    const departmentsResponse = await fetch(departmentsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!departmentsResponse.ok) {
      throw new Error('Failed to fetch departments from JKKN API');
    }

    const departmentsData = await departmentsResponse.json();
    let departments = departmentsData.data || [];

    // Transform department data
    departments = departments.map((dept: any) => ({
      id: dept.id || dept.department_id,
      name: dept.name || dept.department_name || dept.departmentName || 'Unnamed Department',
      code: dept.code || dept.department_code || dept.dept_code || dept.short_name || 'N/A',
      institution_id: dept.institution_id || dept.institutionId || '',
    }));

    // Apply access control filtering
    const institutionFilter = getInstitutionFilter(userAccess);
    if (institutionFilter !== null) {
      departments = departments.filter(
        (dept: any) => dept.institution_id === institutionFilter
      );
    }

    // Get real-time session statistics from Supabase
    const supabase = createAdminClient();

    // Fetch ALL students from JKKN API with pagination (max 200 per page)
    // This ensures we get complete student counts including those not yet synced
    let students: any[] = [];
    let studentPage = 1;
    let hasMoreStudents = true;
    const studentPageLimit = 200; // JKKN API max per page
    const maxStudentPages = 75; // Safety limit (75 × 200 = 15,000)
    let jkknApiFailed = false;

    while (hasMoreStudents && studentPage <= maxStudentPages) {
      const studentsUrl = `${baseUrl}/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive&page=${studentPage}&limit=${studentPageLimit}`;

      try {
        const studentsResponse = await fetch(studentsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 60 },
        });

        if (!studentsResponse.ok) {
          console.warn(`[Department Sessions] JKKN API returned ${studentsResponse.status} on page ${studentPage}`);
          jkknApiFailed = true;
          break;
        }

        const studentsData = await studentsResponse.json();
        const pageStudents = studentsData.data || [];

        const mapped = pageStudents.map((s: any) => ({
          id: s.id,
          department_id: s.department?.id || s.department_id || s.department,
          institution_id: s.institution?.id || s.institution_id || s.institution,
        }));

        students = [...students, ...mapped];

        // Check if more pages exist
        hasMoreStudents = pageStudents.length === studentPageLimit;
        const paginationInfo = studentsData.pagination || studentsData.metadata;
        if (paginationInfo?.totalPages && studentPage >= paginationInfo.totalPages) {
          hasMoreStudents = false;
        }

        studentPage++;
      } catch (fetchError) {
        console.error(`[Department Sessions] Error fetching students page ${studentPage}:`, fetchError);
        jkknApiFailed = true;
        break;
      }
    }

    console.log(`[Department Sessions] Fetched ${students.length} students from JKKN API across ${studentPage - 1} pages`);

    // Fallback to Supabase if JKKN API failed and we got no students
    if (jkknApiFailed && students.length === 0) {
      console.warn('[Department Sessions] JKKN API failed, using Supabase data');
      const { data: supabaseStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, department_id, institution_id')
        .eq('is_active', true);

      if (studentsError) {
        console.error('Error fetching students from Supabase:', studentsError);
      }
      students = supabaseStudents || [];
    }

    // Fetch all counseling sessions with mentor info
    const { data: sessions, error: sessionsError } = await supabase
      .from('counseling_sessions')
      .select(`
        id,
        status,
        student_id,
        mentor_id,
        date,
        students!inner (
          department_id,
          institution_id
        )
      `);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    }

    // Group sessions by department
    const departmentStats: { [key: string]: any } = {};

    // Initialize stats for all departments
    departments.forEach((dept: any) => {
      departmentStats[dept.id] = {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        institution_id: dept.institution_id,
        totalSessions: 0,
        completedSessions: 0,
        scheduledSessions: 0,
        cancelledSessions: 0,
        totalStudents: 0,
        completionRate: 0,
        color: '#94a3b8', // Default neutral color
      };
    });

    // Count students per department
    students?.forEach((student: any) => {
      const deptId = student.department_id;
      if (departmentStats[deptId]) {
        departmentStats[deptId].totalStudents++;
      }
    });

    // Count sessions per department
    sessions?.forEach((session: any) => {
      const deptId = session.students?.department_id;
      if (departmentStats[deptId]) {
        departmentStats[deptId].totalSessions++;

        if (session.status === 'completed') {
          departmentStats[deptId].completedSessions++;
        } else if (session.status === 'scheduled') {
          departmentStats[deptId].scheduledSessions++;
        } else if (session.status === 'cancelled') {
          departmentStats[deptId].cancelledSessions++;
        }
      }
    });

    // Calculate completion rates and assign colors
    Object.values(departmentStats).forEach((dept: any) => {
      if (dept.totalSessions > 0) {
        dept.completionRate = Math.round((dept.completedSessions / dept.totalSessions) * 100);
        dept.color = getProgressColor(dept.completionRate);
      } else {
        dept.completionRate = 0;
        dept.color = '#94a3b8'; // Neutral gray for no sessions
      }
    });

    // Convert to array and sort by total sessions (descending)
    const departmentArray = Object.values(departmentStats).sort(
      (a: any, b: any) => b.totalSessions - a.totalSessions
    );

    // Calculate summary statistics
    const summary = {
      totalDepartments: departmentArray.length,
      totalSessions: departmentArray.reduce((sum: number, dept: any) => sum + dept.totalSessions, 0),
      completedSessions: departmentArray.reduce((sum: number, dept: any) => sum + dept.completedSessions, 0),
      scheduledSessions: departmentArray.reduce((sum: number, dept: any) => sum + dept.scheduledSessions, 0),
      totalStudents: departmentArray.reduce((sum: number, dept: any) => sum + dept.totalStudents, 0),
      averageCompletionRate: departmentArray.length > 0
        ? Math.round(
            departmentArray.reduce((sum: number, dept: any) => sum + dept.completionRate, 0) / departmentArray.length
          )
        : 0,
    };

    return NextResponse.json({
      success: true,
      departments: departmentArray,
      summary,
      accessLevel: userAccess.role,
      scope: institutionFilter !== null ? 'institution' : 'all_institutions',
    });

  } catch (error: any) {
    console.error('Error fetching department sessions:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch department sessions',
      },
      { status: 500 }
    );
  }
}

/**
 * Get color based on completion percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return '#0b6d41'; // brand-green
  if (percentage >= 60) return '#10b981'; // green-500
  if (percentage >= 40) return '#f59e0b'; // amber-500
  if (percentage >= 20) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}
