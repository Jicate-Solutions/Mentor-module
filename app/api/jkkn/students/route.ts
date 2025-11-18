import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import { applyAccessFilters, updateMetadata, wereFiltersApplied } from '@/lib/utils/api-filters';

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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Call JKKN API
    const url = `${baseUrl}/api-management/students?page=${page}&limit=${limit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Add cache control for better performance
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
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

    const data = await response.json();

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

    // Apply access control filtering
    const filteredData = applyAccessFilters(studentsWithIds, userAccess);

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
