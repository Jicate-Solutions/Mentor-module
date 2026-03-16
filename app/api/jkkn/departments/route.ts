import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';
import { createAdminClient } from '@/lib/supabase/server';

// ── Cache-first helper ─────────────────────────────────────────────────────────
async function fetchDepartmentsFromCache(institutionFilter: string | null) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('jkkn_departments')
    .select('*', { count: 'exact', head: true });
  if (!count || count === 0) return null;

  let q = supabase.from('jkkn_departments').select('*').eq('is_active', true);
  if (institutionFilter) q = q.eq('institution_id', institutionFilter);
  const { data } = await q;
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    code: r.code || 'N/A',
    institution_id: r.institution_id || '',
    is_active: r.is_active,
    created_at: r.synced_at,
    updated_at: r.synced_at,
  }));
}

/**
 * Fetch departments from local Supabase database as fallback
 * Extracts unique department IDs from students table since no dedicated departments table exists
 */
async function fetchDepartmentsFromSupabase(
  userAccess: any,
  institutionIdParam: string | null
) {
  console.log('[Departments API] Falling back to local Supabase database...');

  const supabase = createAdminClient();
  const institutionFilter = institutionIdParam || getInstitutionFilter(userAccess);

  // Query students to get unique department IDs
  let query = supabase
    .from('students')
    .select('department_id, institution_id')
    .not('department_id', 'is', null);

  // Apply institution filter
  if (institutionFilter) {
    query = query.eq('institution_id', institutionFilter);
  }

  const { data: students, error } = await query;

  if (error) {
    console.error('[Departments API] Supabase error:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  // Extract unique department IDs and group by institution
  const deptMap = new Map<string, { dept_id: string, inst_id: string }>();

  students?.forEach(s => {
    if (s.department_id && !deptMap.has(s.department_id)) {
      deptMap.set(s.department_id, {
        dept_id: s.department_id,
        inst_id: s.institution_id
      });
    }
  });

  console.log(`[Departments API] Found ${deptMap.size} unique departments in local database`);

  return Array.from(deptMap.values()).map(({ dept_id, inst_id }) => ({
    id: dept_id,
    name: dept_id, // Use ID as name since we don't have full details
    code: dept_id.substring(0, 10), // First 10 chars as code
    institution_id: inst_id,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

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
    const limit = parseInt(searchParams.get('limit') || '500', 10); // Increased default limit
    const institutionIdParam = searchParams.get('institutionId');

    // Declared once — reused by both cache path and JKKN fallback path
    const institutionFilter = institutionIdParam || getInstitutionFilter(userAccess);

    // ── Cache-first path ────────────────────────────────────────────────────────
    const cached = await fetchDepartmentsFromCache(institutionFilter);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        metadata: { page: 1, totalPages: 1, total: cached.length },
        source: 'cache',
        accessLevel: userAccess.role,
      });
    }
    // ── End cache path ──────────────────────────────────────────────────────────

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
      // If JKKN API returns 404, fall back to local Supabase data
      if (response.status === 404) {
        console.log('[Departments API] JKKN API returned 404, falling back to local database');
        try {
          const localDepartments = await fetchDepartmentsFromSupabase(
            userAccess,
            institutionIdParam
          );

          return NextResponse.json({
            success: true,
            data: localDepartments,
            metadata: {
              page: 1,
              totalPages: 1,
              total: localDepartments.length,
            },
            source: 'local_database',
            accessLevel: userAccess.role,
          });
        } catch (fallbackError) {
          console.error('[Departments API] Supabase fallback failed:', fallbackError);
          // Continue to return original error below
        }
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

    // Apply filtering (institutionFilter declared above)
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

      console.log(`[Departments] Filtered for institution ${institutionFilter}: ${transformedData.data.length} results`);
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
