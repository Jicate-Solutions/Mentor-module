import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';

/**
 * Transform MyJKKN API department response to match our interface
 */
function transformDepartmentData(apiDepartment: any) {
  return {
    id: apiDepartment.id || apiDepartment.department_id,
    name: apiDepartment.name || apiDepartment.department_name || apiDepartment.departmentName || 'Unnamed Department',
    code: apiDepartment.code || apiDepartment.department_code || apiDepartment.dept_code || apiDepartment.short_name || 'N/A',
    institution_id: apiDepartment.institution_id || apiDepartment.institutionId || '',
    is_active: apiDepartment.is_active ?? apiDepartment.isActive ?? apiDepartment.active ?? true,
    created_at: apiDepartment.created_at || apiDepartment.createdAt || new Date().toISOString(),
    updated_at: apiDepartment.updated_at || apiDepartment.updatedAt || new Date().toISOString(),
  };
}

/**
 * GET /api/jkkn/departments
 * Fetch departments from JKKN API (server-side with secure API key)
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
    const url = `${baseUrl}/api-management/organizations/departments?page=${page}&limit=${limit}`;

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
    console.log('Departments API Response:', JSON.stringify(data, null, 2));
    if (data.data && data.data.length > 0) {
      console.log('First department object:', JSON.stringify(data.data[0], null, 2));
    }

    // Transform the data to match our interface
    let transformedData = {
      ...data,
      data: data.data ? data.data.map(transformDepartmentData) : []
    };

    console.log('Transformed department data:', JSON.stringify(transformedData.data[0], null, 2));

    // Apply access control filtering (institution-level only)
    const institutionFilter = getInstitutionFilter(userAccess);

    // Filter by institution
    if (institutionFilter !== null) {
      transformedData.data = transformedData.data.filter(
        (dept: any) => dept.institution_id === institutionFilter
      );

      // Update metadata after filtering
      transformedData.metadata = {
        page: 1,
        totalPages: 1,
        total: transformedData.data.length,
      };

      console.log(`[Access Control] Filtered departments for ${userAccess.role}: ${transformedData.data.length} results`);
    }

    return NextResponse.json({
      success: true,
      ...transformedData,
      accessLevel: userAccess.role,
    });

  } catch (error: any) {
    console.error('Error fetching departments:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch departments',
      },
      { status: 500 }
    );
  }
}
