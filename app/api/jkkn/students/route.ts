import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, shouldFilterByAssignedStudents, getMentorAssignedStudentIds, getInstitutionFilter } from '@/lib/middleware/access-control';
import { applyAllAccessFilters, updateMetadata, wereFiltersApplied } from '@/lib/utils/api-filters';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Fetch students from local Supabase database as fallback
 * Used when JKKN API students endpoint is unavailable (404)
 */
async function fetchStudentsFromSupabase(userAccess: any, limit: number) {
  console.log('[Students API] Falling back to local Supabase database...');

  const supabase = createAdminClient();
  const institutionFilter = getInstitutionFilter(userAccess);

  let query = supabase
    .from('students')
    .select('id, name, roll_number, email, department_id, institution_id, year, section, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  // Apply institution filter for non-super-admin users
  if (institutionFilter) {
    query = query.eq('institution_id', institutionFilter);
  }

  if (limit > 0 && limit < 10000) {
    query = query.limit(limit);
  }

  const { data: students, error } = await query;

  if (error) {
    console.error('[Students API] Supabase error:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`[Students API] Fetched ${students?.length || 0} students from local database`);

  // Transform to match expected format
  const transformedStudents = (students || []).map((student: any) => ({
    id: student.id,
    first_name: student.name?.split(' ')[0] || '',
    last_name: student.name?.split(' ').slice(1).join(' ') || '',
    roll_number: student.roll_number,
    email: student.email,
    institution: { id: student.institution_id },
    department: { id: student.department_id },
    institution_id: student.institution_id,
    department_id: student.department_id,
    year: student.year,
    is_profile_complete: true,
  }));

  return {
    data: transformedStudents,
    metadata: {
      page: 1,
      totalPages: 1,
      total: transformedStudents.length,
    },
    source: 'local_database'
  };
}

/**
 * Helper function to extract institution and department IDs from student data
 */
function extractInstitutionDepartmentIds(student: any) {
  // Extract institution_id
  let institution_id = '';
  if (typeof student.institution === 'object' && student.institution !== null) {
    institution_id = student.institution.id || student.institution.institution_id || '';
  } else if (typeof student.institution === 'string') {
    institution_id = student.institution;
  } else if (student.institution_id) {
    institution_id = student.institution_id;
  }

  // Extract department_id
  let department_id = '';
  if (typeof student.department === 'object' && student.department !== null) {
    department_id = student.department.id || student.department.department_id || '';
  } else if (typeof student.department === 'string') {
    department_id = student.department;
  } else if (student.department_id) {
    department_id = student.department_id;
  }

  return { institution_id, department_id };
}

/**
 * Transform MyJKKN API student response to match our interface
 */
function transformStudentData(apiStudent: any) {
  return {
    id: apiStudent.id || apiStudent.student_id,
    first_name: apiStudent.first_name || apiStudent.firstName || '',
    last_name: apiStudent.last_name || apiStudent.lastName || '',
    roll_number: apiStudent.roll_number || apiStudent.rollNumber || apiStudent.roll_no || '',
    // Handle nested institution object
    institution: apiStudent.institution
      ? (typeof apiStudent.institution === 'object'
          ? {
              id: apiStudent.institution.id || apiStudent.institution.institution_id,
              name: apiStudent.institution.name || apiStudent.institution.institution_name || 'Unknown Institution'
            }
          : apiStudent.institution)
      : (apiStudent.institution_id || apiStudent.institution_name
          ? { id: apiStudent.institution_id || '', name: apiStudent.institution_name || 'Unknown Institution' }
          : 'Unknown Institution'),
    // Handle nested department object
    department: apiStudent.department
      ? (typeof apiStudent.department === 'object'
          ? {
              id: apiStudent.department.id || apiStudent.department.department_id,
              name: apiStudent.department.name || apiStudent.department.department_name || 'Unknown Department'
            }
          : apiStudent.department)
      : (apiStudent.department_id || apiStudent.department_name
          ? { id: apiStudent.department_id || '', name: apiStudent.department_name || 'Unknown Department' }
          : 'Unknown Department'),
    // Handle nested program object
    program: apiStudent.program
      ? (typeof apiStudent.program === 'object'
          ? {
              id: apiStudent.program.id || apiStudent.program.program_id,
              name: apiStudent.program.name || apiStudent.program.program_name || 'Unknown Program'
            }
          : apiStudent.program)
      : (apiStudent.program_id || apiStudent.program_name
          ? { id: apiStudent.program_id || '', name: apiStudent.program_name || 'Unknown Program' }
          : 'Unknown Program'),
    is_profile_complete: apiStudent.is_profile_complete ?? apiStudent.isProfileComplete ?? false,
    created_at: apiStudent.created_at || apiStudent.createdAt || new Date().toISOString(),
    updated_at: apiStudent.updated_at || apiStudent.updatedAt || new Date().toISOString(),
  };
}

/**
 * GET /api/jkkn/students
 * Fetch students from JKKN API (server-side with secure API key)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
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

    // Get API key from environment (server-side only)
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'MyJKKN API key not configured. Please add NEXT_PUBLIC_MYJKKN_API_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    // Get pagination params from query
    const searchParams = request.nextUrl.searchParams;
    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10);

    // IMPORTANT: JKKN Learners API has a max limit of 200 students per page
    // To fetch all students (10,000+), we need to loop through multiple pages

    console.log(`[Students API] Requested limit: ${requestedLimit}`);

    let allStudents: any[] = [];
    let currentPage = 1;
    const maxLimit = 200; // JKKN Learners API max per page
    let hasMore = true;
    const maxPages = 75; // Safety limit (75 pages × 200 = 15,000 max students)

    // If requested limit is large (e.g., 1000+), fetch all pages
    const shouldFetchAll = requestedLimit >= 200;

    let data: any;

    if (shouldFetchAll) {
      console.log('[Students API] Fetching ALL students across multiple pages...');

      while (hasMore && currentPage <= maxPages) {
        const url = `${baseUrl}/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive&page=${currentPage}&limit=${maxLimit}`;

        console.log(`[Students API] Fetching page ${currentPage}...`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          // If JKKN API returns 404, fall back to local Supabase data
          if (response.status === 404) {
            console.log('[Students API] JKKN API returned 404, falling back to local database');
            const localData = await fetchStudentsFromSupabase(userAccess, requestedLimit);
            return NextResponse.json({
              success: true,
              ...localData,
              accessLevel: userAccess.role,
              note: 'Data fetched from local database (JKKN API unavailable)'
            });
          }

          const errorData = await response.json().catch(() => ({}));
          return NextResponse.json(
            {
              success: false,
              error: errorData.message || `JKKN API Error: ${response.statusText}`,
              status: response.status,
            },
            { status: response.status }
          );
        }

        const pageData = await response.json();
        const students = pageData.data || [];

        console.log(`[Students API] Page ${currentPage}: received ${students.length} students`);

        allStudents = [...allStudents, ...students];

        // Check if there are more pages
        // If we got less than maxLimit, we've reached the end
        hasMore = students.length === maxLimit;

        // Also check pagination/metadata if available (Learners API uses 'pagination')
        const paginationInfo = pageData.pagination || pageData.metadata;
        if (paginationInfo) {
          const totalPages = paginationInfo.totalPages || paginationInfo.total_pages;
          if (totalPages && currentPage >= totalPages) {
            hasMore = false;
          }
        }

        currentPage++;
      }

      console.log(`[Students API] Finished fetching. Total students: ${allStudents.length} from ${currentPage - 1} pages`);

      // Create combined response
      data = {
        data: allStudents,
        metadata: {
          page: 1,
          totalPages: 1,
          total: allStudents.length,
        }
      };
    } else {
      // For small limits, fetch single page
      const url = `${baseUrl}/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive&page=1&limit=${requestedLimit}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        // If JKKN API returns 404, fall back to local Supabase data
        if (response.status === 404) {
          console.log('[Students API] JKKN API returned 404, falling back to local database');
          const localData = await fetchStudentsFromSupabase(userAccess, requestedLimit);
          return NextResponse.json({
            success: true,
            ...localData,
            accessLevel: userAccess.role,
            note: 'Data fetched from local database (JKKN API unavailable)'
          });
        }

        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          {
            success: false,
            error: errorData.message || `JKKN API Error: ${response.statusText}`,
            status: response.status,
          },
          { status: response.status }
        );
      }

      data = await response.json();
    }

    // Debug: Log the actual API response to see field names
    console.log('Students API Response:', JSON.stringify(data, null, 2));
    if (data.data && data.data.length > 0) {
      console.log('First student object:', JSON.stringify(data.data[0], null, 2));
    }

    // Transform the data to match our interface
    let transformedData = {
      ...data,
      data: data.data ? data.data.map(transformStudentData) : []
    };

    console.log('Transformed student data:', JSON.stringify(transformedData.data[0], null, 2));

    // Add institution_id and department_id to each student for filtering
    const studentsWithIds = transformedData.data.map((student: any) => ({
      ...student,
      ...extractInstitutionDepartmentIds(student)
    }));

    console.log(`[BEFORE Access Control] Total students: ${studentsWithIds.length}`);
    console.log(`[User Access] Role: ${userAccess.role}, InstitutionID: ${userAccess.institutionId}, IsSuperAdmin: ${userAccess.isSuperAdmin}`);

    // DEBUG: Log sample of institution IDs from API to compare with user's institution ID
    if (studentsWithIds.length > 0) {
      const sampleInstitutionIds = studentsWithIds.slice(0, 5).map((s: any) => ({
        studentId: s.id,
        institution_id: s.institution_id,
        rawInstitution: s.institution,
      }));
      console.log(`[DEBUG] Sample institution IDs from JKKN API:`, JSON.stringify(sampleInstitutionIds, null, 2));
      console.log(`[DEBUG] User's institution ID for comparison: "${userAccess.institutionId}"`);

      // Check if there's a format mismatch
      const apiInstitutionIds = [...new Set(studentsWithIds.map((s: any) => s.institution_id))];
      console.log(`[DEBUG] All unique institution IDs from API (${apiInstitutionIds.length}):`, apiInstitutionIds);

      // Check if user's institution ID exists in API data
      const userInstIdInApiData = apiInstitutionIds.includes(userAccess.institutionId);
      console.log(`[DEBUG] User's institution ID found in API data: ${userInstIdInApiData}`);

      if (!userInstIdInApiData && apiInstitutionIds.length > 0) {
        console.warn(`[WARNING] Institution ID mismatch! User: "${userAccess.institutionId}" not in API data: ${JSON.stringify(apiInstitutionIds)}`);
      }
    }

    // Check if mentor should only see assigned students
    let assignedStudentIds: string[] | null = null;
    if (shouldFilterByAssignedStudents(userAccess)) {
      console.log(`[Access Control] Mentor role detected - fetching assigned students for filtering`);
      assignedStudentIds = await getMentorAssignedStudentIds(userAccess.userId);
      console.log(`[Access Control] Mentor has ${assignedStudentIds?.length || 0} assigned students`);
    }

    // Apply access control filtering (institution + assigned students filter for mentors)
    const filteredData = applyAllAccessFilters(studentsWithIds, userAccess, assignedStudentIds);

    console.log(`[AFTER Access Control] Filtered students: ${filteredData.length} (from ${studentsWithIds.length})`);

    // Debug: Show unique institutions in filtered data
    const uniqueInsts = new Set(filteredData.map((s: any) => s.institution_id));
    console.log(`[Filtered Data] Unique institutions (${uniqueInsts.size}):`, Array.from(uniqueInsts));

    // Update metadata
    const filtersApplied = wereFiltersApplied(userAccess);
    transformedData.data = filteredData;
    transformedData.metadata = updateMetadata(
      transformedData.metadata,
      filteredData.length,
      filtersApplied
    );

    console.log(`[Access Control] Filtered students for ${userAccess.role}: ${filteredData.length} results`);

    return NextResponse.json({
      success: true,
      ...transformedData,
      accessLevel: userAccess.role,
    });

  } catch (error: any) {
    console.error('Error fetching students:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch students',
      },
      { status: 500 }
    );
  }
}
