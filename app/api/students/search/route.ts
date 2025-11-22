import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';

/**
 * GET /api/students/search?q=query
 * Search for students from JKKN API
 *
 * Institution-based filtering:
 * - Admin: Can see ALL students from ALL institutions
 * - Mentor: Can only see students from their institution
 */
export async function GET(request: NextRequest) {
  try {
    // Get user access level and institution (uses cookie-based auth)
    const userAccess = await getUserAccess();

    if (!userAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - Unable to determine user access' },
        { status: 401 }
      );
    }

    const isAdmin = userAccess.role === 'super_admin' ||
                    userAccess.role === 'institution_admin' ||
                    userAccess.isSuperAdmin;
    const userInstitutionId = userAccess.institutionId;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        students: [],
      });
    }

    // Get API key from environment (server-side only)
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'MyJKKN API key not configured',
          details: 'Please add NEXT_PUBLIC_MYJKKN_API_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    console.log('[Student Search] Searching for students with query:', query);
    console.log('[Student Search] isAdmin:', isAdmin, 'userInstitutionId:', userInstitutionId);

    // Fetch ALL students directly from JKKN API (bypassing internal API to avoid auth context issues)
    console.log('[Student Search] Fetching ALL students from JKKN API');

    let allStudents: any[] = [];
    let currentPage = 1;
    const maxLimit = 1000; // JKKN API max per page
    let hasMore = true;
    const maxPages = 15; // Safety limit (15 pages × 1000 = 15,000 max students)

    while (hasMore && currentPage <= maxPages) {
      const url = `${baseUrl}/api-management/students?page=${currentPage}&limit=${maxLimit}`;

      console.log(`[Student Search] Fetching page ${currentPage}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error('[Student Search] JKKN API Error:', response.status, response.statusText);
        return NextResponse.json(
          {
            error: 'Failed to fetch students from JKKN API',
            details: `${response.status} ${response.statusText}`
          },
          { status: response.status }
        );
      }

      const pageData = await response.json();
      const pageStudents = pageData.data || [];

      console.log(`[Student Search] Page ${currentPage}: received ${pageStudents.length} students`);

      allStudents = [...allStudents, ...pageStudents];

      // Check if there are more pages
      hasMore = pageStudents.length === maxLimit;

      // Also check metadata if available
      if (pageData.metadata) {
        const totalPages = pageData.metadata.totalPages || pageData.metadata.total_pages;
        if (totalPages && currentPage >= totalPages) {
          hasMore = false;
        }
      }

      currentPage++;
    }

    const students = allStudents;

    console.log('[Student Search] Fetched', students.length, 'total students from JKKN API (across', currentPage - 1, 'pages)');
    console.log('[Student Search] User access:', { role: userAccess.role, institution_id: userInstitutionId, isAdmin });

    // Enhanced debug logging - Log first student's complete structure
    if (students.length > 0) {
      console.log('[Student Search] First student raw data structure:');
      const firstStudent = students[0];
      console.log('  Available fields:', Object.keys(firstStudent));
      console.log('  Sample data:', {
        id: firstStudent.id,
        first_name: firstStudent.first_name,
        firstName: firstStudent.firstName,
        last_name: firstStudent.last_name,
        lastName: firstStudent.lastName,
        roll_number: firstStudent.roll_number,
        rollNumber: firstStudent.rollNumber,
        email: firstStudent.email,
        institution: firstStudent.institution,
        institution_id: firstStudent.institution_id,
        department: firstStudent.department,
        department_name: firstStudent.department_name,
      });

      console.log('[Student Search] Sample student data (first 3):');
      students.slice(0, 3).forEach((s: any, i: number) => {
        console.log(`  Student ${i + 1}:`, {
          name: `${s.first_name} ${s.last_name}`,
          institution: s.institution,
          department: s.department,
        });
      });
    }

    // Normalize search query - remove extra spaces and make lowercase
    const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase();
    console.log('[Student Search] Normalized query:', normalizedQuery);

    // Filter students based on search query AND institution
    let filterDebugCount = 0;
    const filteredStudents = students.filter((student: any, index: number) => {
      // Construct full name from first_name and last_name with multiple fallbacks
      const firstName = student.first_name || student.firstName || '';
      const lastName = student.last_name || student.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim().replace(/\s+/g, ' ').toLowerCase();

      // Also check if there's a single 'name' field as fallback
      const singleName = (student.name || '').toLowerCase();

      // Log empty names for debugging
      if (!fullName && !singleName && index < 5) {
        console.warn(`[Student Search] Empty name for student ${index}:`, {
          id: student.id,
          first_name: student.first_name,
          firstName: student.firstName,
          last_name: student.last_name,
          lastName: student.lastName,
          name: student.name,
          raw: student
        });
      }

      // Get roll number with fallbacks
      const rollNumber = (student.roll_number || student.rollNumber || student.roll_no || '').toString().toLowerCase();

      // Get email
      const email = (student.email || '').toLowerCase();

      // Get department name with improved fallbacks
      let departmentName = '';
      if (typeof student.department === 'object' && student.department !== null) {
        departmentName = (student.department.name || student.department.department_name || student.department.dept_name || '').toLowerCase();
      } else if (typeof student.department === 'string') {
        departmentName = student.department.toLowerCase();
      } else if (student.department_name) {
        departmentName = student.department_name.toLowerCase();
      }

      // Extract student's institution ID with better logging
      let studentInstitutionId = '';
      if (typeof student.institution === 'object' && student.institution !== null) {
        // JKKN API returns institution.id
        studentInstitutionId = student.institution.id || student.institution.institution_id || '';

        // Debug log institution extraction for first 3 students
        if (index < 3) {
          console.log(`[Student Search] Institution extraction for student ${index}:`, {
            institutionObject: student.institution,
            extractedId: studentInstitutionId
          });
        }
      } else if (typeof student.institution === 'string') {
        studentInstitutionId = student.institution;
      } else if (student.institution_id) {
        studentInstitutionId = student.institution_id;
      }

      // Institution-based filtering
      // Admin can see all students, mentors can only see students from their institution
      const matchesInstitution = isAdmin || !userInstitutionId || studentInstitutionId === userInstitutionId;

      // Enhanced search query matching with individual match tracking
      // Check both constructed full name AND single name field
      const nameMatch = fullName.includes(normalizedQuery) || singleName.includes(normalizedQuery);
      const rollMatch = rollNumber.includes(normalizedQuery);
      const emailMatch = email.includes(normalizedQuery);
      const deptMatch = departmentName.includes(normalizedQuery);

      const matchesSearch = nameMatch || rollMatch || emailMatch || deptMatch;

      const matches = matchesInstitution && matchesSearch;

      // Enhanced debug logging - show WHY students match or don't match
      if (filterDebugCount < 10) {
        console.log(`[Student Search Debug #${filterDebugCount}] ${matches ? '✓ MATCH' : '✗ NO MATCH'}:`, {
          name: fullName,
          rollNumber,
          department: departmentName,
          institution: studentInstitutionId,
          query: normalizedQuery,
          matches: {
            name: nameMatch,
            roll: rollMatch,
            email: emailMatch,
            dept: deptMatch,
            search: matchesSearch,
            institution: matchesInstitution,
            final: matches
          }
        });
        filterDebugCount++;
      }

      return matches;
    });

    // Log filtering results with enhanced department debugging
    const dentalStudents = filteredStudents.filter((s: any) => {
      const deptName = typeof s.department === 'object' ? (s.department?.name || '') : String(s.department || '');
      return deptName.toLowerCase().includes('dent');
    });

    console.log(`[Student Search] Total filtered: ${filteredStudents.length}, Dental students: ${dentalStudents.length}`);

    // Log unique departments to help debug department structure
    if (filteredStudents.length > 0) {
      const uniqueDepts = [...new Set(filteredStudents.slice(0, 20).map((s: any) => {
        if (typeof s.department === 'object' && s.department !== null) {
          return `${s.department.name || s.department.department_name || 'Unknown'} (object)`;
        }
        return `${s.department || 'No dept'} (${typeof s.department})`;
      }))];
      console.log('[Student Search] Sample departments found:', uniqueDepts);
    }

    console.log(`[Student Search] Found ${filteredStudents.length} matching students (isAdmin: ${isAdmin}, institution filter: ${isAdmin ? 'NONE (all institutions)' : userInstitutionId})`);

    // Transform to expected format
    const transformedStudents = filteredStudents.map((student: any) => {
      // Extract department name
      let departmentName = 'Unknown Department';
      if (typeof student.department === 'object' && student.department !== null) {
        departmentName = student.department.name || student.department.department_name || 'Unknown Department';
      } else if (typeof student.department === 'string') {
        departmentName = student.department;
      } else if (student.department_name) {
        departmentName = student.department_name;
      }

      return {
        id: student.id || student.student_id,
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email || 'Unknown',
        rollNumber: student.roll_number || student.rollNumber || student.roll_no || 'N/A',
        email: student.email || '',
        department: departmentName,
        year: student.year || student.current_year || student.academic_year || '',
      };
    });

    return NextResponse.json({
      success: true,
      students: transformedStudents,
    });
  } catch (error) {
    console.error('[Student Search] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search students',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
