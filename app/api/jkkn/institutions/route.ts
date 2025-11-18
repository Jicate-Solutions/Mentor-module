import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';

/**
 * Transform MyJKKN API institution response to match our interface
 */
function transformInstitutionData(apiInstitution: any) {
  return {
    id: apiInstitution.id || apiInstitution.institution_id,
    name: apiInstitution.name || apiInstitution.institution_name || apiInstitution.institutionName || 'Unnamed Institution',
    counselling_code: apiInstitution.counselling_code || apiInstitution.counsellingCode || apiInstitution.code || 'N/A',
    category: apiInstitution.category || apiInstitution.institution_category || 'Uncategorized',
    institution_type: apiInstitution.institution_type || apiInstitution.institutionType || apiInstitution.type || 'Not Specified',
    is_active: apiInstitution.is_active ?? apiInstitution.isActive ?? apiInstitution.active ?? true,
    created_at: apiInstitution.created_at || apiInstitution.createdAt || new Date().toISOString(),
    updated_at: apiInstitution.updated_at || apiInstitution.updatedAt || new Date().toISOString(),
  };
}

/**
 * GET /api/jkkn/institutions
 * Fetch institutions from JKKN API (server-side with secure API key)
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
    const url = `${baseUrl}/api-management/organizations/institutions?page=${page}&limit=${limit}`;

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
    console.log('Institutions API Response:', JSON.stringify(data, null, 2));
    if (data.data && data.data.length > 0) {
      console.log('First institution object:', JSON.stringify(data.data[0], null, 2));
    }

    // Transform the data to match our interface
    let transformedData = {
      ...data,
      data: data.data ? data.data.map(transformInstitutionData) : []
    };

    console.log('Transformed institution data:', JSON.stringify(transformedData.data[0], null, 2));

    // Apply access control filtering
    const institutionFilter = getInstitutionFilter(userAccess);

    if (institutionFilter !== null) {
      // Filter institutions based on user's access level
      transformedData.data = transformedData.data.filter(
        (inst: any) => inst.id === institutionFilter
      );

      // Update metadata
      transformedData.metadata = {
        page: 1,
        totalPages: 1,
        total: transformedData.data.length,
      };

      console.log(`[Access Control] Filtered institutions for ${userAccess.role}: ${transformedData.data.length} results`);
    }

    return NextResponse.json({
      success: true,
      ...transformedData,
      accessLevel: userAccess.role, // Include for debugging
    });

  } catch (error: any) {
    console.error('Error fetching institutions:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch institutions',
      },
      { status: 500 }
    );
  }
}
