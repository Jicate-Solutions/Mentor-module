import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import { applyAccessFilters, updateMetadata, wereFiltersApplied } from '@/lib/utils/api-filters';

/**
 * Helper function to extract institution and department IDs from staff data
 */
function extractInstitutionDepartmentIds(staff: any) {
  // Extract institution_id
  let institution_id = '';
  if (typeof staff.institution === 'object' && staff.institution !== null) {
    institution_id = staff.institution.id || staff.institution.institution_id || '';
  } else if (typeof staff.institution === 'string') {
    institution_id = staff.institution;
  } else if (staff.institution_id) {
    institution_id = staff.institution_id;
  }

  // Extract department_id
  let department_id = '';
  if (typeof staff.department === 'object' && staff.department !== null) {
    department_id = staff.department.id || staff.department.department_id || '';
  } else if (typeof staff.department === 'string') {
    department_id = staff.department;
  } else if (staff.department_id) {
    department_id = staff.department_id;
  }

  return { institution_id, department_id };
}

/**
 * Transform MyJKKN API staff response to match our interface
 */
function transformStaffData(apiStaff: any) {
  return {
    id: apiStaff.id || apiStaff.staff_id,
    first_name: apiStaff.first_name || apiStaff.firstName || '',
    last_name: apiStaff.last_name || apiStaff.lastName || '',
    gender: apiStaff.gender || 'Not Specified',
    email: apiStaff.email || apiStaff.personal_email || '',
    phone: apiStaff.phone || apiStaff.phone_number || apiStaff.mobile || '',
    institution_email: apiStaff.institution_email || apiStaff.institutionEmail || apiStaff.email || '',
    designation: apiStaff.designation || apiStaff.position || 'Staff',
    // Handle nested department object
    department: apiStaff.department
      ? (typeof apiStaff.department === 'object'
          ? {
              id: apiStaff.department.id || apiStaff.department.department_id,
              department_name: apiStaff.department.department_name || apiStaff.department.name || 'Unknown Department'
            }
          : apiStaff.department)
      : (apiStaff.department_id || apiStaff.department_name
          ? { id: apiStaff.department_id || '', department_name: apiStaff.department_name || 'Unknown Department' }
          : 'Unknown Department'),
    // Handle nested institution object
    institution: apiStaff.institution
      ? (typeof apiStaff.institution === 'object'
          ? {
              id: apiStaff.institution.id || apiStaff.institution.institution_id,
              institution_name: apiStaff.institution.institution_name || apiStaff.institution.name || 'Unknown Institution'
            }
          : apiStaff.institution)
      : (apiStaff.institution_id || apiStaff.institution_name
          ? { id: apiStaff.institution_id || '', institution_name: apiStaff.institution_name || 'Unknown Institution' }
          : 'Unknown Institution'),
    created_at: apiStaff.created_at || apiStaff.createdAt || new Date().toISOString(),
    updated_at: apiStaff.updated_at || apiStaff.updatedAt || new Date().toISOString(),
  };
}

/**
 * GET /api/jkkn/staff
 * Fetch staff from JKKN API (server-side with secure API key)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user access level for filtering
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

    // Try multiple possible endpoints (staff endpoint location varies by API)
    const possibleEndpoints = [
      `${baseUrl}/api-management/staff?page=${page}&limit=${limit}`,
      `${baseUrl}/api-management/organizations/staff?page=${page}&limit=${limit}`,
      `${baseUrl}/api-management/organizations/employees?page=${page}&limit=${limit}`,
      `${baseUrl}/api/staff?page=${page}&limit=${limit}`,
    ];

    console.log('[Staff API] Trying multiple endpoints to find working one...');

    let data: any = null;
    let successfulEndpoint: string | null = null;
    let lastError: string = '';

    // Try each endpoint until one works
    for (const url of possibleEndpoints) {
      console.log(`[Staff API] Trying endpoint: ${url}`);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          // Add cache control for better performance
          next: { revalidate: 60 }, // Cache for 60 seconds
        });

        console.log(`[Staff API] Response status for ${url}: ${response.status}`);

        // Check if response is successful
        if (response.ok) {
          const contentType = response.headers.get('content-type');

          // Verify it's JSON, not HTML
          if (contentType && contentType.includes('application/json')) {
            const responseText = await response.text();

            try {
              data = JSON.parse(responseText);
              successfulEndpoint = url;
              console.log(`[Staff API] ✓ SUCCESS! Endpoint works: ${url}`);
              break; // Exit loop on success
            } catch (parseError) {
              console.error(`[Staff API] ✗ Failed to parse JSON from ${url}:`, parseError);
              lastError = 'Invalid JSON response';
              continue; // Try next endpoint
            }
          } else {
            console.log(`[Staff API] ✗ Got non-JSON response from ${url}`);
            lastError = 'Got HTML instead of JSON';
            continue; // Try next endpoint
          }
        } else {
          // Log failure and try next endpoint
          const errorText = await response.text();
          const isHtml = errorText.includes('<!DOCTYPE') || errorText.includes('<html');
          console.log(`[Staff API] ✗ Failed with ${response.status}: ${isHtml ? 'HTML 404 page' : errorText.substring(0, 100)}`);
          lastError = `${response.status} ${response.statusText}`;
          continue; // Try next endpoint
        }
      } catch (fetchError: any) {
        console.error(`[Staff API] ✗ Network error for ${url}:`, fetchError.message);
        lastError = fetchError.message;
        continue; // Try next endpoint
      }
    }

    // If no endpoint worked, return error
    if (!data || !successfulEndpoint) {
      console.error('[Staff API] ❌ All endpoints failed. Last error:', lastError);
      return NextResponse.json(
        {
          success: false,
          error: `JKKN API Error: ${lastError}`,
          details: {
            message: 'All staff API endpoints returned errors',
            triedEndpoints: possibleEndpoints,
            lastError: lastError,
          },
        },
        { status: 404 }
      );
    }

    console.log(`[Staff API] Using successful endpoint: ${successfulEndpoint}`);

    // Debug: Log the actual API response to see field names
    console.log('=== STAFF API RESPONSE DEBUG ===');
    console.log('Response top-level keys:', Object.keys(data));
    console.log('Full response structure:', JSON.stringify(data, null, 2));

    if (data.data && data.data.length > 0) {
      console.log('First staff object keys:', Object.keys(data.data[0]));
      console.log('First staff object:', JSON.stringify(data.data[0], null, 2));

      // Log each field individually to see what's available
      const firstStaff = data.data[0];
      console.log('Staff field values:');
      Object.keys(firstStaff).forEach(key => {
        console.log(`  ${key}:`, firstStaff[key]);
      });
    }

    // Log metadata fields
    console.log('Metadata fields available:', {
      page: data.page,
      current_page: data.current_page,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      total_pages: data.total_pages,
      pages: data.pages,
      total: data.total,
      count: data.count,
      totalCount: data.totalCount,
    });
    console.log('=== END DEBUG ===');

    // Transform the data to match our interface
    let transformedStaff = data.data ? data.data.map(transformStaffData) : [];

    // Add institution_id and department_id to each staff member for filtering
    const staffWithIds = transformedStaff.map((staff: any) => ({
      ...staff,
      ...extractInstitutionDepartmentIds(staff)
    }));

    console.log(`[BEFORE Access Control] Total staff: ${staffWithIds.length}`);
    console.log(`[User Access] Role: ${userAccess.role}, InstitutionID: ${userAccess.institutionId}, IsSuperAdmin: ${userAccess.isSuperAdmin}`);

    // Apply access control filtering
    const filteredData = applyAccessFilters(staffWithIds, userAccess);

    console.log(`[AFTER Access Control] Filtered staff: ${filteredData.length} (from ${staffWithIds.length})`);

    // Debug: Show unique institutions in filtered data
    const uniqueInsts = new Set(filteredData.map((s: any) => s.institution_id));
    console.log(`[Filtered Data] Unique institutions (${uniqueInsts.size}):`, Array.from(uniqueInsts));

    // Update transformedStaff to use filtered data
    transformedStaff = filteredData;

    // Transform metadata to ensure consistent field names
    // Check multiple possible locations for metadata
    const metaSource = data.metadata || data.meta || data.pagination || data;

    // Extract total count from various possible sources
    const totalCount = metaSource.total ||
                       metaSource.count ||
                       metaSource.totalCount ||
                       metaSource.total_count ||
                       data.total ||
                       data.count ||
                       transformedStaff.length; // Use actual data length as fallback

    // Extract current page
    const currentPage = metaSource.page ||
                        metaSource.current_page ||
                        metaSource.currentPage ||
                        data.page ||
                        data.current_page ||
                        page;

    // Calculate total pages
    const totalPages = metaSource.totalPages ||
                       metaSource.total_pages ||
                       metaSource.pages ||
                       metaSource.last_page ||
                       data.totalPages ||
                       data.total_pages ||
                       Math.ceil(totalCount / limit);

    // Update metadata with filtered count
    const filtersApplied = wereFiltersApplied(userAccess);
    const metadata = filtersApplied
      ? updateMetadata(
          {
            page: currentPage,
            totalPages: totalPages,
            total: totalCount,
          },
          transformedStaff.length,
          filtersApplied
        )
      : {
          page: currentPage,
          totalPages: totalPages,
          total: totalCount,
        };

    console.log('Transformed staff data (first item):', JSON.stringify(transformedStaff[0], null, 2));
    console.log('Final Metadata:', JSON.stringify(metadata, null, 2));
    console.log(`[Access Control] Filtered staff for ${userAccess.role}: ${transformedStaff.length} results`);

    return NextResponse.json({
      success: true,
      data: transformedStaff,
      metadata: metadata,
      accessLevel: userAccess.role,
    });

  } catch (error: any) {
    console.error('Error fetching staff:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch staff',
      },
      { status: 500 }
    );
  }
}
